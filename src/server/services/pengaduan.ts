import "@tanstack/react-start/server-only"
import { and, eq, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "../db/client"
import { indexDuplikat } from "../db/errors"
import { guruBk, kategoriMasalah, kelas, pengaduan, siswa, tanggapan, users } from "../db/schema"
import { buatAlias, buatKodeTiket, enkripsi, hashPengirim } from "../crypto"
import { simpanLampiran } from "./lampiran"
import { PesanError } from "@/lib/errors"

// ================================================================ pembuatan

type DataPengaduan = {
  anonim: boolean
  kategoriId: number
  urgensi: "rendah" | "sedang" | "tinggi"
  judul: string
  isi: string
}

/**
 * Simpan pengaduan baru (PRD §5.4).
 * - Beridentitas → siswa_id diisi, diarahkan ke Guru BK pembina kelas (bila ada).
 * - Anonim → siswa_id NULL, alias acak, masuk antrean bersama (guru_bk_id NULL).
 * Keduanya menyimpan hash + ID terenkripsi agar siswa bisa membuka riwayatnya & menerima notifikasi.
 */
export async function buatPengaduan(siswaId: number, data: DataPengaduan, file: File | null) {
  const [kat] = await db
    .select({ id: kategoriMasalah.id })
    .from(kategoriMasalah)
    .where(and(eq(kategoriMasalah.id, data.kategoriId), eq(kategoriMasalah.isActive, true)))
  if (!kat) throw new PesanError("Kategori tidak tersedia. Pilih kategori lain.")

  let guruTujuan: number | null = null
  if (!data.anonim) {
    const [s] = await db
      .select({ pembina: kelas.guruBkId })
      .from(siswa)
      .innerJoin(kelas, eq(kelas.id, siswa.kelasId))
      .where(eq(siswa.id, siswaId))
    guruTujuan = s?.pembina ?? null
  }

  const berkas = file && file.size > 0 ? await simpanLampiran(file, { anonim: data.anonim }) : null

  // Kode tiket acak; ulangi bila (sangat jarang) bentrok.
  for (let percobaan = 0; percobaan < 5; percobaan++) {
    const kodeTiket = buatKodeTiket()
    try {
      await db.insert(pengaduan).values({
        kodeTiket,
        siswaId: data.anonim ? null : siswaId,
        pengirimHash: hashPengirim(siswaId),
        pengirimTerenkripsi: enkripsi(String(siswaId)),
        isAnonim: data.anonim,
        alias: data.anonim ? buatAlias() : null,
        kategoriId: data.kategoriId,
        guruBkId: guruTujuan,
        judul: data.judul,
        isi: data.isi,
        lampiran: berkas?.kunci ?? null,
        lampiranTipe: berkas?.tipe ?? null,
        tingkatUrgensi: data.urgensi,
        dibacaSiswaPada: sql`now()`,
      })
      return { kodeTiket }
    } catch (e) {
      if (indexDuplikat(e) === "pengaduan_kode_tiket_unique") continue
      throw e
    }
  }
  throw new PesanError("Gagal membuat kode tiket. Coba kirim lagi.")
}

// ================================================================ tampilan untuk Guru BK

/** Baris mentah untuk Guru BK. Join ke siswa hanya bernilai bila siswa_id terisi (beridentitas/dibuka). */
export function queryPengaduanGuru() {
  const guruUser = alias(users, "guru_user")
  const siswaUser = alias(users, "siswa_user")
  return db
    .select({
      kodeTiket: pengaduan.kodeTiket,
      isAnonim: pengaduan.isAnonim,
      identitasDibukaPada: pengaduan.identitasDibukaPada,
      alias: pengaduan.alias,
      siswaNama: siswaUser.nama,
      siswaNis: siswa.nis,
      siswaKelas: kelas.namaKelas,
      kategori: kategoriMasalah.namaKategori,
      judul: pengaduan.judul,
      isi: pengaduan.isi,
      lampiranTipe: pengaduan.lampiranTipe,
      urgensi: pengaduan.tingkatUrgensi,
      status: pengaduan.status,
      guruBkId: pengaduan.guruBkId,
      guruNama: guruUser.nama,
      createdAt: pengaduan.createdAt,
      updatedAt: pengaduan.updatedAt,
      belumDibaca: sql<boolean>`coalesce((
        select max(${tanggapan.createdAt}) from ${tanggapan}
        where ${tanggapan.pengaduanId} = ${pengaduan.id} and ${tanggapan.pengirim} = 'siswa'
      ), ${pengaduan.createdAt}) > coalesce(${pengaduan.dibacaGuruPada}, 'epoch'::timestamptz)`,
    })
    .from(pengaduan)
    .innerJoin(kategoriMasalah, eq(kategoriMasalah.id, pengaduan.kategoriId))
    .leftJoin(siswa, eq(siswa.id, pengaduan.siswaId))
    .leftJoin(siswaUser, eq(siswaUser.id, siswa.userId))
    .leftJoin(kelas, eq(kelas.id, siswa.kelasId))
    .leftJoin(guruBk, eq(guruBk.id, pengaduan.guruBkId))
    .leftJoin(guruUser, eq(guruUser.id, guruBk.userId))
}

type BarisGuru = Awaited<ReturnType<ReturnType<typeof queryPengaduanGuru>["execute"]>>[number]

export type PengirimTampil =
  | { anonim: true; alias: string }
  | { anonim: false; nama: string; nis: string; kelas: string; dariAnonim: boolean }

/**
 * SATU-SATUNYA jalur data aduan ke Guru BK (PRD §6). Identitas hanya ikut bila aduan beridentitas
 * atau siswa sudah memilih membukanya. Hash, ID terenkripsi, dan siswa_id tidak pernah dikembalikan.
 */
export function keTampilanGuru(r: BarisGuru, guruSaya: number | null) {
  const tersembunyi = r.isAnonim && !r.identitasDibukaPada
  const pengirim: PengirimTampil =
    tersembunyi || !r.siswaNama
      ? { anonim: true, alias: r.alias ?? "Siswa Anonim" }
      : { anonim: false, nama: r.siswaNama, nis: r.siswaNis ?? "", kelas: r.siswaKelas ?? "", dariAnonim: r.isAnonim }
  return {
    kodeTiket: r.kodeTiket,
    pengirim,
    kategori: r.kategori,
    judul: r.judul,
    isi: r.isi,
    adaLampiran: !!r.lampiranTipe,
    lampiranTipe: r.lampiranTipe,
    urgensi: r.urgensi,
    status: r.status,
    penanggungJawab: r.guruNama,
    milikSaya: r.guruBkId !== null && r.guruBkId === guruSaya,
    diAntrean: r.guruBkId === null,
    belumDibaca: r.belumDibaca,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
export type PengaduanUntukGuru = ReturnType<typeof keTampilanGuru>

// ================================================================ percakapan

export async function ambilPercakapan(pengaduanId: number | SQL) {
  return db
    .select({
      id: tanggapan.id,
      pengirim: tanggapan.pengirim,
      isi: tanggapan.isi,
      guruNama: users.nama,
      createdAt: tanggapan.createdAt,
    })
    .from(tanggapan)
    .leftJoin(users, eq(users.id, tanggapan.userId))
    .where(eq(tanggapan.pengaduanId, pengaduanId))
    .orderBy(tanggapan.createdAt, tanggapan.id)
}

/** Cari pengaduan milik siswa (lewat hash pengirim). null bila bukan miliknya / tidak ada. */
export async function pengaduanMilikSiswa(kode: string, siswaId: number) {
  const [p] = await db
    .select()
    .from(pengaduan)
    .where(and(eq(pengaduan.kodeTiket, kode), eq(pengaduan.pengirimHash, hashPengirim(siswaId))))
  return p ?? null
}
