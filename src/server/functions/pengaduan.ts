// Pengaduan & tanggapan (Sprint 2 · KF-03 s.d. KF-06).
import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client"
import { guruBk, kategoriMasalah, pengaduan, tanggapan, users } from "../db/schema"
import { hashPengirim } from "../crypto"
import {
  ambilPercakapan,
  buatPengaduan,
  keTampilanGuru,
  pengaduanMilikSiswa,
  queryPengaduanGuru,
} from "../services/pengaduan"
import { PesanError, authMw, guruMw, siswaMw } from "./middleware"
import { picuNotifikasi } from "../services/notifikasi"
import { balasanSchema, kodeTiketSchema, pengaduanSchema } from "@/lib/validasi"

const PER_HALAMAN = 20

// Subquery berkorelasi harus menyebut tabel secara eksplisit: pada query tanpa join, Drizzle menulis
// kolom tanpa nama tabel, sehingga "id" di dalam subquery akan terbaca sebagai tanggapan.id.
const P = {
  id: sql.raw('"pengaduan"."id"'),
  createdAt: sql.raw('"pengaduan"."created_at"'),
  dibacaSiswa: sql.raw('"pengaduan"."dibaca_siswa_pada"'),
  dibacaGuru: sql.raw('"pengaduan"."dibaca_guru_pada"'),
  guruBkId: sql.raw('"pengaduan"."guru_bk_id"'),
  status: sql.raw('"pengaduan"."status"'),
}
const balasanTerakhir = (dari: "siswa" | "guru_bk") =>
  sql`(select max(t.created_at) from tanggapan t where t.pengaduan_id = ${P.id} and t.pengirim = ${sql.raw(`'${dari}'`)})`

// ================================================================ bersama

export const opsiKategoriFn = createServerFn({ method: "GET" })
  .middleware([authMw])
  .handler(() =>
    db
      .select({ id: kategoriMasalah.id, nama: kategoriMasalah.namaKategori, deskripsi: kategoriMasalah.deskripsi })
      .from(kategoriMasalah)
      .where(eq(kategoriMasalah.isActive, true))
      .orderBy(asc(kategoriMasalah.id))
  )

// ================================================================ siswa

/** Kirim pengaduan. Dikirim sebagai FormData: field "data" (JSON) + field "lampiran" (opsional). */
export const kirimPengaduanFn = createServerFn({ method: "POST" })
  .middleware([siswaMw])
  .validator((masukan: unknown) => {
    if (!(masukan instanceof FormData)) throw new PesanError("Format kiriman tidak valid.")
    let mentah: unknown
    try {
      mentah = JSON.parse(String(masukan.get("data") ?? ""))
    } catch {
      throw new PesanError("Format kiriman tidak valid.")
    }
    const data = pengaduanSchema.parse(mentah)
    const berkas = masukan.get("lampiran")
    return { data, lampiran: berkas instanceof File && berkas.size > 0 ? berkas : null }
  })
  .handler(async ({ data, context }) => {
    if (!context.user.siswaId) throw new PesanError("Akun ini bukan akun siswa.")
    const r = await buatPengaduan(context.user.siswaId, data.data, data.lampiran)
    await picuNotifikasi({ jenis: "pengaduan_baru", pengaduanId: r.id })
    return { kodeTiket: r.kodeTiket }
  })

export const riwayatSiswaFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .handler(async ({ context }) => {
    const hash = hashPengirim(context.user.siswaId!)
    const rows = await db
      .select({
        kodeTiket: pengaduan.kodeTiket,
        judul: pengaduan.judul,
        kategori: kategoriMasalah.namaKategori,
        isAnonim: pengaduan.isAnonim,
        urgensi: pengaduan.tingkatUrgensi,
        status: pengaduan.status,
        createdAt: pengaduan.createdAt,
        updatedAt: pengaduan.updatedAt,
        jumlahBalasan: sql<number>`(select count(*) from tanggapan t where t.pengaduan_id = ${P.id} and t.pengirim = 'guru_bk')`.mapWith(Number),
        balasanBaru: sql<boolean>`coalesce(${balasanTerakhir("guru_bk")}, 'epoch'::timestamptz) > coalesce(${P.dibacaSiswa}, 'epoch'::timestamptz)`,
      })
      .from(pengaduan)
      .innerJoin(kategoriMasalah, eq(kategoriMasalah.id, pengaduan.kategoriId))
      .where(eq(pengaduan.pengirimHash, hash))
      .orderBy(desc(pengaduan.updatedAt))
    return rows
  })

