// Fungsi kriptografi murni (tanpa env) agar bisa diuji. Pembungkus berkunci ada di ./index.ts.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt } from "node:crypto"

/**
 * AES-256-GCM. Keluaran: base64(iv 12 byte | tag 16 byte | ciphertext).
 * IV acak setiap kali, jadi teks yang sama menghasilkan ciphertext berbeda (tidak bisa dicocokkan).
 */
export function enkripsiDengan(kunci: Buffer, teks: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", kunci, iv)
  const isi = Buffer.concat([c.update(teks, "utf8"), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), isi]).toString("base64")
}

/** Kebalikan enkripsiDengan. Melempar error bila data diubah atau kunci salah (tag GCM tidak cocok). */
export function dekripsiDengan(kunci: Buffer, sandi: string): string {
  const b = Buffer.from(sandi, "base64")
  const d = createDecipheriv("aes-256-gcm", kunci, b.subarray(0, 12))
  d.setAuthTag(b.subarray(12, 28))
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")
}

/**
 * Hash pengirim: deterministik (siswa yang sama → hash sama, untuk riwayat), tetapi tidak bisa
 * dibalik menjadi ID siswa tanpa kunci HMAC. Diberi awalan agar tidak bisa dipakai ulang untuk keperluan lain.
 */
export function hashPengirimDengan(kunci: Buffer, siswaId: number): string {
  return createHmac("sha256", kunci).update(`pengirim:${siswaId}`).digest("hex")
}

// Tanpa huruf/angka yang mirip (O/0, I/1/L) agar mudah dibaca & diketik ulang.
const ABJAD_TIKET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/** Contoh: BK-7F3K9Q */
export function buatKodeTiket(): string {
  let s = "BK-"
  for (let i = 0; i < 6; i++) s += ABJAD_TIKET[randomInt(ABJAD_TIKET.length)]
  return s
}

const ALIAS = ["Teal", "Amber", "Lavender", "Mint", "Coral", "Sky", "Sage", "Pearl", "Jade", "Indigo", "Rose", "Olive", "Hazel", "Ivory"]

/** Nama samaran yang ditampilkan ke Guru BK untuk aduan anonim. Contoh: "Siswa Teal-42" */
export function buatAlias(): string {
  return `Siswa ${ALIAS[randomInt(ALIAS.length)]}-${randomInt(10, 100)}`
}
