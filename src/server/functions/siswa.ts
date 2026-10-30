// Data siswa untuk admin (KF-13) + import Excel/CSV (PRD §5.2).
import { createServerFn } from "@tanstack/react-start"
import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client"
import { PESAN_DUPLIKAT_AKUN, indexDuplikat, lemparDuplikat } from "../db/errors"
import { kelas, siswa, users } from "../db/schema"
import { normKelas, sisipkanBanyakSiswa, sisipkanSiswa, verifikasiOlehAdmin } from "../services/siswa"
import type { DataSiswaBaru } from "../services/siswa"
import { PesanError, adminMw } from "./middleware"
import { siswaSchema } from "@/lib/validasi"
import { barisImportSchema } from "@/lib/import-siswa"

const PER_HALAMAN = 20

export const filterSiswaSchema = z.object({
  q: z.string().trim().max(100).optional(),
  kelasId: z.number().int().positive().optional(),
  status: z.enum(["aktif", "nonaktif", "belum_login"]).optional(),
  page: z.number().int().min(1).default(1),
})

export const daftarSiswaFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .validator(filterSiswaSchema)
  .handler(async ({ data }) => {
    const syarat: Array<SQL | undefined> = []
    if (data.q) {
      const pola = `%${data.q.replace(/[%_\\]/g, "\\$&")}%`
      syarat.push(or(ilike(users.nama, pola), ilike(siswa.nis, pola)))
    }
    if (data.kelasId) syarat.push(eq(siswa.kelasId, data.kelasId))
    if (data.status === "aktif") syarat.push(eq(users.isActive, true))
    if (data.status === "nonaktif") syarat.push(eq(users.isActive, false))
    if (data.status === "belum_login") syarat.push(and(eq(users.isActive, true), eq(users.harusGantiPassword, true)))
    const where = and(...syarat)

    const [{ total }] = await db
      .select({ total: count() })
      .from(siswa)
      .innerJoin(users, eq(users.id, siswa.userId))
      .where(where)

    const rows = await db
      .select({
        id: siswa.id,
        userId: users.id,
        nis: siswa.nis,
        nama: users.nama,
        jenisKelamin: siswa.jenisKelamin,
        kelasId: siswa.kelasId,
        namaKelas: kelas.namaKelas,
        email: users.email,
        noWhatsapp: users.noWhatsapp,
        aktif: users.isActive,
        harusGantiPassword: users.harusGantiPassword,
      })
      .from(siswa)
      .innerJoin(users, eq(users.id, siswa.userId))
      .innerJoin(kelas, eq(kelas.id, siswa.kelasId))
      .where(where)
      .orderBy(asc(kelas.namaKelas), asc(users.nama))
      .limit(PER_HALAMAN)
      .offset((data.page - 1) * PER_HALAMAN)

    return { rows, total, page: data.page, perHalaman: PER_HALAMAN }
  })

export const simpanSiswaFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(siswaSchema)
  .handler(async ({ data }) => {
    try {
      await db.transaction(async (tx) => {
        if (data.id) {
          const [s] = await tx.select().from(siswa).where(eq(siswa.id, data.id))
          if (!s) throw new PesanError("Siswa tidak ditemukan.")
          await tx
            .update(users)
            .set({ nama: data.nama, username: data.nis, email: data.email, noWhatsapp: data.noWhatsapp, ...verifikasiOlehAdmin(data) })
            .where(eq(users.id, s.userId))
          await tx
            .update(siswa)
            .set({ nis: data.nis, kelasId: data.kelasId, jenisKelamin: data.jenisKelamin })
            .where(eq(siswa.id, s.id))
        } else {
          await sisipkanSiswa(tx, data)
        }
      })
    } catch (e) {
      lemparDuplikat(e, PESAN_DUPLIKAT_AKUN)
    }
    return { ok: true }
  })

// =============================================================== import

const MAKS_BARIS = 2000

export type HasilPratinjau = {
  baris: number
  nis: string
  nama: string
  jenisKelamin: string
  kelas: string
  email: string
  noWhatsapp: string
  valid: boolean
  alasan: Array<string>
  /** Data siap simpan (hanya bila valid) */
  data: (DataSiswaBaru & { baris: number }) | null
}

