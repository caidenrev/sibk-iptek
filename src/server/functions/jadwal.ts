// Slot & jadwal konseling (Sprint 3 · KF-07, KF-08, KF-09).
import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client"
import { bentrokExclude, indexDuplikat, masihDipakai } from "../db/errors"
import { guruBk, jadwalKonseling, kelas, pengaduan, siswa, slotJadwal, users } from "../db/schema"
import {
  AKTIF,
  BATAS_JAM,
  MULAI,
  SELESAI,
  jam5,
  keTampilanJadwal,
  kunciJadwalGuru,
  queryJadwal,
} from "../services/jadwal"
import { PesanError, guruMw, siswaMw } from "./middleware"
import { ajukanJadwalSchema, idSchema, slotSchema, tanggalSchema, tolakJadwalSchema } from "@/lib/validasi"
import { formatTanggalPendek, jamTitik } from "@/lib/format"
import { geserTanggal, tanggalSlotBerulang } from "@/lib/tanggal"

const HARI_KE_DEPAN = 30
// Nama tabel ditulis eksplisit: pada query tanpa join, Drizzle menulis kolom tanpa nama tabel,
// sehingga "id" di dalam subquery akan terbaca sebagai jadwal_konseling.id (lihat juga pengaduan.ts).
const PUNYA_RIWAYAT = sql<boolean>`exists (select 1 from jadwal_konseling j where j.slot_id = "slot_jadwal"."id")`
const MAKS_PENGAJUAN_AKTIF = 2
const MAKS_SLOT_SEKALI_TAMBAH = 60


// ================================================================ Guru BK: slot

/** Slot milik Guru BK ini selama 7 hari mulai `mulai` (Senin), beserta pengajuan aktifnya. */
export const slotMingguanFn = createServerFn({ method: "GET" })
  .middleware([guruMw])
  .validator(z.object({ mulai: tanggalSchema }))
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId ?? -1
    const sampai = geserTanggal(data.mulai, 6)
    const aktif = db
      .select({ slotId: jadwalKonseling.slotId, id: jadwalKonseling.id, status: jadwalKonseling.status, siswaId: jadwalKonseling.siswaId })
      .from(jadwalKonseling)
      .where(AKTIF)
      .as("aktif")
    const rows = await db
      .select({
        id: slotJadwal.id,
        tanggal: slotJadwal.tanggal,
        jamMulai: slotJadwal.jamMulai,
        jamSelesai: slotJadwal.jamSelesai,
        lokasi: slotJadwal.lokasi,
        status: slotJadwal.status,
        lewat: sql<boolean>`${MULAI} <= now()`,
        punyaRiwayat: PUNYA_RIWAYAT,
        jadwalId: aktif.id,
        jadwalStatus: aktif.status,
        siswaNama: users.nama,
        siswaKelas: kelas.namaKelas,
      })
      .from(slotJadwal)
      .leftJoin(aktif, eq(aktif.slotId, slotJadwal.id))
      .leftJoin(siswa, eq(siswa.id, aktif.siswaId))
      .leftJoin(users, eq(users.id, siswa.userId))
      .leftJoin(kelas, eq(kelas.id, siswa.kelasId))
      .where(and(eq(slotJadwal.guruBkId, saya), gte(slotJadwal.tanggal, data.mulai), lte(slotJadwal.tanggal, sampai)))
      .orderBy(asc(slotJadwal.tanggal), asc(slotJadwal.jamMulai))
    const [{ hariIni }] = await db.execute<{ hariIni: string }>(sql`select to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD') as "hariIni"`).then((r) => r.rows)
    return {
      hariIni,
      slot: rows.map((r) => ({
        id: r.id,
        tanggal: r.tanggal,
        jamMulai: jam5(r.jamMulai),
        jamSelesai: jam5(r.jamSelesai),
        lokasi: r.lokasi,
        status: r.status,
        lewat: r.lewat,
        punyaRiwayat: r.punyaRiwayat,
        pengajuan: r.jadwalId ? { id: r.jadwalId, status: r.jadwalStatus!, siswa: r.siswaNama ?? "", kelas: r.siswaKelas ?? "" } : null,
      })),
    }
  })