export const detailSiswaFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .validator(z.object({ kode: kodeTiketSchema }))
  .handler(async ({ data, context }) => {
    const p = await pengaduanMilikSiswa(data.kode, context.user.siswaId!)
    // Aduan milik siswa lain diperlakukan sama dengan tidak ada (BB-16).
    if (!p) return null
    // Tiga query ini tidak saling bergantung: dijalankan bersamaan supaya hanya menunggu satu kali.
    const [[info], percakapan] = await Promise.all([
      db
        .select({ kategori: kategoriMasalah.namaKategori, penanggungJawab: users.nama })
        .from(pengaduan)
        .innerJoin(kategoriMasalah, eq(kategoriMasalah.id, pengaduan.kategoriId))
        .leftJoin(guruBk, eq(guruBk.id, pengaduan.guruBkId))
        .leftJoin(users, eq(users.id, guruBk.userId))
        .where(eq(pengaduan.id, p.id)),
      ambilPercakapan(p.id),
      db.update(pengaduan).set({ dibacaSiswaPada: sql`now()` }).where(eq(pengaduan.id, p.id)),
    ])
    return {
      kodeTiket: p.kodeTiket,
      isAnonim: p.isAnonim,
      alias: p.alias,
      identitasDibuka: !!p.identitasDibukaPada,
      kategori: info.kategori,
      penanggungJawab: info.penanggungJawab,
      judul: p.judul,
      isi: p.isi,
      lampiranTipe: p.lampiranTipe,
      urgensi: p.tingkatUrgensi,
      status: p.status,
      createdAt: p.createdAt,
      percakapan: percakapan.map((t) => ({ ...t, guruNama: t.pengirim === "guru_bk" ? t.guruNama : null })),
    }
  })

export const balasSiswaFn = createServerFn({ method: "POST" })
  .middleware([siswaMw])
  .validator(balasanSchema)
  .handler(async ({ data, context }) => {
    const p = await pengaduanMilikSiswa(data.kode, context.user.siswaId!)
    if (!p) throw new PesanError("Pengaduan tidak ditemukan.")
    if (p.status === "selesai") throw new PesanError("Pengaduan ini sudah selesai. Kirim pengaduan baru bila masih perlu bantuan.")
    // Pesan siswa tidak menyimpan user_id, supaya aduan anonim tidak bisa ditelusuri lewat tanggapan.
    const [t] = await db.insert(tanggapan).values({ pengaduanId: p.id, pengirim: "siswa", userId: null, isi: data.isi }).returning({ id: tanggapan.id })
    await db
      .update(pengaduan)
      .set({ dibacaSiswaPada: sql`now()`, updatedAt: sql`now()` })
      .where(eq(pengaduan.id, p.id))
    await picuNotifikasi({ jenis: "tanggapan", pengaduanId: p.id, tanggapanId: t.id, dari: "siswa" })
    return { ok: true }
  })

/**
 * Buka identitas aduan anonim (PRD §5.6, BB-23). Hanya untuk aduan ini: siswa_id diisi sehingga
 * Guru BK melihat nama, NIS, kelas. Tidak bisa dibatalkan. `is_anonim` tidak diubah agar statistik
 * tetap menghitung aduan ini sebagai anonim.
 */
export const bukaIdentitasFn = createServerFn({ method: "POST" })
  .middleware([siswaMw])
  .validator(z.object({ kode: kodeTiketSchema }))
  .handler(async ({ data, context }) => {
    const me = context.user.siswaId
    if (!me) throw new PesanError("Akun ini bukan akun siswa.")
    const p = await pengaduanMilikSiswa(data.kode, me)
    if (!p) throw new PesanError("Pengaduan tidak ditemukan.")
    if (!p.isAnonim || p.identitasDibukaPada) return { ok: true }
    await db
      .update(pengaduan)
      .set({ siswaId: me, identitasDibukaPada: sql`now()`, updatedAt: sql`now()` })
      // Syarat diulang di WHERE supaya dua klik bersamaan tidak menulis dua kali.
      .where(and(eq(pengaduan.id, p.id), isNull(pengaduan.identitasDibukaPada)))
    return { ok: true }
  })

// ================================================================ Guru BK