/** Langkah 1: periksa semua baris (format, kelas, duplikat di file & di database). Tidak menyimpan apa pun. */
export const pratinjauImportFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ rows: z.array(z.record(z.string(), z.string())).max(MAKS_BARIS, `Maksimal ${MAKS_BARIS} baris per file.`) }))
  .handler(async ({ data }): Promise<Array<HasilPratinjau>> => {
    const daftarKelas = await db.select({ id: kelas.id, nama: kelas.namaKelas }).from(kelas)
    const petaKelas = new Map(daftarKelas.map((k) => [normKelas(k.nama), k.id]))

    const nisSemua = data.rows.map((r) => (r.nis ?? "").trim()).filter(Boolean)
    const emailSemua = data.rows.map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean)
    const nisAda = new Set(
      nisSemua.length
        ? (await db.select({ u: users.username }).from(users).where(inArray(users.username, nisSemua))).map((r) => r.u)
        : []
    )
    const emailAda = new Set(
      emailSemua.length
        ? (await db.select({ e: users.email }).from(users).where(inArray(users.email, emailSemua))).map((r) => r.e)
        : []
    )

    const nisDiFile = new Map<string, number>()
    const emailDiFile = new Map<string, number>()

    return data.rows.map((r, i) => {
      const baris = i + 2 // baris 1 = judul kolom
      const alasan: Array<string> = []
      const p = barisImportSchema.safeParse(r)
      let hasil: DataSiswaBaru | null = null

      if (!p.success) {
        for (const iss of p.error.issues) alasan.push(iss.message)
      } else {
        const d = p.data
        const kelasId = petaKelas.get(normKelas(d.kelas))
        if (!kelasId) alasan.push(`Kelas "${d.kelas}" belum terdaftar`)
        if (nisAda.has(d.nis)) alasan.push("NIS sudah terdaftar")
        const dupNis = nisDiFile.get(d.nis)
        if (dupNis) alasan.push(`NIS sama dengan baris ${dupNis}`)
        else nisDiFile.set(d.nis, baris)
        if (d.email) {
          if (emailAda.has(d.email)) alasan.push("Email sudah dipakai akun lain")
          const dupEmail = emailDiFile.get(d.email)
          if (dupEmail) alasan.push(`Email sama dengan baris ${dupEmail}`)
          else emailDiFile.set(d.email, baris)
        }
        if (kelasId && alasan.length === 0) {
          hasil = { nama: d.nama, nis: d.nis, kelasId, jenisKelamin: d.jenisKelamin, email: d.email, noWhatsapp: d.noWhatsapp }
        }
      }

      return {
        baris,
        nis: r.nis ?? "",
        nama: r.nama ?? "",
        jenisKelamin: r.jenis_kelamin ?? "",
        kelas: r.kelas ?? "",
        email: r.email ?? "",
        noWhatsapp: r.no_whatsapp ?? "",
        valid: alasan.length === 0,
        alasan,
        data: hasil ? { ...hasil, baris } : null,
      }
    })
  })

/** Langkah 2: simpan satu batch baris valid (dipanggil berulang dari browser agar ada progress). */
export const simpanImportFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(
    z.object({
      rows: z
        .array(siswaSchema.omit({ id: true }).extend({ baris: z.number().int() }))
        .min(1)
        .max(50),
    })
  )
  .handler(async ({ data }) => {
    // Jalur cepat: seluruh batch dalam satu transaksi.
    try {
      await sisipkanBanyakSiswa(data.rows)
      return { berhasil: data.rows.length, gagal: [] as Array<{ baris: number; nis: string; alasan: string }> }
    } catch {
      // Ada baris bermasalah → batch dibatalkan seluruhnya; ulangi per baris untuk menemukan penyebabnya.
    }
    const gagal: Array<{ baris: number; nis: string; alasan: string }> = []
    let berhasil = 0
    for (const r of data.rows) {
      try {
        await db.transaction((tx) => sisipkanSiswa(tx, r))
        berhasil++
      } catch (e) {
        const idx = indexDuplikat(e)
        gagal.push({ baris: r.baris, nis: r.nis, alasan: idx ? (PESAN_DUPLIKAT_AKUN[idx] ?? "Data duplikat") : "Gagal disimpan" })
      }
    }
    return { berhasil, gagal }
  })

