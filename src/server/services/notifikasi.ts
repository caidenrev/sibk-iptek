import "@tanstack/react-start/server-only"
import { and, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "../db/client"
import { guruBk, jadwalKonseling, kategoriMasalah, kelas, notifikasi, pengaduan, siswa, slotJadwal, users } from "../db/schema"
import type { Kanal } from "../db/schema"
import { dekripsi } from "../crypto"
import { kirimEmail, kirimWhatsapp } from "../notif/kirim"
import { pesanNotifikasi } from "../notif/template"
import { env } from "../env"
import { formatSlot } from "@/lib/format"

// Notifikasi WA & email (KF-10, KF-14).
// Alur: kejadian → catatNotifikasi() membuat baris "menunggu" di tabel notifikasi (outbox)
// → kirimAntrean() mengirim. kirimAntrean dipanggil langsung setelah kejadian dan juga oleh
// endpoint cron tiap menit, sehingga pesan yang gagal atau terputus tetap terkirim kemudian.

export const MAKS_PERCOBAAN = 3
/** Balasan beruntun pada satu aduan cukup diberi tahu sekali per 30 menit, supaya tidak membanjiri HP. */
const JEDA_BALASAN_MENIT = 30

export type Kejadian =
  | { jenis: "pengaduan_baru"; pengaduanId: number }
  | { jenis: "tanggapan"; pengaduanId: number; tanggapanId: number; dari: "guru_bk" | "siswa" }
  | { jenis: "pengajuan_jadwal" | "konfirmasi" | "penolakan" | "pembatalan"; jadwalId: number }
  | { jenis: "pengingat_h1" | "pengingat_1jam"; jadwalId: number }
  | { jenis: "tes"; userId: number }

type Penerima = { userId: number; nama: string; email: string | null; wa: string | null }
type Pesan = ReturnType<typeof pesanNotifikasi>
type Rencana = { penerima: Penerima; pesan: Pesan; refTipe: string | null; refId: number | null; sensitif: boolean; kunci: string }

// ---------------------------------------------------------------- penerima

/** Hanya kontak yang sudah diverifikasi pemiliknya yang dikirimi pesan. */
async function penerimaDariUser(userIds: Array<number>): Promise<Array<Penerima>> {
  if (userIds.length === 0) return []
  const rows = await db
    .select({
      userId: users.id,
      nama: users.nama,
      email: sql<string | null>`case when ${users.emailTerverifikasiPada} is not null then ${users.email} end`,
      wa: sql<string | null>`case when ${users.waTerverifikasiPada} is not null then ${users.noWhatsapp} end`,
    })
    .from(users)
    .where(and(inArray(users.id, userIds), eq(users.isActive, true)))
  return rows
}

async function userGuru(guruBkIds: Array<number> | "semua"): Promise<Array<number>> {
  const rows = await db
    .select({ id: users.id })
    .from(guruBk)
    .innerJoin(users, eq(users.id, guruBk.userId))
    .where(guruBkIds === "semua" ? eq(users.isActive, true) : inArray(guruBk.id, guruBkIds.length ? guruBkIds : [-1]))
  return rows.map((r) => r.id)
}

async function userSiswa(siswaId: number) {
  const [r] = await db.select({ id: siswa.userId }).from(siswa).where(eq(siswa.id, siswaId))
  return r?.id ?? null
}

// ---------------------------------------------------------------- isi pesan per kejadian

async function rencanaPengaduan(k: Extract<Kejadian, { jenis: "pengaduan_baru" | "tanggapan" }>): Promise<Array<Rencana>> {
  const [p] = await db
    .select({
      id: pengaduan.id,
      kode: pengaduan.kodeTiket,
      isAnonim: pengaduan.isAnonim,
      dibuka: pengaduan.identitasDibukaPada,
      siswaId: pengaduan.siswaId,
      terenkripsi: pengaduan.pengirimTerenkripsi,
      guruBkId: pengaduan.guruBkId,
      urgensi: pengaduan.tingkatUrgensi,
      kategori: kategoriMasalah.namaKategori,
    })
    .from(pengaduan)
    .innerJoin(kategoriMasalah, eq(kategoriMasalah.id, pengaduan.kategoriId))
    .where(eq(pengaduan.id, k.pengaduanId))
  if (!p) return []
  const sensitif = p.isAnonim && !p.dibuka
  const tautanGuru = `/guru/pengaduan/${p.kode}`

  if (k.jenis === "pengaduan_baru") {
    // Aduan beridentitas → pembina kelas; aduan anonim → semua Guru BK (antrean bersama).
    const ke = await penerimaDariUser(await userGuru(p.guruBkId ? [p.guruBkId] : "semua"))
    const pesan = (n: string) =>
      pesanNotifikasi({
        nama: n,
        judul: p.urgensi === "tinggi" ? "Pengaduan mendesak masuk" : "Pengaduan baru masuk",
        baris: [
          `Tiket ${p.kode} (${p.kategori}, urgensi ${p.urgensi}) baru saja dikirim${sensitif ? " secara anonim dan masuk ke antrean bersama" : ""}.`,
          "Buka SIBK untuk membaca dan menanggapinya.",
        ],
        tautan: tautanGuru,
        labelTautan: "Buka pengaduan",
      })
    return ke.map((r) => ({ penerima: r, pesan: pesan(r.nama), refTipe: "pengaduan", refId: p.id, sensitif, kunci: `pengaduan_baru:${p.id}` }))
  }

  if (k.dari === "guru_bk") {
    // Pemilik aduan anonim dikenali dari ID terenkripsi, hanya untuk mengirim pesan ke dirinya sendiri.
    const siswaId = p.siswaId ?? Number(dekripsi(p.terenkripsi))
    const uid = await userSiswa(siswaId)
    if (!uid || (await baruDiberiTahu(uid, p.id))) return []
    const ke = await penerimaDariUser([uid])
    return ke.map((r) => ({
      penerima: r,
      // Kalimat sama untuk aduan anonim maupun beridentitas: tidak menyebut isi atau judul aduan.
      pesan: pesanNotifikasi({
        nama: r.nama,
        judul: "Ada tanggapan baru dari Guru BK",
        baris: [`Guru BK membalas tiket ${p.kode}.`, "Buka SIBK untuk membacanya."],
        tautan: `/siswa/pengaduan/${p.kode}`,
        labelTautan: "Baca tanggapan",
      }),
      refTipe: "pengaduan",
      refId: p.id,
      sensitif,
      kunci: `tanggapan:${k.tanggapanId}`,
    }))
  }

  // Balasan siswa → Guru BK penanggung jawab saja (aduan di antrean sudah terlihat lewat lencana).
  if (!p.guruBkId) return []
  const uids = await userGuru([p.guruBkId])
  const hasil: Array<Rencana> = []
  for (const r of await penerimaDariUser(uids)) {
    if (await baruDiberiTahu(r.userId, p.id)) continue
    hasil.push({
      penerima: r,
      pesan: pesanNotifikasi({
        nama: r.nama,
        judul: "Siswa membalas pengaduan",
        baris: [`Ada pesan baru dari siswa di tiket ${p.kode}.`],
        tautan: tautanGuru,
        labelTautan: "Buka percakapan",
      }),
      refTipe: "pengaduan",
      refId: p.id,
      sensitif,
      kunci: `tanggapan:${k.tanggapanId}`,
    })
  }
  return hasil
}

async function baruDiberiTahu(userId: number, pengaduanId: number) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifikasi)
    .where(
      and(
        eq(notifikasi.userId, userId),
        eq(notifikasi.jenis, "tanggapan"),
        eq(notifikasi.refId, pengaduanId),
        inArray(notifikasi.status, ["menunggu", "terkirim"]),
        gte(notifikasi.createdAt, sql`now() - interval '${sql.raw(String(JEDA_BALASAN_MENIT))} minutes'`)
      )
    )
  return r.n > 0
}