export const tambahSlotFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(slotSchema)
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId
    if (!saya) throw new PesanError("Akun ini bukan akun Guru BK.")
    const tanggal = tanggalSlotBerulang(data.tanggal, data.hari, data.ulangiMinggu)
    if (tanggal.length === 0) throw new PesanError("Tidak ada tanggal yang cocok. Periksa pilihan hari dan tanggal mulai.")
    if (tanggal.length > MAKS_SLOT_SEKALI_TAMBAH) throw new PesanError(`Maksimal ${MAKS_SLOT_SEKALI_TAMBAH} slot sekali tambah.`)

    const lewat = await db.execute<{ t: string }>(
      // Dikirim sebagai satu literal array Postgres; array JS akan dipecah Drizzle menjadi ($1, $2, …).
      sql`select to_char(d, 'YYYY-MM-DD') as t from unnest(${`{${tanggal.join(",")}}`}::date[]) d where (d + ${data.jamMulai}::time) at time zone 'Asia/Jakarta' <= now()`
    )
    if (lewat.rows.length) throw new PesanError(`Waktu ${formatTanggalPendek(lewat.rows[0].t)} ${jamTitik(data.jamMulai)} sudah lewat. Pilih waktu yang akan datang.`)

    const bentrok = await db
      .select({ tanggal: slotJadwal.tanggal, jamMulai: slotJadwal.jamMulai, jamSelesai: slotJadwal.jamSelesai })
      .from(slotJadwal)
      .where(
        and(
          eq(slotJadwal.guruBkId, saya),
          ne(slotJadwal.status, "ditutup"),
          inArray(slotJadwal.tanggal, tanggal),
          sql`${slotJadwal.jamMulai} < ${data.jamSelesai}::time and ${slotJadwal.jamSelesai} > ${data.jamMulai}::time`
        )
      )
      .orderBy(asc(slotJadwal.tanggal))
    if (bentrok.length) {
      const daftar = bentrok.slice(0, 3).map((b) => `${formatTanggalPendek(b.tanggal)} ${jamTitik(b.jamMulai)}–${jamTitik(b.jamSelesai)}`)
      throw new PesanError(`Bentrok dengan slot yang sudah ada: ${daftar.join(", ")}${bentrok.length > 3 ? `, dan ${bentrok.length - 3} lainnya` : ""}.`)
    }

    try {
      await db.insert(slotJadwal).values(
        tanggal.map((t) => ({ guruBkId: saya, tanggal: t, jamMulai: data.jamMulai, jamSelesai: data.jamSelesai, lokasi: data.lokasi }))
      )
    } catch (e) {
      // Dua penyimpanan bersamaan bisa lolos pemeriksaan di atas; constraint database tetap menolak.
      if (bentrokExclude(e)) throw new PesanError("Bentrok dengan slot yang baru saja dibuat. Muat ulang halaman lalu coba lagi.")
      throw e
    }
    return { jumlah: tanggal.length }
  })

export const ubahSlotFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(z.object({ id: idSchema, aksi: z.enum(["tutup", "buka", "hapus"]) }))
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId ?? -1
    const [s] = await db
      .select({
        status: slotJadwal.status,
        lewat: sql<boolean>`${MULAI} <= now()`,
        punyaRiwayat: PUNYA_RIWAYAT,
      })
      .from(slotJadwal)
      .where(and(eq(slotJadwal.id, data.id), eq(slotJadwal.guruBkId, saya)))
    if (!s) throw new PesanError("Slot tidak ditemukan.")
    if (s.status === "dipesan") throw new PesanError("Slot ini sedang dipesan siswa. Tolak pengajuannya dulu di menu Pengajuan & Sesi.")

    if (data.aksi === "hapus") {
      if (s.punyaRiwayat) throw new PesanError("Slot ini punya riwayat pengajuan, jadi hanya bisa ditutup.")
      try {
        await db.delete(slotJadwal).where(eq(slotJadwal.id, data.id))
      } catch (e) {
        // Pengaman kedua: foreign key menolak bila ternyata ada pengajuan yang baru masuk.
        if (masihDipakai(e)) throw new PesanError("Slot ini punya riwayat pengajuan, jadi hanya bisa ditutup.")
        throw e
      }
      return { ok: true }
    }
    if (data.aksi === "buka" && s.lewat) throw new PesanError("Waktu slot ini sudah lewat.")
    try {
      await db
        .update(slotJadwal)
        .set({ status: data.aksi === "tutup" ? "ditutup" : "tersedia" })
        .where(eq(slotJadwal.id, data.id))
    } catch (e) {
      if (bentrokExclude(e)) throw new PesanError("Waktu slot ini sudah dipakai slot lain. Hapus atau tutup slot itu dulu.")
      throw e
    }
    return { ok: true }
  })

// ================================================================ Guru BK: pengajuan & sesi

