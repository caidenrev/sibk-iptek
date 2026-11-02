import "@tanstack/react-start/server-only"
import { env } from "../env"
import { LOGO_EMAIL_CID } from "./logo-email"

// Template pesan. Semua email punya versi HTML (tabel + gaya inline agar aman di Gmail/Outlook)
// dan versi teks biasa. Template notifikasi Sprint 3 ditambahkan di file ini.

const WARNA = { utama: "#007373", teks: "#101d21", redup: "#526065", latar: "#f4f8f8", garis: "#e1e8ea" }

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Kerangka email SIBK. `isi` adalah HTML yang sudah di-escape. */
function kerangka(judul: string, isi: string) {
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(judul)}</title></head>
<body style="margin:0;padding:0;background:${WARNA.latar};font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;color:${WARNA.teks}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WARNA.latar};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${WARNA.garis};border-radius:16px">
<tr><td style="padding:24px 28px 8px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:36px;height:36px;vertical-align:middle"><img src="cid:${LOGO_EMAIL_CID}" width="36" height="37" alt="SIBK" style="display:block;border:0"></td>
    <td style="padding-left:10px;font-size:15px;font-weight:800;letter-spacing:0.5px;color:#0f2a2e">SIBK<br><span style="font-weight:400;color:${WARNA.redup};font-size:12px">SMK IPTEK Tangerang Selatan</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:16px 28px 28px;font-size:15px;line-height:1.6">${isi}</td></tr>
</table>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:${WARNA.redup};line-height:1.5;text-align:center">
Email ini dikirim otomatis oleh Sistem Informasi Bimbingan Konseling SMK IPTEK Tangerang Selatan. Jangan balas email ini.
</p>
</td></tr></table>
</body></html>`
}

const KEPERLUAN = {
  verifikasi_email: { judul: "Kode verifikasi email", alasan: "untuk memastikan email ini milikmu" },
  verifikasi_wa: { judul: "Kode verifikasi WhatsApp", alasan: "untuk memastikan nomor ini milikmu" },
  reset_password: { judul: "Kode reset password", alasan: "untuk membuat password baru" },
} as const

export type KeperluanOtp = keyof typeof KEPERLUAN

export function emailOtp(p: { nama: string; kode: string; keperluan: KeperluanOtp; menit: number }) {
  const k = KEPERLUAN[p.keperluan]
  const sapaan = p.nama.split(" ")[0]
  const subjek = `${p.kode} adalah ${k.judul.toLowerCase()} SIBK`
  const teks = [
    `Halo ${sapaan},`,
    ``,
    `Gunakan kode berikut ${k.alasan}:`,
    ``,
    `    ${p.kode}`,
    ``,
    `Kode berlaku ${p.menit} menit. Jangan berikan kode ini kepada siapa pun, termasuk Guru BK atau admin.`,
    `Kalau kamu tidak meminta kode ini, abaikan email ini; akunmu tetap aman.`,
    ``,
    `SIBK SMK IPTEK Tangerang Selatan`,
    env.APP_URL,
  ].join("\n")
  const html = kerangka(
    k.judul,
    `<h1 style="margin:0 0 8px;font-size:20px">${esc(k.judul)}</h1>
<p style="margin:0 0 20px">Halo ${esc(sapaan)}, gunakan kode berikut ${esc(k.alasan)}:</p>
<div style="margin:0 0 20px;padding:16px;background:${WARNA.latar};border-radius:12px;text-align:center;font-family:Consolas,'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:${WARNA.utama}">${esc(p.kode)}</div>
<p style="margin:0 0 8px">Kode berlaku <b>${p.menit} menit</b>. Jangan berikan kode ini kepada siapa pun, termasuk Guru BK atau admin.</p>
<p style="margin:0;color:${WARNA.redup};font-size:13px">Kalau kamu tidak meminta kode ini, abaikan email ini. Akunmu tetap aman.</p>`
  )
  return { subjek, teks, html }
}

export function waOtp(p: { kode: string; keperluan: KeperluanOtp; menit: number }) {
  const k = KEPERLUAN[p.keperluan]
  return `*${p.kode}* adalah ${k.judul.toLowerCase()} SIBK SMK IPTEK.\n\nBerlaku ${p.menit} menit. Jangan berikan kode ini kepada siapa pun, termasuk Guru BK atau admin.`
}

// ---------------------------------------------------------------- notifikasi Sprint 3

/**
 * Pesan notifikasi umum. Untuk aduan anonim, pemanggil wajib memakai kalimat yang tidak
 * menyebut isi aduan (PRD §5.8): HP siswa bisa dilihat orang lain.
 */
export function pesanNotifikasi(p: { nama: string; judul: string; baris: Array<string>; tautan: string; labelTautan: string }) {
  const sapaan = p.nama.split(" ")[0]
  const url = `${env.APP_URL.replace(/\/$/, "")}${p.tautan}`
  const teks = [`Halo ${sapaan},`, ``, ...p.baris, ``, `${p.labelTautan}: ${url}`, ``, `SIBK SMK IPTEK Tangerang Selatan`].join("\n")
  const html = kerangka(
    p.judul,
    `<h1 style="margin:0 0 8px;font-size:20px">${esc(p.judul)}</h1>
<p style="margin:0 0 12px">Halo ${esc(sapaan)},</p>
${p.baris.map((b) => `<p style="margin:0 0 12px">${esc(b)}</p>`).join("\n")}
<p style="margin:20px 0 0"><a href="${esc(url)}" style="display:inline-block;padding:12px 20px;background:${WARNA.utama};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">${esc(p.labelTautan)}</a></p>`
  )
  const wa = [`*${p.judul}*`, ``, ...p.baris, ``, url].join("\n")
  return { subjek: `${p.judul} · SIBK`, teks, html, wa }
}
