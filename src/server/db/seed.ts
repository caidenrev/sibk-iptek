// Seed data awal untuk pengembangan & demo Sprint Review.
// Jalankan: pnpm db:seed   (aman dijalankan ulang — data yang sudah ada dilewati)
//
// AKUN UJI (hanya untuk lingkungan pengembangan):
//   admin              / Admin12345     → Admin
//   198702122019032001 / Guru12345      → Guru BK (Dewi Lestari)
//   198905172020121002 / Guru12345      → Guru BK (Ahmad Fauzi)
//   232410001          / Siswa12345     → Siswa (Rina Aulia, XI RPL 1), sudah ganti password
//   232410002 … 232410010 / <NIS>       → Siswa, password awal = NIS, wajib ganti saat login pertama
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { opsiPool } from "./pool-config"
import * as s from "./schema"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL belum diisi di .env")

const pool = new Pool(opsiPool(url))
const db = drizzle(pool, { schema: s })

const hash = (p: string) => bcrypt.hash(p, 10)

async function userAda(username: string) {
  const [u] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.username, username))
  return u?.id
}

async function buatUser(data: Omit<typeof s.users.$inferInsert, "password"> & { passwordPolos: string }) {
  const ada = await userAda(data.username)
  if (ada) return { id: ada, baru: false }
  const { passwordPolos, ...rest } = data
  const [r] = await db.insert(s.users).values({ ...rest, password: await hash(passwordPolos) }).returning({ id: s.users.id })
  return { id: r.id, baru: true }
}

async function main() {
  // Kategori (2.2.1: empat bidang layanan BK)
  const kategori = [
    ["Pribadi", "Masalah diri sendiri: emosi, kepercayaan diri, kesehatan mental, keluarga."],
    ["Sosial", "Hubungan dengan teman, perundungan (bullying), pergaulan, konflik."],
    ["Belajar", "Kesulitan belajar, motivasi, nilai, kehadiran."],
    ["Karier", "Pilihan PKL, jurusan lanjutan, pekerjaan setelah lulus."],
  ] as const
  for (const [namaKategori, deskripsi] of kategori) {
    const [ada] = await db.select({ id: s.kategoriMasalah.id }).from(s.kategoriMasalah).where(eq(s.kategoriMasalah.namaKategori, namaKategori))
    if (!ada) await db.insert(s.kategoriMasalah).values({ namaKategori, deskripsi })
  }

  // Admin
  await buatUser({ username: "admin", nama: "Admin Sekolah", role: "admin", passwordPolos: "Admin12345", email: "admin@smkiptek.sch.id" })

  // Guru BK
  const guruData = [
    { nip: "198702122019032001", nama: "Dewi Lestari", email: "dewi.bk@smkiptek.sch.id", wa: "6281200000001" },
    { nip: "198905172020121002", nama: "Ahmad Fauzi", email: "ahmad.bk@smkiptek.sch.id", wa: "6281200000002" },
  ]
  const guruIds: Array<number> = []
  for (const g of guruData) {
    const u = await buatUser({ username: g.nip, nama: g.nama, role: "guru_bk", passwordPolos: "Guru12345", email: g.email, noWhatsapp: g.wa })
    const [ada] = await db.select().from(s.guruBk).where(eq(s.guruBk.userId, u.id))
    if (ada) guruIds.push(ada.id)
    else {
      const [r] = await db.insert(s.guruBk).values({ userId: u.id, nip: g.nip }).returning({ id: s.guruBk.id })
      guruIds.push(r.id)
    }
  }

  // Kelas
  const kelasData = [
    { namaKelas: "X TKJ 2", jurusan: "Teknik Komputer dan Jaringan", guruBkId: guruIds[1] },
    { namaKelas: "XI RPL 1", jurusan: "Rekayasa Perangkat Lunak", guruBkId: guruIds[0] },
    { namaKelas: "XII AKL 1", jurusan: "Akuntansi dan Keuangan Lembaga", guruBkId: guruIds[0] },
  ]
  const kelasId: Record<string, number> = {}
  for (const k of kelasData) {
    await db.insert(s.kelas).values(k).onConflictDoNothing({ target: s.kelas.namaKelas })
    const [row] = await db.select().from(s.kelas).where(eq(s.kelas.namaKelas, k.namaKelas))
    kelasId[k.namaKelas] = row.id
  }

  // Siswa
  const siswaData: Array<[string, string, "L" | "P", string]> = [
    ["232410001", "Rina Aulia", "P", "XI RPL 1"],
    ["232410002", "Fajar Nugroho", "L", "X TKJ 2"],
    ["232410003", "Siti Rahmawati", "P", "XI RPL 1"],
    ["232410004", "Bagas Pratama", "L", "XI RPL 1"],
    ["232410005", "Nabila Putri", "P", "XII AKL 1"],
    ["232410006", "Dimas Saputra", "L", "X TKJ 2"],
    ["232410007", "Aulia Rahma", "P", "XII AKL 1"],
    ["232410008", "Rizky Maulana", "L", "X TKJ 2"],
    ["232410009", "Putri Ayu", "P", "XI RPL 1"],
    ["232410010", "Yoga Firmansyah", "L", "XII AKL 1"],
  ]
  let siswaBaru = 0
  for (const [i, [nis, nama, jk, kls]] of siswaData.entries()) {
    const pertama = i === 0
    const u = await buatUser({
      username: nis,
      nama,
      role: "siswa",
      passwordPolos: pertama ? "Siswa12345" : nis,
      harusGantiPassword: !pertama,
      noWhatsapp: pertama ? "6281200000101" : null,
      email: pertama ? "rina.aulia@siswa.smkiptek.sch.id" : null,
    })
    if (u.baru) {
      await db.insert(s.siswa).values({ userId: u.id, kelasId: kelasId[kls], nis, jenisKelamin: jk })
      siswaBaru++
    }
  }

  console.log(`Seed selesai: 4 kategori, 1 admin, ${guruIds.length} Guru BK, ${kelasData.length} kelas, ${siswaBaru} siswa baru.`)
  console.log("Akun uji tercantum di bagian atas src/server/db/seed.ts")
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