export const filterGuruSchema = z.object({
  tab: z.enum(["antrean", "saya", "semua"]).default("antrean"),
  status: z.enum(["baru", "diproses", "selesai"]).optional(),
  kategoriId: z.number().int().positive().optional(),
  urgensi: z.enum(["rendah", "sedang", "tinggi"]).optional(),
  mode: z.enum(["anonim", "identitas"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).default(1),
})

export const daftarGuruFn = createServerFn({ method: "GET" })
  .middleware([guruMw])
  .validator(filterGuruSchema)
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId
    const syarat: Array<SQL | undefined> = []
    if (data.tab === "antrean") syarat.push(isNull(pengaduan.guruBkId))
    if (data.tab === "saya") syarat.push(saya ? eq(pengaduan.guruBkId, saya) : sql`false`)
    if (data.status) syarat.push(eq(pengaduan.status, data.status))
    if (data.kategoriId) syarat.push(eq(pengaduan.kategoriId, data.kategoriId))
    if (data.urgensi) syarat.push(eq(pengaduan.tingkatUrgensi, data.urgensi))
    if (data.mode) syarat.push(eq(pengaduan.isAnonim, data.mode === "anonim"))
    if (data.q) {
      const pola = `%${data.q.replace(/[%_\\]/g, "\\$&")}%`
      syarat.push(or(ilike(pengaduan.kodeTiket, pola), ilike(pengaduan.judul, pola)))
    }
    const where = and(...syarat)

    const [[{ total }], rows, jumlahTab] = await Promise.all([
      db.select({ total: count() }).from(pengaduan).where(where),
      queryPengaduanGuru()
        .where(where)
        // Urgensi tinggi & belum selesai di atas, lalu yang terbaru diperbarui (DESIGN §5.7).
        .orderBy(
          sql`case when ${pengaduan.status} <> 'selesai' and ${pengaduan.tingkatUrgensi} = 'tinggi' then 0 else 1 end`,
          desc(pengaduan.updatedAt)
        )
        .limit(PER_HALAMAN)
        .offset((data.page - 1) * PER_HALAMAN),
      db
        .select({
          antrean: sql<number>`count(*) filter (where ${pengaduan.guruBkId} is null and ${pengaduan.status} <> 'selesai')`.mapWith(Number),
          saya: sql<number>`count(*) filter (where ${pengaduan.guruBkId} = ${saya ?? -1} and ${pengaduan.status} <> 'selesai')`.mapWith(Number),
        })
        .from(pengaduan),
    ])

    return {
      rows: rows.map((r) => {
        const { isi, ...v } = keTampilanGuru(r, saya)
        return { ...v, cuplikan: isi.length > 140 ? isi.slice(0, 140) + "…" : isi }
      }),
      total,
      page: data.page,
      perHalaman: PER_HALAMAN,
      jumlahTab: jumlahTab[0],
    }
  })

async function cariUntukGuru(kode: string, saya: number | null) {
  const [r] = await queryPengaduanGuru().where(eq(pengaduan.kodeTiket, kode))
  return r ? keTampilanGuru(r, saya) : null
}

export const detailGuruFn = createServerFn({ method: "GET" })
  .middleware([guruMw])
  .validator(z.object({ kode: kodeTiketSchema }))
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId
    // Id hanya dipakai di server (keTampilanGuru sengaja tidak mengembalikannya).
    const idAduan = sql`(select id from pengaduan where kode_tiket = ${data.kode})`
    const [v, percakapan] = await Promise.all([
      cariUntukGuru(data.kode, saya),
      ambilPercakapan(idAduan),
    ])
    if (!v) return null
    // Tanda "sudah dibaca" hanya diubah oleh penanggung jawab (atau siapa pun saat masih di antrean).
    if (v.milikSaya || v.diAntrean) {
      await db.update(pengaduan).set({ dibacaGuruPada: sql`now()` }).where(eq(pengaduan.kodeTiket, data.kode))
    }
    return { ...v, percakapan: percakapan.map((t) => ({ ...t, guruNama: t.pengirim === "guru_bk" ? t.guruNama : null })) }
  })

/** Klaim aduan di antrean. Atomik: hanya berhasil bila belum ada penanggung jawab. */
export const tanganiFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(z.object({ kode: kodeTiketSchema }))
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId
    if (!saya) throw new PesanError("Akun Guru BK tidak lengkap.")
    const hasil = await db
      .update(pengaduan)
      .set({ guruBkId: saya, updatedAt: sql`now()` })
      .where(and(eq(pengaduan.kodeTiket, data.kode), isNull(pengaduan.guruBkId)))
      .returning({ id: pengaduan.id })
    if (hasil.length === 0) throw new PesanError("Pengaduan ini sudah ditangani Guru BK lain.")
    return { ok: true }
  })