async function rencanaJadwal(k: Extract<Kejadian, { jadwalId: number }>): Promise<Array<Rencana>> {
  const [j] = await db
    .select({
      id: jadwalKonseling.id,
      topik: jadwalKonseling.topik,
      alasan: jadwalKonseling.alasanPenolakan,
      siswaId: jadwalKonseling.siswaId,
      siswaUser: siswa.userId,
      siswaNama: sql<string>`(select nama from users where id = ${siswa.userId})`,
      kelas: kelas.namaKelas,
      guruUser: guruBk.userId,
      guruNama: sql<string>`(select nama from users where id = ${guruBk.userId})`,
      tanggal: slotJadwal.tanggal,
      jamMulai: slotJadwal.jamMulai,
      jamSelesai: slotJadwal.jamSelesai,
      lokasi: slotJadwal.lokasi,
    })
    .from(jadwalKonseling)
    .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
    .innerJoin(siswa, eq(siswa.id, jadwalKonseling.siswaId))
    .leftJoin(kelas, eq(kelas.id, siswa.kelasId))
    .innerJoin(guruBk, eq(guruBk.id, slotJadwal.guruBkId))
    .where(eq(jadwalKonseling.id, k.jadwalId))
  if (!j) return []
  const waktu = formatSlot(j.tanggal, j.jamMulai, j.jamSelesai)
  const kunci = `${k.jenis}:${j.id}`
  const keSiswa = async (judul: string, baris: Array<string>) =>
    (await penerimaDariUser([j.siswaUser])).map((r) => ({
      penerima: r,
      pesan: pesanNotifikasi({ nama: r.nama, judul, baris, tautan: "/siswa/jadwal", labelTautan: "Lihat jadwal" }),
      refTipe: "jadwal",
      refId: j.id,
      sensitif: false,
      kunci,
    }))
  const keGuru = async (judul: string, baris: Array<string>, tautan = "/guru/jadwal") =>
    (await penerimaDariUser([j.guruUser])).map((r) => ({
      penerima: r,
      pesan: pesanNotifikasi({ nama: r.nama, judul, baris, tautan, labelTautan: "Buka SIBK" }),
      refTipe: "jadwal",
      refId: j.id,
      sensitif: false,
      kunci,
    }))

  switch (k.jenis) {
    case "pengajuan_jadwal":
      return keGuru("Pengajuan konseling baru", [`${j.siswaNama} (${j.kelas ?? "-"}) mengajukan konseling pada ${waktu} di ${j.lokasi}.`, `Topik: ${j.topik}`, "Setujui atau tolak di SIBK."])
    case "konfirmasi":
      return keSiswa("Jadwal konseling disetujui", [`Konselingmu dengan ${j.guruNama} disetujui: ${waktu} di ${j.lokasi}.`, "Datang tepat waktu ya. Kalau berhalangan, batalkan paling lambat 2 jam sebelumnya."])
    case "penolakan":
      return keSiswa("Jadwal konseling tidak bisa dilaksanakan", [`Jadwal ${waktu} bersama ${j.guruNama} tidak bisa dilaksanakan.`, `Alasan: ${j.alasan ?? "-"}`, "Silakan ajukan waktu lain."])
    case "pembatalan":
      return keGuru("Siswa membatalkan jadwal", [`${j.siswaNama} (${j.kelas ?? "-"}) membatalkan konseling ${waktu}. Slot kembali tersedia.`], "/guru/slot")
    case "pengingat_h1":
    case "pengingat_1jam": {
      const kapan = k.jenis === "pengingat_h1" ? "Pengingat: konseling dalam 24 jam" : "Pengingat: konseling 1 jam lagi"
      return [
        ...(await keSiswa(kapan, [`${waktu} di ${j.lokasi} bersama ${j.guruNama}.`])),
        ...(await keGuru(kapan, [`${waktu} di ${j.lokasi} bersama ${j.siswaNama} (${j.kelas ?? "-"}).`, `Topik: ${j.topik}`])),
      ]
    }
  }
}

