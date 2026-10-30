// Data master untuk admin (KF-13): kelas, Guru BK, kategori masalah, dan aksi akun.
import { createServerFn } from "@tanstack/react-start"
import { asc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client"
import { PESAN_DUPLIKAT_AKUN, lemparDuplikat, masihDipakai } from "../db/errors"
import { guruBk, kategoriMasalah, kelas, siswa, users } from "../db/schema"
import { hashPassword } from "../auth/password"
import { verifikasiOlehAdmin } from "../services/siswa"
import { hapusSemuaSesi } from "../auth/session"
import { PesanError, adminMw } from "./middleware"
import { guruSchema, idSchema, kategoriSchema, kelasSchema } from "@/lib/validasi"

// =============================================================== opsi untuk select

export const opsiGuruFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(() =>
    db
      .select({ id: guruBk.id, nama: users.nama, aktif: users.isActive })
      .from(guruBk)
      .innerJoin(users, eq(users.id, guruBk.userId))
      .orderBy(asc(users.nama))
  )

export const opsiKelasFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(() => db.select({ id: kelas.id, nama: kelas.namaKelas }).from(kelas).orderBy(asc(kelas.namaKelas)))

// =============================================================== kelas

export const daftarKelasFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(() =>
    db
      .select({
        id: kelas.id,
        namaKelas: kelas.namaKelas,
        jurusan: kelas.jurusan,
        guruBkId: kelas.guruBkId,
        pembina: users.nama,
        jumlahSiswa: sql<number>`(select count(*) from ${siswa} where ${siswa.kelasId} = ${kelas.id})`.mapWith(Number),
      })
      .from(kelas)
      .leftJoin(guruBk, eq(guruBk.id, kelas.guruBkId))
      .leftJoin(users, eq(users.id, guruBk.userId))
      .orderBy(asc(kelas.namaKelas))
  )

export const simpanKelasFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(kelasSchema)
  .handler(async ({ data }) => {
    const { id, ...isi } = data
    try {
      if (id) await db.update(kelas).set(isi).where(eq(kelas.id, id))
      else await db.insert(kelas).values(isi)
    } catch (e) {
      lemparDuplikat(e, { kelas_nama_kelas_unique: `Kelas ${isi.namaKelas} sudah ada.` })
    }
    return { ok: true }
  })

export const hapusKelasFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    try {
      await db.delete(kelas).where(eq(kelas.id, data.id))
    } catch (e) {
      if (masihDipakai(e)) throw new PesanError("Kelas masih berisi siswa. Pindahkan siswanya dulu.")
      throw e
    }
    return { ok: true }
  })

// =============================================================== guru BK

export const daftarGuruFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(() =>
    db
      .select({
        id: guruBk.id,
        userId: users.id,
        nama: users.nama,
        nip: guruBk.nip,
        email: users.email,
        noWhatsapp: users.noWhatsapp,
        aktif: users.isActive,
        harusGantiPassword: users.harusGantiPassword,
        jumlahKelas: sql<number>`(select count(*) from ${kelas} where ${kelas.guruBkId} = ${guruBk.id})`.mapWith(Number),
      })
      .from(guruBk)
      .innerJoin(users, eq(users.id, guruBk.userId))
      .orderBy(asc(users.nama))
  )