export const tanggapiGuruFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(balasanSchema)
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId
    if (!saya) throw new PesanError("Akun Guru BK tidak lengkap.")
    const baru = await db.transaction(async (tx) => {
      const [p] = await tx
        .select({ id: pengaduan.id, guruBkId: pengaduan.guruBkId, status: pengaduan.status })
        .from(pengaduan)
        .where(eq(pengaduan.kodeTiket, data.kode))
        .for("update")
      if (!p) throw new PesanError("Pengaduan tidak ditemukan.")
      if (p.guruBkId !== null && p.guruBkId !== saya) {
        throw new PesanError("Pengaduan ini ditangani Guru BK lain. Kamu hanya bisa membacanya.")
      }
      if (p.status === "selesai") throw new PesanError("Pengaduan sudah selesai. Ubah status ke Diproses untuk membalas lagi.")
      const [t] = await tx
        .insert(tanggapan)
        .values({ pengaduanId: p.id, pengirim: "guru_bk", userId: context.user.id, isi: data.isi })
        .returning({ id: tanggapan.id })
      await tx
        .update(pengaduan)
        .set({
          guruBkId: saya, // tanggapan pertama otomatis mengklaim aduan di antrean
          status: p.status === "baru" ? "diproses" : p.status,
          dibacaGuruPada: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(pengaduan.id, p.id))
      return { pengaduanId: p.id, tanggapanId: t.id }
    })
    await picuNotifikasi({ jenis: "tanggapan", ...baru, dari: "guru_bk" })
    return { ok: true }
  })

export const ubahStatusFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(z.object({ kode: kodeTiketSchema, status: z.enum(["baru", "diproses", "selesai"]) }))
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId
    const hasil = await db
      .update(pengaduan)
      .set({ status: data.status, updatedAt: sql`now()` })
      .where(and(eq(pengaduan.kodeTiket, data.kode), eq(pengaduan.guruBkId, saya ?? -1)))
      .returning({ id: pengaduan.id })
    if (hasil.length === 0) throw new PesanError("Hanya penanggung jawab yang bisa mengubah status. Klik Tangani dulu.")
    return { ok: true }
  })

// ================================================================ penanda di menu (notifikasi dalam aplikasi)

export const lencanaFn = createServerFn({ method: "GET" })
  .middleware([authMw])
  .handler(async ({ context }) => {
    const u = context.user
    if (u.role === "siswa" && u.siswaId) {
      const [r] = await db
        .select({
          n: sql<number>`count(*) filter (where coalesce(${balasanTerakhir("guru_bk")}, 'epoch'::timestamptz) > coalesce(${P.dibacaSiswa}, 'epoch'::timestamptz))`.mapWith(Number),
        })
        .from(pengaduan)
        .where(eq(pengaduan.pengirimHash, hashPengirim(u.siswaId)))
      return { pengaduan: r.n, jadwal: 0 }
    }
    if (u.role === "guru_bk") {
      const [r] = await db
        .select({
          n: sql<number>`count(*) filter (where ${P.status} <> 'selesai' and (${P.guruBkId} is null or ${P.guruBkId} = ${u.guruBkId ?? -1}) and coalesce(${balasanTerakhir("siswa")}, ${P.createdAt}) > coalesce(${P.dibacaGuru}, 'epoch'::timestamptz))`.mapWith(Number),
        })
        .from(pengaduan)
      // Pengajuan jadwal yang menunggu keputusan dan waktunya belum lewat.
      const [{ jadwal }] = await db
        .execute<{ jadwal: number }>(sql`
          select count(*)::int as jadwal from jadwal_konseling j join slot_jadwal s on s.id = j.slot_id
          where s.guru_bk_id = ${u.guruBkId ?? -1} and j.status = 'menunggu'
            and ((s.tanggal + s.jam_mulai) at time zone 'Asia/Jakarta') > now()`)
        .then((x) => x.rows)
      return { pengaduan: r.n, jadwal }
    }
    return { pengaduan: 0, jadwal: 0 }
  })