async function rencana(k: Kejadian): Promise<Array<Rencana>> {
  if (k.jenis === "pengaduan_baru" || k.jenis === "tanggapan") return rencanaPengaduan(k)
  if (k.jenis === "tes") {
    return (await penerimaDariUser([k.userId])).map((r) => ({
      penerima: r,
      pesan: pesanNotifikasi({
        nama: r.nama,
        judul: "Pesan uji dari SIBK",
        baris: ["Kalau kamu menerima pesan ini, notifikasi SIBK ke kontak ini sudah berjalan."],
        tautan: "/profil",
        labelTautan: "Buka profil",
      }),
      refTipe: "tes",
      refId: null,
      sensitif: false,
      kunci: `tes:${Date.now()}`,
    }))
  }
  return rencanaJadwal(k)
}

// ---------------------------------------------------------------- antrean

/** Buat baris notifikasi (satu per kanal yang terverifikasi). Kunci unik mencegah pesan ganda. */
export async function catatNotifikasi(k: Kejadian): Promise<Array<number>> {
  const daftar = await rencana(k)
  const baris = daftar.flatMap((r) => {
    const kanal: Array<{ kanal: Kanal; tujuan: string }> = []
    if (r.penerima.email) kanal.push({ kanal: "email", tujuan: r.penerima.email })
    if (r.penerima.wa) kanal.push({ kanal: "whatsapp", tujuan: r.penerima.wa })
    return kanal.map((c) => ({
      userId: r.penerima.userId,
      kanal: c.kanal,
      tujuan: c.tujuan,
      jenis: k.jenis,
      refTipe: r.refTipe,
      refId: r.refId,
      isSensitif: r.sensitif,
      subjek: c.kanal === "email" ? r.pesan.subjek : null,
      pesan: c.kanal === "email" ? r.pesan.teks : r.pesan.wa,
      html: c.kanal === "email" ? r.pesan.html : null,
      kunci: r.kunci,
    }))
  })
  if (baris.length === 0) return []
  const hasil = await db.insert(notifikasi).values(baris).onConflictDoNothing().returning({ id: notifikasi.id })
  return hasil.map((h) => h.id)
}