export const daftarJadwalGuruFn = createServerFn({ method: "GET" })
  .middleware([guruMw])
  .validator(z.object({ tab: z.enum(["menunggu", "disetujui", "riwayat"]).default("menunggu") }))
  .handler(async ({ data, context }) => {
    const saya = context.user.guruBkId ?? -1
    const milikSaya = eq(slotJadwal.guruBkId, saya)
    const syarat =
      data.tab === "menunggu"
        ? eq(jadwalKonseling.status, "menunggu")
        : data.tab === "disetujui"
          ? eq(jadwalKonseling.status, "disetujui")
          : inArray(jadwalKonseling.status, ["ditolak", "selesai", "batal", "tidak_hadir"])
    const [rows, [jumlah]] = await Promise.all([
      queryJadwal()
        .where(and(milikSaya, syarat))
        .orderBy(...(data.tab === "riwayat" ? [desc(slotJadwal.tanggal), desc(slotJadwal.jamMulai)] : [asc(slotJadwal.tanggal), asc(slotJadwal.jamMulai)]))
        .limit(100),
      db
        .select({
          menunggu: sql<number>`count(*) filter (where ${jadwalKonseling.status} = 'menunggu')`.mapWith(Number),
          disetujui: sql<number>`count(*) filter (where ${jadwalKonseling.status} = 'disetujui')`.mapWith(Number),
        })
        .from(jadwalKonseling)
        .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
        .where(milikSaya),
    ])
    return { rows: rows.map(keTampilanJadwal), jumlah }
  })

export const setujuiJadwalFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      const j = await kunciJadwalGuru(tx, data.id, context.user.guruBkId ?? -1)
      if (!j) throw new PesanError("Pengajuan tidak ditemukan.")
      if (j.status !== "menunggu") throw new PesanError("Pengajuan ini sudah diputuskan.")
      if (j.sudahMulai) throw new PesanError("Waktu sesi sudah lewat. Tolak pengajuan ini dan minta siswa mengajukan ulang.")
      await tx.update(jadwalKonseling).set({ status: "disetujui", diputuskanPada: sql`now()` }).where(eq(jadwalKonseling.id, data.id))
    })
    return { ok: true }
  })

/** Tolak pengajuan, atau batalkan sesi yang sudah disetujui. Alasan wajib (BB-19). Slot kembali tersedia. */
export const tolakJadwalFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(tolakJadwalSchema)
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      const j = await kunciJadwalGuru(tx, data.id, context.user.guruBkId ?? -1)
      if (!j) throw new PesanError("Pengajuan tidak ditemukan.")
      if (j.status !== "menunggu" && j.status !== "disetujui") throw new PesanError("Pengajuan ini sudah tidak aktif.")
      if (j.status === "disetujui" && j.sudahMulai) throw new PesanError("Sesi sudah dimulai. Tandai Selesai atau Tidak hadir.")
      await tx
        .update(jadwalKonseling)
        .set({ status: "ditolak", alasanPenolakan: data.alasan, diputuskanPada: sql`now()` })
        .where(eq(jadwalKonseling.id, data.id))
      await tx.update(slotJadwal).set({ status: "tersedia" }).where(eq(slotJadwal.id, j.slotId))
    })
    return { ok: true }
  })

export const tandaiSesiFn = createServerFn({ method: "POST" })
  .middleware([guruMw])
  .validator(z.object({ id: idSchema, hasil: z.enum(["selesai", "tidak_hadir"]) }))
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      const j = await kunciJadwalGuru(tx, data.id, context.user.guruBkId ?? -1)
      if (!j) throw new PesanError("Sesi tidak ditemukan.")
      if (j.status !== "disetujui") throw new PesanError("Hanya sesi yang disetujui yang bisa ditandai.")
      if (!j.sudahMulai) throw new PesanError("Sesi belum dimulai.")
      await tx.update(jadwalKonseling).set({ status: data.hasil }).where(eq(jadwalKonseling.id, data.id))
    })
    return { ok: true }
  })

/** Ringkasan untuk dashboard Guru BK: jumlah pengajuan menunggu & agenda hari ini. */
export const agendaGuruFn = createServerFn({ method: "GET" })
  .middleware([guruMw])
  .handler(async ({ context }) => {
    const saya = context.user.guruBkId ?? -1
    const hariIni = sql`(now() at time zone 'Asia/Jakarta')::date`
    const [rows, [{ menunggu }]] = await Promise.all([
      queryJadwal()
        .where(and(eq(slotJadwal.guruBkId, saya), eq(jadwalKonseling.status, "disetujui"), sql`${slotJadwal.tanggal} = ${hariIni}`))
        .orderBy(asc(slotJadwal.jamMulai)),
      db
        .select({ menunggu: count() })
        .from(jadwalKonseling)
        .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
        .where(and(eq(slotJadwal.guruBkId, saya), eq(jadwalKonseling.status, "menunggu"), sql`${MULAI} > now()`)),
    ])
    return { menunggu, hariIni: rows.map(keTampilanJadwal) }
  })