/**
 * Jejak perubahan: jumlah pengaduan + waktu perubahan terakhir yang terlihat oleh user ini.
 * Browser menanyakannya berkala; data halaman baru dimuat ulang kalau jejaknya berubah.
 * Semua aksi (aduan baru, balasan, klaim, ubah status, pengajuan & keputusan jadwal) memperbarui `updated_at`.
 */
export const jejakFn = createServerFn({ method: "GET" })
  .middleware([authMw])
  .handler(async ({ context }) => {
    const u = context.user
    if (u.role === "admin") return { jejak: "" }
    const [r] = await db
      .select({ n: count(), terakhir: sql<string>`coalesce(max(${pengaduan.updatedAt})::text, '')` })
      .from(pengaduan)
      .where(u.role === "siswa" ? eq(pengaduan.pengirimHash, hashPengirim(u.siswaId ?? -1)) : undefined)
    // Jadwal: milik siswa ini, atau pengajuan pada slot Guru BK ini.
    const [j] = await db
      .execute<{ n: number; t: string }>(
        u.role === "siswa"
          ? sql`select count(*)::int as n, coalesce(max(updated_at)::text, '') as t from jadwal_konseling where siswa_id = ${u.siswaId ?? -1}`
          : sql`select count(*)::int as n, coalesce(max(j.updated_at)::text, '') as t
                from jadwal_konseling j join slot_jadwal s on s.id = j.slot_id where s.guru_bk_id = ${u.guruBkId ?? -1}`
      )
      .then((x) => x.rows)
    return { jejak: `${r.n}|${r.terakhir}|${j.n}|${j.t}` }
  })

// ================================================================ ringkasan dashboard Guru BK

export const ringkasanGuruFn = createServerFn({ method: "GET" })
  .middleware([guruMw])
  .handler(async ({ context }) => {
    const saya = context.user.guruBkId ?? -1
    const [[angka], perKategori, terbaru] = await Promise.all([
      db
        .select({
          antrean: sql<number>`count(*) filter (where ${P.guruBkId} is null and ${P.status} <> 'selesai')`.mapWith(Number),
          baru: sql<number>`count(*) filter (where ${P.status} = 'baru')`.mapWith(Number),
          diprosesSaya: sql<number>`count(*) filter (where ${P.status} = 'diproses' and ${P.guruBkId} = ${saya})`.mapWith(Number),
          mendesak: sql<number>`count(*) filter (where ${P.status} <> 'selesai' and "pengaduan"."tingkat_urgensi" = 'tinggi')`.mapWith(Number),
        })
        .from(pengaduan),

      // Pengaduan per kategori, bulan berjalan (WIB)
      db
        .select({
          kategori: kategoriMasalah.namaKategori,
          jumlah: sql<number>`count(${pengaduan.id})`.mapWith(Number),
        })
        .from(kategoriMasalah)
        .leftJoin(
          pengaduan,
          and(
            eq(pengaduan.kategoriId, kategoriMasalah.id),
            sql`${pengaduan.createdAt} >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'`
          )
        )
        .where(eq(kategoriMasalah.isActive, true))
        .groupBy(kategoriMasalah.id, kategoriMasalah.namaKategori)
        .orderBy(asc(kategoriMasalah.id)),

      queryPengaduanGuru()
        .where(sql`${pengaduan.status} <> 'selesai'`)
        .orderBy(
          sql`case when ${pengaduan.tingkatUrgensi} = 'tinggi' then 0 else 1 end`,
          desc(pengaduan.updatedAt)
        )
        .limit(5),
    ])

    // Tren 6 bulan terakhir (WIB), termasuk bulan tanpa aduan.
    const tren = await db
      .execute<{ bulan: string; jumlah: number }>(sql`
        select to_char(b.awal, 'YYYY-MM') as bulan, count(p.id)::int as jumlah
        from generate_series(date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '5 months',
                             date_trunc('month', now() at time zone 'Asia/Jakarta'), interval '1 month') as b(awal)
        left join pengaduan p on (p.created_at at time zone 'Asia/Jakarta') >= b.awal
                             and (p.created_at at time zone 'Asia/Jakarta') < b.awal + interval '1 month'
        group by b.awal order by b.awal`)
      .then((r) => r.rows)

    return {
      angka,
      perKategori,
      tren,
      terbaru: terbaru.map((r) => {
        const { isi: _isi, ...v } = keTampilanGuru(r, context.user.guruBkId)
        return v
      }),
    }
  })
