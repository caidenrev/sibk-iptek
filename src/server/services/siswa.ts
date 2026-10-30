import "@tanstack/react-start/server-only"
import { db } from "../db/client"
import { siswa, users } from "../db/schema"
import { hashPassword } from "../auth/password"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type DataSiswaBaru = {
  nama: string
  nis: string
  kelasId: number
  jenisKelamin: "L" | "P"
  email: string | null
  noWhatsapp: string | null
}

/** Buat akun siswa baru. Password awal = NIS, wajib diganti saat login pertama. */
export async function sisipkanSiswa(tx: Tx | typeof db, d: DataSiswaBaru) {
  const [u] = await tx
    .insert(users)
    .values({
      username: d.nis,
      nama: d.nama,
      email: d.email,
      noWhatsapp: d.noWhatsapp,
      ...verifikasiOlehAdmin(d),
      role: "siswa",
      password: await hashPassword(d.nis),
      harusGantiPassword: true,
    })
    .returning({ id: users.id })
  await tx.insert(siswa).values({ userId: u.id, kelasId: d.kelasId, nis: d.nis, jenisKelamin: d.jenisKelamin })
}

/**
 * Sisipkan banyak siswa dalam SATU transaksi (2 query insert untuk seluruh batch).
 * Penting karena database cloud punya latensi ±200 ms per query; menyisipkan satu per satu
 * membuat import 600 siswa memakan beberapa menit. Bila batch gagal (mis. NIS baru saja dipakai),
 * seluruh batch dibatalkan dan pemanggil mencoba ulang per baris untuk mengetahui baris yang bermasalah.
 */
export async function sisipkanBanyakSiswa(daftar: Array<DataSiswaBaru>) {
  const hash = await Promise.all(daftar.map((d) => hashPassword(d.nis)))
  await db.transaction(async (tx) => {
    const akun = await tx
      .insert(users)
      .values(
        daftar.map((d, i) => ({
          username: d.nis,
          nama: d.nama,
          email: d.email,
          noWhatsapp: d.noWhatsapp,
          ...verifikasiOlehAdmin(d),
          role: "siswa" as const,
          password: hash[i],
          harusGantiPassword: true,
        }))
      )
      .returning({ id: users.id, username: users.username })
    const idPerNis = new Map(akun.map((a) => [a.username, a.id]))
    await tx.insert(siswa).values(
      daftar.map((d) => ({ userId: idPerNis.get(d.nis)!, kelasId: d.kelasId, nis: d.nis, jenisKelamin: d.jenisKelamin }))
    )
  })
}

export function normKelas(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, " ")
}

/** Kontak yang diisi admin dianggap terverifikasi (admin adalah sumber data resmi sekolah). */
export function verifikasiOlehAdmin(k: { email: string | null; noWhatsapp: string | null }) {
  const now = new Date()
  return {
    emailTerverifikasiPada: k.email ? now : null,
    waTerverifikasiPada: k.noWhatsapp ? now : null,
  }
}
