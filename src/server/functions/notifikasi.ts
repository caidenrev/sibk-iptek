// Pengaturan & log notifikasi (Sprint 3 · tugas 3.7, 3.10, 3.11).
import { createServerFn } from "@tanstack/react-start"
import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client"
import { KANAL, STATUS_NOTIF, notifikasi, pemberitahuan, users } from "../db/schema"
import { env } from "../env"
import { emailAktif } from "../notif/kirim"
import { catatNotifikasi, hasilNotifikasi, kirimAntrean, kirimTesKe, kirimUlang, ujiFonnte } from "../services/notifikasi"
import { KUNCI_FONNTE, ambilPengaturan, simpanPengaturan, tokenFonnte } from "../services/pengaturan"
import { PesanError, adminMw, authMw } from "./middleware"
import { emailSchema, idSchema, waSchema } from "@/lib/validasi"
import { samarkanEmail, samarkanWa } from "@/lib/samarkan"

// ================================================================ admin: pengaturan (3.7)

export const statusNotifikasiFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .handler(async () => {
    const token = await tokenFonnte()
    const cronTerakhir = await ambilPengaturan("cron.terakhir")
    const domain = env.MAIL_FROM.match(/@([^>\s]+)/)?.[1] ?? null
    return {
      email: { aktif: emailAktif(), host: env.SMTP_HOST ?? null, domain },
      wa: {
        aktif: !!token.nilai,
        sumber: token.sumber,
        // Hanya 4 karakter terakhir yang dikirim ke browser.
        ujung: token.nilai ? token.nilai.slice(-4) : null,
      },
      cron: { kunciDiisi: !!env.CRON_SECRET, terakhir: cronTerakhir, url: `${env.APP_URL.replace(/\/$/, "")}/api/cron` },
      produksi: env.NODE_ENV === "production",
    }
  })

export const simpanTokenFonnteFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ token: z.string().trim().min(10, "Token Fonnte terlalu pendek").max(200).nullable() }))
  .handler(async ({ data }) => {
    if (data.token) {
      const uji = await ujiFonnte(data.token)
      if (!uji.ok) throw new PesanError(`Token ditolak Fonnte: ${uji.pesan}`)
    }
    await simpanPengaturan(KUNCI_FONNTE, data.token, true)
    return { ok: true }
  })

export const ujiFonnteFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .handler(async () => {
    const { nilai } = await tokenFonnte()
    if (!nilai) throw new PesanError("Token Fonnte belum diisi.")
    return ujiFonnte(nilai)
  })

export const kirimTesAdminFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(
    z.discriminatedUnion("kanal", [
      z.object({ kanal: z.literal("email"), tujuan: emailSchema.refine((v): v is string => !!v, "Isi alamat email") }),
      z.object({ kanal: z.literal("whatsapp"), tujuan: waSchema.refine((v): v is string => !!v, "Isi nomor WhatsApp") }),
    ])
  )
  .handler(async ({ data, context }) => {
    const [h] = await kirimTesKe(context.user.id, data.kanal, data.tujuan as string, context.user.nama)
    return h
  })

// ================================================================ admin: log (3.10)

const filterLogSchema = z.object({
  kanal: z.enum(KANAL).optional(),
  status: z.enum(STATUS_NOTIF).optional(),
  page: z.number().int().min(1).default(1),
})
const PER_HALAMAN = 30