// ================================================================ Siswa

/** Pilihan Guru BK untuk wizard pengajuan: pembina kelas siswa ditaruh paling atas. */
export const opsiGuruJadwalFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .handler(async ({ context }) => {
    const [saya] = await db.select({ kelasId: siswa.kelasId }).from(siswa).where(eq(siswa.id, context.user.siswaId ?? -1))
    const rows = await db
      .select({
        id: guruBk.id,
        nama: users.nama,
        pembina: sql<boolean>`exists (select 1 from kelas k where k.id = ${saya?.kelasId ?? -1} and k.guru_bk_id = ${guruBk.id})`,
        slotTersedia: sql<number>`(select count(*) from slot_jadwal s where s.guru_bk_id = ${guruBk.id} and s.status = 'tersedia'
          and ((s.tanggal + s.jam_mulai) at time zone 'Asia/Jakarta') >= now() + interval '${sql.raw(String(BATAS_JAM))} hours'
          and s.tanggal <= (now() at time zone 'Asia/Jakarta')::date + ${HARI_KE_DEPAN}::int)`.mapWith(Number),
      })
      .from(guruBk)
      .innerJoin(users, eq(users.id, guruBk.userId))
      .where(eq(users.isActive, true))
      .orderBy(asc(users.nama))
    return rows.sort((a, b) => Number(b.pembina) - Number(a.pembina))
  })

/** Slot yang masih bisa dipesan (≥ 2 jam lagi, 30 hari ke depan) untuk satu Guru BK. */
export const slotTersediaFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .validator(z.object({ guruBkId: idSchema }))
  .handler(async ({ data }) => {
    const rows = await db
      .select({ id: slotJadwal.id, tanggal: slotJadwal.tanggal, jamMulai: slotJadwal.jamMulai, jamSelesai: slotJadwal.jamSelesai, lokasi: slotJadwal.lokasi })
      .from(slotJadwal)
      .where(
        and(
          eq(slotJadwal.guruBkId, data.guruBkId),
          eq(slotJadwal.status, "tersedia"),
          sql`${MULAI} >= now() + interval '${sql.raw(String(BATAS_JAM))} hours'`,
          sql`${slotJadwal.tanggal} <= (now() at time zone 'Asia/Jakarta')::date + ${HARI_KE_DEPAN}::int`
        )
      )
      .orderBy(asc(slotJadwal.tanggal), asc(slotJadwal.jamMulai))
    return rows.map((r) => ({ ...r, jamMulai: jam5(r.jamMulai), jamSelesai: jam5(r.jamSelesai) }))
  })

/** Data pendukung halaman pengajuan: sisa kuota & aduan yang boleh ditautkan. */
export const konteksAjukanFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .handler(async ({ context }) => {
    const me = context.user.siswaId ?? -1
    const [[{ aktif }], aduan] = await Promise.all([
      db
        .select({ aktif: count() })
        .from(jadwalKonseling)
        .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
        .where(and(eq(jadwalKonseling.siswaId, me), AKTIF, sql`${MULAI} >= now()`)),
      // Hanya aduan yang sudah memuat identitas siswa (beridentitas, atau anonim yang sudah dibuka).
      db
        .select({ kodeTiket: pengaduan.kodeTiket, judul: pengaduan.judul })
        .from(pengaduan)
        .where(and(eq(pengaduan.siswaId, me), ne(pengaduan.status, "selesai")))
        .orderBy(desc(pengaduan.updatedAt)),
    ])
    return { aktif, maks: MAKS_PENGAJUAN_AKTIF, aduan }
  })

