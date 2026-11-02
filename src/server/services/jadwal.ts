import "@tanstack/react-start/server-only"
import { and, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "../db/client"
import { guruBk, jadwalKonseling, kelas, pengaduan, siswa, slotJadwal, users } from "../db/schema"

// Waktu sesi dihitung dari tanggal + jam (waktu lokal WIB) dan dibandingkan dengan jam database,
// bukan jam laptop/server aplikasi (pelajaran dari OTP Sprint 1).
export const MULAI = sql`((${slotJadwal.tanggal} + ${slotJadwal.jamMulai}) at time zone 'Asia/Jakarta')`
export const SELESAI = sql`((${slotJadwal.tanggal} + ${slotJadwal.jamSelesai}) at time zone 'Asia/Jakarta')`
/** Batas pesan & batal: paling lambat 2 jam sebelum sesi (PRD §5.7). */
export const BATAS_JAM = 2
export const AKTIF = sql`${jadwalKonseling.status} in ('menunggu', 'disetujui')`

export const jam5 = (t: string) => t.slice(0, 5)

const siswaUser = alias(users, "siswa_user")
const guruUser = alias(users, "guru_user")

/** Pengajuan beserta slot, siswa, Guru BK, dan aduan terkait. Dipakai daftar siswa & Guru BK. */
export function queryJadwal() {
  return db
    .select({
      id: jadwalKonseling.id,
      status: jadwalKonseling.status,
      topik: jadwalKonseling.topik,
      alasanPenolakan: jadwalKonseling.alasanPenolakan,
      createdAt: jadwalKonseling.createdAt,
      siswaId: jadwalKonseling.siswaId,
      siswaNama: siswaUser.nama,
      siswaNis: siswa.nis,
      siswaKelas: kelas.namaKelas,
      slotId: slotJadwal.id,
      guruBkId: slotJadwal.guruBkId,
      guruNama: guruUser.nama,
      tanggal: slotJadwal.tanggal,
      jamMulai: slotJadwal.jamMulai,
      jamSelesai: slotJadwal.jamSelesai,
      lokasi: slotJadwal.lokasi,
      kodeTiket: pengaduan.kodeTiket,
      judulPengaduan: pengaduan.judul,
      sudahMulai: sql<boolean>`${MULAI} <= now()`,
      sudahLewat: sql<boolean>`${SELESAI} <= now()`,
      masihBisaBatal: sql<boolean>`${MULAI} - interval '${sql.raw(String(BATAS_JAM))} hours' >= now()`,
    })
    .from(jadwalKonseling)
    .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
    .innerJoin(siswa, eq(siswa.id, jadwalKonseling.siswaId))
    .innerJoin(siswaUser, eq(siswaUser.id, siswa.userId))
    .leftJoin(kelas, eq(kelas.id, siswa.kelasId))
    .innerJoin(guruBk, eq(guruBk.id, slotJadwal.guruBkId))
    .innerJoin(guruUser, eq(guruUser.id, guruBk.userId))
    .leftJoin(pengaduan, eq(pengaduan.id, jadwalKonseling.pengaduanId))
}

export type BarisJadwal = Awaited<ReturnType<typeof queryJadwal>>[number]

export function keTampilanJadwal(r: BarisJadwal) {
  return {
    id: r.id,
    status: r.status,
    topik: r.topik,
    alasanPenolakan: r.alasanPenolakan,
    dibuat: r.createdAt,
    siswa: { nama: r.siswaNama, nis: r.siswaNis, kelas: r.siswaKelas ?? "-" },
    guruNama: r.guruNama,
    slot: { tanggal: r.tanggal, jamMulai: jam5(r.jamMulai), jamSelesai: jam5(r.jamSelesai), lokasi: r.lokasi },
    pengaduan: r.kodeTiket ? { kodeTiket: r.kodeTiket, judul: r.judulPengaduan ?? "" } : null,
    sudahMulai: r.sudahMulai,
    sudahLewat: r.sudahLewat,
    masihBisaBatal: r.masihBisaBatal,
  }
}

/** Jadwal milik Guru BK ini (lewat slotnya), dikunci untuk diubah dalam transaksi. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function kunciJadwalGuru(tx: Tx, id: number, guruBkId: number) {
  const [r] = await tx
    .select({
      id: jadwalKonseling.id,
      status: jadwalKonseling.status,
      slotId: jadwalKonseling.slotId,
      sudahMulai: sql<boolean>`${MULAI} <= now()`,
    })
    .from(jadwalKonseling)
    .innerJoin(slotJadwal, eq(slotJadwal.id, jadwalKonseling.slotId))
    .where(and(eq(jadwalKonseling.id, id), eq(slotJadwal.guruBkId, guruBkId)))
    .for("update", { of: jadwalKonseling })
  return r ?? null
}

