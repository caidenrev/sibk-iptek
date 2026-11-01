import "@tanstack/react-start/server-only"
import { randomBytes } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { env } from "../env"
import { PesanError } from "@/lib/errors"

// Lampiran pengaduan (PRD §5.4, §6).
// - Gambar diproses ulang dengan sharp: metadata EXIF/GPS dibuang, orientasi diterapkan, sisi terpanjang ≤ 2560 px.
// - PDF hanya untuk aduan beridentitas (metadata PDF bisa memuat nama pembuat dokumen).
// - Nama berkas asli tidak disimpan; kunci berkas acak.

export const BATAS_BYTE = 5 * 1024 * 1024
const GAMBAR = new Set(["image/jpeg", "image/png", "image/webp"])
const BUCKET = "lampiran"
const FOLDER_LOKAL = path.resolve("storage", BUCKET)

const pakaiSupabase = () => !!(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY)

function headerSupabase(tambahan: Record<string, string> = {}) {
  return { apikey: env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, ...tambahan }
}

/** Kenali tipe dari isi berkas (bukan dari nama/ekstensi yang bisa dipalsukan). */
function tipeDariIsi(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp"
  if (b.length > 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf"
  return null
}

/** Validasi + bersihkan + simpan. Mengembalikan kunci berkas & tipe. */
export async function simpanLampiran(file: File, opsi: { anonim: boolean }) {
  if (file.size > BATAS_BYTE) throw new PesanError("Lampiran maksimal 5 MB.")
  const mentah = Buffer.from(await file.arrayBuffer())
  const tipe = tipeDariIsi(mentah)
  if (!tipe) throw new PesanError("Lampiran harus berupa gambar (JPG, PNG, WEBP) atau PDF.")
  if (tipe === "application/pdf" && opsi.anonim) {
    throw new PesanError("Pengaduan anonim hanya boleh melampirkan gambar. PDF bisa menyimpan nama pembuat dokumen.")
  }

  let isi = mentah
  if (GAMBAR.has(tipe)) {
    try {
      const gambar = sharp(mentah, { failOn: "error" })
        .rotate() // terapkan orientasi EXIF, lalu metadata dibuang (perilaku bawaan sharp tanpa withMetadata)
        .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      isi =
        tipe === "image/png"
          ? await gambar.png({ compressionLevel: 9 }).toBuffer()
          : tipe === "image/webp"
            ? await gambar.webp({ quality: 85 }).toBuffer()
            : await gambar.jpeg({ quality: 85, mozjpeg: true }).toBuffer()
    } catch {
      throw new PesanError("Gambar tidak bisa dibaca. Coba simpan ulang atau pilih gambar lain.")
    }
  }

  const ekstensi = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[tipe]
  const sekarang = new Date()
  const kunci = `${sekarang.getUTCFullYear()}/${String(sekarang.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(16).toString("hex")}.${ekstensi}`

  if (pakaiSupabase()) {
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${kunci}`, {
      method: "POST",
      headers: headerSupabase({ "Content-Type": tipe, "x-upsert": "false" }),
      body: new Uint8Array(isi),
    })
    if (!res.ok) {
      console.error("[lampiran] unggah gagal:", res.status, await res.text().catch(() => ""))
      throw new PesanError("Lampiran gagal diunggah. Coba lagi.")
    }
  } else {
    const tujuan = path.join(FOLDER_LOKAL, kunci)
    await mkdir(path.dirname(tujuan), { recursive: true })
    await writeFile(tujuan, isi)
  }
  return { kunci, tipe }
}

/** Ambil isi berkas. Pemeriksaan hak akses dilakukan pemanggil. */
export async function bacaLampiran(kunci: string): Promise<Buffer | null> {
  if (!/^\d{4}\/\d{2}\/[0-9a-f]{32}\.(jpg|png|webp|pdf)$/.test(kunci)) return null
  if (pakaiSupabase()) {
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${kunci}`, { headers: headerSupabase() })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  }
  try {
    return await readFile(path.join(FOLDER_LOKAL, kunci))
  } catch {
    return null
  }
}