export const ajukanJadwalFn = createServerFn({ method: "POST" })
  .middleware([siswaMw])
  .validator(ajukanJadwalSchema)
  .handler(async ({ data, context }) => {
    const me = context.user.siswaId
    if (!me) throw new PesanError("Akun ini bukan akun siswa.")
    try {
      return await db.transaction(async (tx) => {
        // Kunci baris siswa: dua pengajuan bersamaan dari siswa yang sama dihitung berurutan.
        await tx.select({ id: siswa.id }).from(siswa).where(eq(siswa.id, me)).for("update")
        const [{ aktif }] = await tx
          .select({ aktif: count() })
          .from(jadwalKonseling)
          .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
          .where(and(eq(jadwalKonseling.siswaId, me), AKTIF, sql`${MULAI} >= now()`))
        if (aktif >= MAKS_PENGAJUAN_AKTIF)
          throw new PesanError(`Kamu sudah punya ${MAKS_PENGAJUAN_AKTIF} pengajuan aktif. Tunggu keputusan Guru BK atau batalkan salah satunya.`)

        // Row lock pada slot (BB-18): siswa kedua menunggu di sini, lalu melihat status "dipesan".
        const [slot] = await tx
          .select({ id: slotJadwal.id, status: slotJadwal.status, cukupWaktu: sql<boolean>`${MULAI} >= now() + interval '${sql.raw(String(BATAS_JAM))} hours'` })
          .from(slotJadwal)
          .where(eq(slotJadwal.id, data.slotId))
          .for("update")
        if (!slot || slot.status === "ditutup") throw new PesanError("Slot ini sudah tidak tersedia. Pilih slot lain.")
        if (slot.status === "dipesan") throw new PesanError("Slot ini baru saja dipesan siswa lain. Pilih slot lain.")
        if (!slot.cukupWaktu) throw new PesanError(`Slot harus dipesan paling lambat ${BATAS_JAM} jam sebelum dimulai.`)

        let pengaduanId: number | null = null
        if (data.kodePengaduan) {
          const [p] = await tx
            .select({ id: pengaduan.id })
            .from(pengaduan)
            .where(and(eq(pengaduan.kodeTiket, data.kodePengaduan), eq(pengaduan.siswaId, me)))
          if (!p) throw new PesanError("Pengaduan yang dipilih tidak bisa ditautkan.")
          pengaduanId = p.id
        }

        const [j] = await tx
          .insert(jadwalKonseling)
          .values({ siswaId: me, slotId: slot.id, pengaduanId, topik: data.topik })
          .returning({ id: jadwalKonseling.id })
        await tx.update(slotJadwal).set({ status: "dipesan" }).where(eq(slotJadwal.id, slot.id))
        return { id: j.id }
      })
    } catch (e) {
      if (indexDuplikat(e) === "jadwal_satu_aktif_per_slot") throw new PesanError("Slot ini baru saja dipesan siswa lain. Pilih slot lain.")
      throw e
    }
  })

export const jadwalSayaFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .handler(async ({ context }) => {
    const rows = await queryJadwal()
      .where(eq(jadwalKonseling.siswaId, context.user.siswaId ?? -1))
      .orderBy(desc(slotJadwal.tanggal), desc(slotJadwal.jamMulai))
    return rows.map((r) => {
      // Siswa tidak perlu melihat datanya sendiri dua kali; NIS & kelas tidak dikirim.
      const { siswa: _s, ...v } = keTampilanJadwal(r)
      return v
    })
  })

export const batalkanJadwalFn = createServerFn({ method: "POST" })
  .middleware([siswaMw])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      const [j] = await tx
        .select({ status: jadwalKonseling.status, slotId: jadwalKonseling.slotId, masihBisa: sql<boolean>`${MULAI} - interval '${sql.raw(String(BATAS_JAM))} hours' >= now()` })
        .from(jadwalKonseling)
        .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
        .where(and(eq(jadwalKonseling.id, data.id), eq(jadwalKonseling.siswaId, context.user.siswaId ?? -1)))
        .for("update", { of: jadwalKonseling })
      if (!j) throw new PesanError("Jadwal tidak ditemukan.")
      if (j.status !== "menunggu" && j.status !== "disetujui") throw new PesanError("Jadwal ini sudah tidak aktif.")
      if (!j.masihBisa) throw new PesanError(`Pembatalan paling lambat ${BATAS_JAM} jam sebelum sesi. Hubungi Guru BK langsung.`)
      await tx.update(jadwalKonseling).set({ status: "batal" }).where(eq(jadwalKonseling.id, data.id))
      await tx.update(slotJadwal).set({ status: "tersedia" }).where(eq(slotJadwal.id, j.slotId))
    })
    return { ok: true }
  })

/** Jadwal terdekat siswa (untuk kartu di beranda). */
export const jadwalBerikutnyaFn = createServerFn({ method: "GET" })
  .middleware([siswaMw])
  .handler(async ({ context }) => {
    const [r] = await queryJadwal()
      .where(and(eq(jadwalKonseling.siswaId, context.user.siswaId ?? -1), AKTIF, sql`${SELESAI} > now()`))
      .orderBy(asc(slotJadwal.tanggal), asc(slotJadwal.jamMulai))
      .limit(1)
    if (!r) return null
    const { siswa: _s, ...v } = keTampilanJadwal(r)
    return v
  })
