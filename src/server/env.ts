import "@tanstack/react-start/server-only"
import { z } from "zod"

const key32 = z
  .string()
  .min(1, "wajib diisi")
  .refine((v) => Buffer.from(v, "base64").length === 32, "harus 32 byte dalam base64")

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_ENC_KEY: key32,
  APP_HMAC_KEY: key32,
  SESSION_SECRET: key32,
  APP_TZ: z.string().default("Asia/Jakarta"),

  // Email (SMTP). Kosong = mode log: email tidak dikirim, isinya dicetak di log server (untuk pengembangan).
  // Resend: host smtp.resend.com, port 465, user "resend", pass = API key Resend.
  // Gmail : host smtp.gmail.com, port 465, user = alamat Gmail, pass = App Password.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("SIBK SMK IPTEK <sibk@localhost>"),
  MAIL_REPLY_TO: z.string().optional(),

  // Penyimpanan lampiran. Bila keduanya diisi → Supabase Storage (bucket privat "lampiran");
  // bila kosong → folder lokal storage/lampiran (hanya untuk pengembangan; tidak bertahan di Vercel).
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),

  // WhatsApp (Fonnte). Kosong = kanal WhatsApp tidak tersedia (mode log saat pengembangan).
  FONNTE_TOKEN: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const detail = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")
  throw new Error(`Konfigurasi .env tidak valid:\n${detail}\nLihat .env.example.`)
}

export const env = parsed.data
