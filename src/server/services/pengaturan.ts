import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import { db } from "../db/client"
import { pengaturan } from "../db/schema"
import { dekripsi, enkripsi } from "../crypto"
import { env } from "../env"

// Pengaturan yang bisa diubah admin dari aplikasi. Nilai rahasia (token) disimpan terenkripsi
// AES-256-GCM dan tidak pernah dikirim kembali ke browser utuh.

export const KUNCI_FONNTE = "fonnte.token"

export async function ambilPengaturan(kunci: string): Promise<string | null> {
  const [r] = await db.select().from(pengaturan).where(eq(pengaturan.kunci, kunci))
  if (!r) return null
  return r.isRahasia ? dekripsi(r.nilai) : r.nilai
}

export async function simpanPengaturan(kunci: string, nilai: string | null, rahasia: boolean) {
  if (nilai === null) {
    await db.delete(pengaturan).where(eq(pengaturan.kunci, kunci))
  } else {
    const isi = rahasia ? enkripsi(nilai) : nilai
    await db
      .insert(pengaturan)
      .values({ kunci, nilai: isi, isRahasia: rahasia })
      .onConflictDoUpdate({ target: pengaturan.kunci, set: { nilai: isi, isRahasia: rahasia } })
  }
  if (kunci === KUNCI_FONNTE) simpananToken = null
}

// Token dibaca setiap kirim WA; disimpan 60 detik agar tidak query ke database untuk tiap pesan.
let simpananToken: { nilai: string | null; sumber: "admin" | "env" | null; waktu: number } | null = null

/** Token Fonnte: dari halaman admin bila diisi, kalau tidak dari env FONNTE_TOKEN. */
export async function tokenFonnte() {
  if (simpananToken && Date.now() - simpananToken.waktu < 60_000) return simpananToken
  const dariAdmin = await ambilPengaturan(KUNCI_FONNTE).catch(() => null)
  simpananToken = dariAdmin
    ? { nilai: dariAdmin, sumber: "admin", waktu: Date.now() }
    : env.FONNTE_TOKEN
      ? { nilai: env.FONNTE_TOKEN, sumber: "env", waktu: Date.now() }
      : { nilai: null, sumber: null, waktu: Date.now() }
  return simpananToken
}