/**
 * Kirim pesan yang menunggu. Baris diklaim dulu (FOR UPDATE SKIP LOCKED) supaya cron dan
 * pengiriman langsung tidak mengirim pesan yang sama dua kali.
 */
export async function kirimAntrean(opsi: { ids?: Array<number>; batas?: number } = {}) {
  const filterId = opsi.ids ? sql`and id = any(${`{${opsi.ids.join(",")}}`}::bigint[])` : sql``
  const { rows } = await db.execute<{ id: number; jenis: string; kanal: Kanal; tujuan: string; subjek: string | null; pesan: string; html: string | null; percobaan: number }>(sql`
    update notifikasi set diklaim_pada = now()
    where id in (
      select id from notifikasi
      where status = 'menunggu' and dijadwalkan_pada <= now()
        and (diklaim_pada is null or diklaim_pada < now() - interval '2 minutes')
        ${filterId}
      order by dijadwalkan_pada
      limit ${opsi.batas ?? 50}
      for update skip locked
    )
    returning id, jenis, kanal, tujuan, subjek, pesan, html, percobaan`)

  const ringkas = { terkirim: 0, gagal: 0, diulang: 0, dilewati: 0 }
  for (const n of rows) {
    // Saat pengembangan, data akun uji bisa memakai alamat sungguhan (mis. domain sekolah).
    // Notifikasi otomatis cukup dicetak ke log; pesan uji yang sengaja dikirim tetap dikirim.
    let hasil: Awaited<ReturnType<typeof kirimEmail>>
    if (env.NODE_ENV !== "production" && env.NOTIF_KIRIM_NYATA !== "true" && n.jenis !== "tes") {
      console.info(`\n[notifikasi:log] ${n.kanal} ke=${n.tujuan} jenis=${n.jenis}\n${n.pesan}\n`)
      hasil = { ok: true, mode: "log" }
    } else {
      hasil =
        n.kanal === "email"
          ? await kirimEmail({ ke: n.tujuan, subjek: n.subjek ?? "SIBK", teks: n.pesan, html: n.html ?? n.pesan })
          : await kirimWhatsapp({ ke: n.tujuan, pesan: n.pesan })
    }
    const ke = n.percobaan + 1
    if (hasil.ok) {
      ringkas.terkirim++
      await db
        .update(notifikasi)
        .set({
          status: "terkirim",
          percobaan: ke,
          dikirimPada: sql`now()`,
          diklaimPada: null,
          errorTerakhir: hasil.mode === "log" ? "Mode pengembangan: pesan dicetak ke log server, tidak benar-benar dikirim." : null,
        })
        .where(eq(notifikasi.id, n.id))
    } else if (hasil.belumDiatur) {
      ringkas.dilewati++
      await db.update(notifikasi).set({ status: "dilewati", errorTerakhir: hasil.error, diklaimPada: null }).where(eq(notifikasi.id, n.id))
    } else if (ke >= MAKS_PERCOBAAN) {
      ringkas.gagal++
      await db.update(notifikasi).set({ status: "gagal", percobaan: ke, errorTerakhir: hasil.error, diklaimPada: null }).where(eq(notifikasi.id, n.id))
    } else {
      // Coba lagi 1 menit, lalu 5 menit kemudian.
      ringkas.diulang++
      await db
        .update(notifikasi)
        .set({ percobaan: ke, errorTerakhir: hasil.error, diklaimPada: null, dijadwalkanPada: sql`now() + interval '${sql.raw(ke === 1 ? "1" : "5")} minutes'` })
        .where(eq(notifikasi.id, n.id))
    }
  }
  return ringkas
}

/**
 * Dipanggil setelah sebuah aksi berhasil. Pencatatan ditunggu (cepat, satu-dua query) agar
 * pesan tidak hilang; pengirimannya tidak ditunggu supaya aksi pengguna tidak melambat.
 * Bila proses terhenti sebelum terkirim, cron berikutnya yang mengirim.
 */
