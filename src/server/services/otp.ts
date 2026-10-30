import "@tanstack/react-start/server-only"
import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm"
import { db } from "../db/client"
import { kodeOtp } from "../db/schema"
import { env } from "../env"
import { kirimEmail, kirimWhatsapp } from "../notif/kirim"
import { emailOtp, waOtp } from "../notif/template"
import type { KeperluanOtp } from "../notif/template"
import { PesanError } from "@/lib/errors"

export const OTP_MENIT = 10
const MAKS_SALAH = 5
const JEDA_DETIK = 60
const MAKS_PER_JAM = 5

export type KanalOtp = "email" | "whatsapp"

const kunci = Buffer.from(env.APP_HMAC_KEY, "base64")
/** Kode disimpan sebagai HMAC (bukan teks asli) dan diikat ke user + keperluan + tujuan. */
const hashKode = (userId: number, keperluan: KeperluanOtp, tujuan: string, kode: string) =>
  createHmac("sha256", kunci).update(`${userId}|${keperluan}|${tujuan}|${kode}`).digest("hex")

/** Buat kode baru (membatalkan kode lama untuk keperluan yang sama) lalu kirim ke tujuan. */
export async function kirimOtp(p: {
  userId: number
  nama: string
  keperluan: KeperluanOtp
  kanal: KanalOtp
  tujuan: string
}) {
  // Semua perhitungan waktu memakai jam DATABASE (now()), bukan jam server aplikasi.
  // Jam laptop/VPS bisa meleset beberapa menit dari jam database; mencampur keduanya
  // pernah membuat jeda 60 detik tidak bekerja (kode terkirim dua kali).
  const riwayat = await db
    .select({
      sisaJeda: sql<number>`ceil(${JEDA_DETIK} - extract(epoch from (now() - ${kodeOtp.createdAt})))`.mapWith(Number),
    })
    .from(kodeOtp)
    .where(
      and(
        eq(kodeOtp.userId, p.userId),
        eq(kodeOtp.keperluan, p.keperluan),
        gt(kodeOtp.createdAt, sql`now() - interval '1 hour'`)
      )
    )
    .orderBy(desc(kodeOtp.createdAt))

  if (riwayat.length > 0 && riwayat[0].sisaJeda > 0) {
    throw new PesanError(`Tunggu ${riwayat[0].sisaJeda} detik sebelum meminta kode baru.`)
  }
  if (riwayat.length >= MAKS_PER_JAM) {
    throw new PesanError("Terlalu banyak permintaan kode. Coba lagi dalam 1 jam.")
  }

  // Batalkan kode lama yang belum dipakai.
  await db
    .update(kodeOtp)
    .set({ dipakaiPada: sql`now()` })
    .where(and(eq(kodeOtp.userId, p.userId), eq(kodeOtp.keperluan, p.keperluan), isNull(kodeOtp.dipakaiPada)))

  const kode = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const [baris] = await db
    .insert(kodeOtp)
    .values({
      userId: p.userId,
      keperluan: p.keperluan,
      kanal: p.kanal,
      tujuan: p.tujuan,
      kodeHash: hashKode(p.userId, p.keperluan, p.tujuan, kode),
      kedaluwarsaPada: sql`now() + make_interval(mins => ${OTP_MENIT})`,
    })
    .returning({ id: kodeOtp.id })

  const hasil =
    p.kanal === "email"
      ? await kirimEmail({ ke: p.tujuan, ...emailOtp({ nama: p.nama, kode, keperluan: p.keperluan, menit: OTP_MENIT }) })
      : await kirimWhatsapp({ ke: p.tujuan, pesan: waOtp({ kode, keperluan: p.keperluan, menit: OTP_MENIT }) })

  if (!hasil.ok) {
    await db.delete(kodeOtp).where(eq(kodeOtp.id, baris.id))
    throw new PesanError(
      p.kanal === "email"
        ? "Kode gagal dikirim ke email. Coba lagi beberapa saat lagi."
        : "Kode gagal dikirim ke WhatsApp. Coba lagi atau pilih email."
    )
  }
  return { menit: OTP_MENIT }
}

/**
 * Periksa kode. Berhasil → kode ditandai terpakai dan mengembalikan kanal-nya.
 * Kode hanya berlaku untuk tujuan (email/nomor) yang sama dengan saat dikirim.
 */
export async function cekOtp(p: { userId: number; keperluan: KeperluanOtp; kode: string; tujuan?: string }) {
  const [baris] = await db
    .select()
    .from(kodeOtp)
    .where(
      and(
        eq(kodeOtp.userId, p.userId),
        eq(kodeOtp.keperluan, p.keperluan),
        isNull(kodeOtp.dipakaiPada),
        gt(kodeOtp.kedaluwarsaPada, sql`now()`)
      )
    )
    .orderBy(desc(kodeOtp.createdAt))
    .limit(1)

  if (!baris || (p.tujuan && baris.tujuan !== p.tujuan)) {
    throw new PesanError("Kode sudah tidak berlaku. Minta kode baru.")
  }

  const [naik] = await db
    .update(kodeOtp)
    .set({ percobaan: sql`${kodeOtp.percobaan} + 1` })
    .where(eq(kodeOtp.id, baris.id))
    .returning({ percobaan: kodeOtp.percobaan })

  const harapan = Buffer.from(baris.kodeHash, "hex")
  const masuk = Buffer.from(hashKode(p.userId, p.keperluan, baris.tujuan, p.kode.trim()), "hex")
  const cocok = harapan.length === masuk.length && timingSafeEqual(harapan, masuk)

  if (!cocok) {
    if (naik.percobaan >= MAKS_SALAH) {
      await db.update(kodeOtp).set({ dipakaiPada: sql`now()` }).where(eq(kodeOtp.id, baris.id))
      throw new PesanError("Kode salah 5 kali. Minta kode baru.")
    }
    throw new PesanError(`Kode salah. Sisa ${MAKS_SALAH - naik.percobaan} percobaan.`)
  }

  await db.update(kodeOtp).set({ dipakaiPada: sql`now()` }).where(eq(kodeOtp.id, baris.id))
  return { kanal: baris.kanal, tujuan: baris.tujuan }
}

export { samarkanEmail, samarkanWa } from "@/lib/samarkan"
