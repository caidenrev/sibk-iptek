// Skema validasi bersama: dipakai form di browser DAN server function (validasi ulang di server).
import { z } from "zod"

/** Normalisasi nomor WA ke format 62xxxxxxxxxx. Mengembalikan null bila kosong. */
export function normalisasiWa(input: string | null | undefined): string | null {
  if (!input) return null
  let d = input.replace(/\D/g, "")
  if (!d) return null
  if (d.startsWith("0")) d = "62" + d.slice(1)
  else if (d.startsWith("8")) d = "62" + d
  return d
}

const kosongJadiNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)

export const waSchema = z.preprocess(
  kosongJadiNull,
  z
    .string()
    .trim()
    .transform((v) => normalisasiWa(v) ?? "")
    .refine((v) => /^62\d{8,13}$/.test(v), "Nomor WhatsApp tidak valid (contoh: 0812xxxxxxxx)")
    .nullable()
)

export const emailSchema = z.preprocess(
  kosongJadiNull,
  z.string().trim().toLowerCase().email("Format email tidak valid").max(100).nullable()
)

export const namaSchema = z
  .string()
  .trim()
  .min(3, "Nama minimal 3 karakter")
  .max(100, "Nama maksimal 100 karakter")

export const nisSchema = z
  .string()
  .trim()
  .regex(/^\d{4,20}$/, "NIS berupa 4–20 digit angka")

export const nipSchema = z
  .string()
  .trim()
  .regex(/^[0-9A-Za-z.-]{4,30}$/, "NIP 4–30 karakter (angka/huruf)")

export const idSchema = z.number().int().positive()

// ----------------------------------------------------------------- auth

export const loginSchema = z.object({
  username: z.string().trim().min(1, "NIS / NIP / username wajib diisi").max(50),
  password: z.string().min(1, "Password wajib diisi").max(200),
})

export const passwordBaruSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Gunakan kombinasi huruf dan angka")

export const gantiPasswordSchema = z
  .object({
    passwordLama: z.string().min(1, "Password lama wajib diisi"),
    passwordBaru: passwordBaruSchema,
    konfirmasi: z.string(),
  })
  .refine((v) => v.passwordBaru === v.konfirmasi, {
    path: ["konfirmasi"],
    message: "Konfirmasi password tidak sama",
  })
  .refine((v) => v.passwordBaru !== v.passwordLama, {
    path: ["passwordBaru"],
    message: "Password baru harus berbeda dari password lama",
  })

export const profilSchema = z.object({
  email: emailSchema,
  noWhatsapp: waSchema,
})

// ----------------------------------------------------------------- data master

export const kelasSchema = z.object({
  id: idSchema.optional(),
  namaKelas: z.string().trim().toUpperCase().min(2, "Nama kelas wajib diisi").max(30),
  jurusan: z.string().trim().min(2, "Jurusan wajib diisi").max(50),
  guruBkId: idSchema.nullable(),
})

export const guruSchema = z.object({
  id: idSchema.optional(),
  nama: namaSchema,
  nip: nipSchema,
  email: emailSchema,
  noWhatsapp: waSchema,
})

export const kategoriSchema = z.object({
  id: idSchema.optional(),
  namaKategori: z.string().trim().min(3, "Nama kategori minimal 3 karakter").max(50),
  deskripsi: z.preprocess(kosongJadiNull, z.string().trim().max(500).nullable()),
})

export const siswaSchema = z.object({
  id: idSchema.optional(),
  nama: namaSchema,
  nis: nisSchema,
  kelasId: idSchema,
  jenisKelamin: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }),
  email: emailSchema,
  noWhatsapp: waSchema,
})

export type KelasInput = z.input<typeof kelasSchema>
export type GuruInput = z.input<typeof guruSchema>
export type KategoriInput = z.input<typeof kategoriSchema>
export type SiswaInput = z.input<typeof siswaSchema>

// ----------------------------------------------------------------- OTP & lupa password

export const kodeOtpSchema = z.string().trim().regex(/^\d{6}$/, "Kode terdiri dari 6 digit angka")
export const kanalOtpSchema = z.enum(["email", "whatsapp"])

export const lupaPasswordResetSchema = z
  .object({
    username: loginSchema.shape.username,
    kode: kodeOtpSchema,
    passwordBaru: passwordBaruSchema,
    konfirmasi: z.string(),
  })
  .refine((v) => v.passwordBaru === v.konfirmasi, { path: ["konfirmasi"], message: "Konfirmasi password tidak sama" })
  .refine((v) => v.passwordBaru !== v.username.trim(), {
    path: ["passwordBaru"],
    message: "Password tidak boleh sama dengan NIS/NIP/username",
  })

// ----------------------------------------------------------------- pengaduan (Sprint 2)

export const kodeTiketSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^BK-[A-Z0-9]{6}$/, "Kode tiket berformat BK-XXXXXX")

/** Isian formulir pengaduan (lampiran dikirim terpisah sebagai File dalam FormData). */
export const pengaduanSchema = z.object({
  anonim: z.boolean(),
  kategoriId: z.number({ message: "Pilih kategori" }).int().positive("Pilih kategori"),
  urgensi: z.enum(["rendah", "sedang", "tinggi"], { message: "Pilih tingkat urgensi" }),
  judul: z.string().trim().min(5, "Judul minimal 5 karakter").max(150, "Judul maksimal 150 karakter"),
  isi: z
    .string()
    .trim()
    .min(20, "Ceritakan minimal 20 karakter supaya Guru BK bisa memahami masalahnya")
    .max(5000, "Maksimal 5.000 karakter"),
})
export type PengaduanInput = z.input<typeof pengaduanSchema>

export const pesanSchema = z
  .string()
  .trim()
  .min(1, "Tulis pesan terlebih dahulu")
  .max(3000, "Pesan maksimal 3.000 karakter")

export const balasanSchema = z.object({ kode: kodeTiketSchema, isi: pesanSchema })