export const simpanGuruFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(guruSchema)
  .handler(async ({ data }) => {
    try {
      await db.transaction(async (tx) => {
        if (data.id) {
          const [g] = await tx.select().from(guruBk).where(eq(guruBk.id, data.id))
          if (!g) throw new PesanError("Guru BK tidak ditemukan.")
          await tx
            .update(users)
            .set({ nama: data.nama, username: data.nip, email: data.email, noWhatsapp: data.noWhatsapp, ...verifikasiOlehAdmin(data) })
            .where(eq(users.id, g.userId))
          await tx.update(guruBk).set({ nip: data.nip }).where(eq(guruBk.id, g.id))
        } else {
          // Password awal = NIP, wajib diganti saat login pertama.
          const [u] = await tx
            .insert(users)
            .values({
              username: data.nip,
              nama: data.nama,
              email: data.email,
              noWhatsapp: data.noWhatsapp,
              ...verifikasiOlehAdmin(data),
              role: "guru_bk",
              password: await hashPassword(data.nip),
              harusGantiPassword: true,
            })
            .returning({ id: users.id })
          await tx.insert(guruBk).values({ userId: u.id, nip: data.nip })
        }
      })
    } catch (e) {
      lemparDuplikat(e, PESAN_DUPLIKAT_AKUN)
    }
    return { ok: true }
  })

// =============================================================== kategori

export const daftarKategoriFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(() => db.select().from(kategoriMasalah).orderBy(asc(kategoriMasalah.id)))

export const simpanKategoriFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(kategoriSchema)
  .handler(async ({ data }) => {
    const { id, ...isi } = data
    try {
      if (id) await db.update(kategoriMasalah).set(isi).where(eq(kategoriMasalah.id, id))
      else await db.insert(kategoriMasalah).values(isi)
    } catch (e) {
      lemparDuplikat(e, { kategori_masalah_nama_kategori_unique: `Kategori ${isi.namaKategori} sudah ada.` })
    }
    return { ok: true }
  })

export const setKategoriAktifFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ id: idSchema, aktif: z.boolean() }))
  .handler(async ({ data }) => {
    await db.update(kategoriMasalah).set({ isActive: data.aktif }).where(eq(kategoriMasalah.id, data.id))
    return { ok: true }
  })

export const hapusKategoriFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    // Sprint 2: tabel pengaduan memakai FK RESTRICT ke kategori, jadi kategori yang sudah dipakai
    // otomatis tidak bisa dihapus (ditangkap di bawah) — admin cukup menonaktifkannya.
    try {
      await db.delete(kategoriMasalah).where(eq(kategoriMasalah.id, data.id))
    } catch (e) {
      if (masihDipakai(e)) throw new PesanError("Kategori sudah dipakai pengaduan. Nonaktifkan saja.")
      throw e
    }
    return { ok: true }
  })

// =============================================================== aksi akun (guru & siswa)

export const resetPasswordFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ userId: idSchema }))
  .handler(async ({ data, context }) => {
    const [u] = await db.select().from(users).where(eq(users.id, data.userId))
    if (!u) throw new PesanError("Akun tidak ditemukan.")
    if (u.role === "admin") throw new PesanError("Password admin hanya bisa diganti lewat halaman Profil.")
    if (u.id === context.user.id) throw new PesanError("Gunakan halaman Profil untuk akunmu sendiri.")
    // Password kembali ke NIS/NIP, wajib diganti saat login berikutnya.
    await db
      .update(users)
      .set({ password: await hashPassword(u.username), harusGantiPassword: true })
      .where(eq(users.id, u.id))
    await hapusSemuaSesi(u.id)
    return { ok: true }
  })

export const setAkunAktifFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ userId: idSchema, aktif: z.boolean() }))
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) throw new PesanError("Tidak bisa menonaktifkan akunmu sendiri.")
    await db.update(users).set({ isActive: data.aktif }).where(eq(users.id, data.userId))
    if (!data.aktif) await hapusSemuaSesi(data.userId)
    return { ok: true }
  })

// =============================================================== ringkasan dashboard admin

export const ringkasanAdminFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(async () => {
    const [[s], [k], [g]] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(siswa)
        .innerJoin(users, eq(users.id, siswa.userId))
        .where(eq(users.isActive, true)),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(kelas),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(guruBk)
        .innerJoin(users, eq(users.id, guruBk.userId))
        .where(eq(users.isActive, true)),
    ])
    return { siswa: s.n, kelas: k.n, guru: g.n }
  })