export const logNotifikasiFn = createServerFn({ method: "GET" })
  .middleware([adminMw])
  .validator(filterLogSchema)
  .handler(async ({ data }) => {
    const syarat: Array<SQL> = []
    if (data.kanal) syarat.push(eq(notifikasi.kanal, data.kanal))
    if (data.status) syarat.push(eq(notifikasi.status, data.status))
    const where = and(...syarat)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: notifikasi.id,
          kanal: notifikasi.kanal,
          jenis: notifikasi.jenis,
          status: notifikasi.status,
          percobaan: notifikasi.percobaan,
          error: notifikasi.errorTerakhir,
          sensitif: notifikasi.isSensitif,
          tujuan: notifikasi.tujuan,
          nama: users.nama,
          dibuat: notifikasi.createdAt,
          dikirim: notifikasi.dikirimPada,
        })
        .from(notifikasi)
        .innerJoin(users, eq(users.id, notifikasi.userId))
        .where(where)
        .orderBy(desc(notifikasi.createdAt), desc(notifikasi.id))
        .limit(PER_HALAMAN)
        .offset((data.page - 1) * PER_HALAMAN),
      db.select({ total: count() }).from(notifikasi).where(where),
    ])
    return {
      // Isi pesan tidak pernah dikirim ke halaman admin. Untuk notifikasi terkait aduan anonim,
      // penerimanya pun disamarkan: tanpa ini admin bisa mencocokkan waktu balasan dengan nama siswa (PRD §5.8).
      rows: rows.map(({ tujuan, nama, sensitif, ...r }) => ({
        ...r,
        sensitif,
        penerima: sensitif ? null : nama,
        tujuan: sensitif ? null : r.kanal === "email" ? samarkanEmail(tujuan) : samarkanWa(tujuan),
      })),
      total,
      page: data.page,
      perHalaman: PER_HALAMAN,
    }
  })

export const kirimUlangFn = createServerFn({ method: "POST" })
  .middleware([adminMw])
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const h = await kirimUlang(data.id)
    if (!h) throw new PesanError("Hanya pesan yang gagal atau dilewati yang bisa dikirim ulang.")
    return h
  })

// ================================================================ profil: kirim tes ke diri sendiri (3.11)

export const tesNotifikasiSayaFn = createServerFn({ method: "POST" })
  .middleware([authMw])
  .handler(async ({ context }) => {
    const ids = await catatNotifikasi({ jenis: "tes", userId: context.user.id })
    if (ids.length === 0) throw new PesanError("Belum ada email atau nomor WhatsApp yang terverifikasi. Verifikasi dulu di atas.")
    await kirimAntrean({ ids })
    return hasilNotifikasi(ids)
  })

// ================================================================ lonceng di aplikasi (siswa & Guru BK)

/** 20 notifikasi terbaru milik user yang login, plus jam server (untuk "5 menit lalu" yang tepat). */
export const daftarPemberitahuanFn = createServerFn({ method: "GET" })
  .middleware([authMw])
  .handler(async ({ context }) => {
    const item = await db
      .select({
        id: pemberitahuan.id,
        jenis: pemberitahuan.jenis,
        judul: pemberitahuan.judul,
        isi: pemberitahuan.isi,
        tautan: pemberitahuan.tautan,
        dibaca: sql<boolean>`${pemberitahuan.dibacaPada} is not null`,
        waktu: pemberitahuan.createdAt,
      })
      .from(pemberitahuan)
      .where(eq(pemberitahuan.userId, context.user.id))
      .orderBy(desc(pemberitahuan.id))
      .limit(20)
    // Waktu dibuat berasal dari jam database; "sekarang" juga diambil dari sana supaya selisihnya tepat.
    const [{ sekarang }] = await db.execute<{ sekarang: string }>(sql`select now()::text as sekarang`).then((r) => r.rows)
    return { item, sekarang: new Date(sekarang).getTime() }
  })

/** Tandai semua notifikasi user ini sudah dibaca (saat daftar lonceng dibuka). */
export const tandaiPemberitahuanFn = createServerFn({ method: "POST" })
  .middleware([authMw])
  .handler(async ({ context }) => {
    await db
      .update(pemberitahuan)
      .set({ dibacaPada: sql`now()` })
      .where(and(eq(pemberitahuan.userId, context.user.id), isNull(pemberitahuan.dibacaPada)))
    return { ok: true }
  })