export async function picuNotifikasi(k: Kejadian) {
  try {
    const ids = await catatNotifikasi(k)
    if (ids.length) void kirimAntrean({ ids }).catch((e) => console.error("[notifikasi] kirim langsung gagal:", e))
  } catch (e) {
    // Notifikasi tidak boleh menggagalkan aksi utama (mis. siswa tetap berhasil mengirim pengaduan).
    console.error("[notifikasi] gagal dicatat:", k, e)
  }
}

/** Buat pengingat H-1 dan 1 jam untuk sesi yang disetujui. Aman dipanggil berulang (BB-21). */
export async function buatPengingat() {
  const mulai = sql`((s.tanggal + s.jam_mulai) at time zone 'Asia/Jakarta')`
  const { rows } = await db.execute<{ id: number; jenis: "pengingat_h1" | "pengingat_1jam" }>(sql`
    select j.id, case when ${mulai} <= now() + interval '60 minutes' then 'pengingat_1jam' else 'pengingat_h1' end as jenis
    from jadwal_konseling j join slot_jadwal s on s.id = j.slot_id
    where j.status = 'disetujui' and ${mulai} > now() and ${mulai} <= now() + interval '24 hours'
      and not exists (
        select 1 from notifikasi n
        where n.ref_tipe = 'jadwal' and n.ref_id = j.id
          and n.kunci = (case when ${mulai} <= now() + interval '60 minutes' then 'pengingat_1jam:' else 'pengingat_h1:' end) || j.id
      )`)
  let dibuat = 0
  for (const r of rows) dibuat += (await catatNotifikasi({ jenis: r.jenis, jadwalId: r.id })).length
  return dibuat
}

// ---------------------------------------------------------------- admin & profil

/** Kirim pesan uji ke alamat tertentu sekarang juga (tercatat di log sebagai jenis "tes"). */
export async function kirimTesKe(userId: number, kanal: Kanal, tujuan: string, nama: string) {
  const p = pesanNotifikasi({
    nama,
    judul: "Pesan uji dari SIBK",
    baris: [`Kalau pesan ini sampai, pengiriman ${kanal === "email" ? "email" : "WhatsApp"} SIBK sudah berjalan.`],
    tautan: "/",
    labelTautan: "Buka SIBK",
  })
  const [n] = await db
    .insert(notifikasi)
    .values({
      userId,
      kanal,
      tujuan,
      jenis: "tes",
      refTipe: "tes",
      subjek: kanal === "email" ? p.subjek : null,
      pesan: kanal === "email" ? p.teks : p.wa,
      html: kanal === "email" ? p.html : null,
      kunci: `tes:${kanal}:${Date.now()}`,
    })
    .returning({ id: notifikasi.id })
  await kirimAntrean({ ids: [n.id] })
  return hasilNotifikasi([n.id])
}

/** Kirim ulang pesan yang gagal/dilewati (BB-22). */
export async function kirimUlang(id: number) {
  const r = await db
    .update(notifikasi)
    .set({ status: "menunggu", percobaan: 0, dijadwalkanPada: sql`now()`, diklaimPada: null, errorTerakhir: null })
    .where(and(eq(notifikasi.id, id), inArray(notifikasi.status, ["gagal", "dilewati"])))
    .returning({ id: notifikasi.id })
  if (r.length === 0) return null
  await kirimAntrean({ ids: [id] })
  return (await hasilNotifikasi([id]))[0] ?? null
}

export async function hasilNotifikasi(ids: Array<number>) {
  if (ids.length === 0) return []
  return db
    .select({ id: notifikasi.id, kanal: notifikasi.kanal, status: notifikasi.status, percobaan: notifikasi.percobaan, error: notifikasi.errorTerakhir })
    .from(notifikasi)
    .where(inArray(notifikasi.id, ids))
}

/** Uji token Fonnte ke API perangkat Fonnte, tanpa mengirim pesan. */
export async function ujiFonnte(token: string) {
  try {
    const res = await fetch("https://api.fonnte.com/device", { method: "POST", headers: { Authorization: token } })
    const b = (await res.json().catch(() => ({}))) as { status?: boolean; reason?: string; device_status?: string; device?: string; quota?: string | number }
    if (!res.ok || b.status === false) return { ok: false as const, pesan: b.reason ?? `HTTP ${res.status}` }
    return { ok: true as const, perangkat: b.device ?? null, statusPerangkat: b.device_status ?? null, kuota: b.quota ?? null }
  } catch (e) {
    return { ok: false as const, pesan: e instanceof Error ? e.message : String(e) }
  }
}
