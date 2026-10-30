import "@tanstack/react-start/server-only"
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { env } from "../env"
import { LOGO_EMAIL_CID, LOGO_EMAIL_PNG_BASE64 } from "./logo-email"

// Pengirim pesan tingkat rendah: email (SMTP — Resend/Gmail) dan WhatsApp (Fonnte).
// Sprint 3 menambahkan antrean (outbox), percobaan ulang, dan log notifikasi di atas fungsi ini.

export type HasilKirim = { ok: true; mode: "kirim" | "log" } | { ok: false; error: string }

let transporter: Transporter | null = null

export const emailAktif = () => !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
/** WA tersedia bila token Fonnte diisi; di mode pengembangan selalu tersedia (pesan dicetak ke log). */
export const waAktif = () => !!env.FONNTE_TOKEN || env.NODE_ENV !== "production"

function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
  return transporter
}

export async function kirimEmail(p: { ke: string; subjek: string; teks: string; html: string }): Promise<HasilKirim> {
  if (!emailAktif()) {
    if (env.NODE_ENV === "production") return { ok: false, error: "Email belum dikonfigurasi." }
    console.info(`\n[email:log] ke=${p.ke} subjek="${p.subjek}"\n${p.teks}\n`)
    return { ok: true, mode: "log" }
  }
  try {
    await getTransporter().sendMail({
      from: env.MAIL_FROM,
      replyTo: env.MAIL_REPLY_TO,
      to: p.ke,
      subject: p.subjek,
      text: p.teks,
      html: p.html,
      // Logo disisipkan sebagai lampiran inline; template merujuknya dengan src="cid:logo-sibk".
      attachments: p.html.includes(`cid:${LOGO_EMAIL_CID}`)
        ? [{ filename: "sibk.png", content: Buffer.from(LOGO_EMAIL_PNG_BASE64, "base64"), cid: LOGO_EMAIL_CID, contentType: "image/png" }]
        : undefined,
    })
    return { ok: true, mode: "kirim" }
  } catch (e) {
    console.error("[email] gagal:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function kirimWhatsapp(p: { ke: string; pesan: string }): Promise<HasilKirim> {
  if (!env.FONNTE_TOKEN) {
    if (env.NODE_ENV === "production") return { ok: false, error: "WhatsApp belum dikonfigurasi." }
    console.info(`\n[whatsapp:log] ke=${p.ke}\n${p.pesan}\n`)
    return { ok: true, mode: "log" }
  }
  try {
    // https://docs.fonnte.com — POST /send, header Authorization: <token>
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: env.FONNTE_TOKEN },
      body: new URLSearchParams({ target: p.ke, message: p.pesan, countryCode: "62" }),
    })
    const body = (await res.json().catch(() => ({}))) as { status?: boolean; reason?: string; detail?: string }
    if (!res.ok || body.status === false) {
      return { ok: false, error: body.reason ?? body.detail ?? `HTTP ${res.status}` }
    }
    return { ok: true, mode: "kirim" }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
