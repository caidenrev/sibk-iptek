// Verifikasi kontak (email/WA) dan lupa password lewat kode OTP.
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "../db/client"
import { users } from "../db/schema"
import { hashPassword } from "../auth/password"
import { buatSesi, hapusSemuaSesi } from "../auth/session"
import { waAktif } from "../notif/kirim"
import { akunUntukReset, batasiIp } from "../services/akun"
import { cekOtp, kirimOtp, samarkanEmail, samarkanWa } from "../services/otp"
import { PesanError, authMw } from "./middleware"
import { kanalOtpSchema, kodeOtpSchema, loginSchema, lupaPasswordResetSchema } from "@/lib/validasi"

// =============================================================== verifikasi kontak (sudah login)

export const kirimKodeVerifikasiFn = createServerFn({ method: "POST" })
  .middleware([authMw])
  .validator(z.object({ kanal: kanalOtpSchema }))
  .handler(async ({ data, context }) => {
    const u = context.user
    if (data.kanal === "email") {
      if (!u.email) throw new PesanError("Isi email di profil terlebih dahulu.")
      if (u.emailTerverifikasi) throw new PesanError("Email ini sudah terverifikasi.")
      return kirimOtp({ userId: u.id, nama: u.nama, keperluan: "verifikasi_email", kanal: "email", tujuan: u.email })
    }
    if (!u.noWhatsapp) throw new PesanError("Isi nomor WhatsApp di profil terlebih dahulu.")
    if (u.waTerverifikasi) throw new PesanError("Nomor ini sudah terverifikasi.")
    if (!(await waAktif())) throw new PesanError("Pengiriman WhatsApp belum diaktifkan sekolah.")
    return kirimOtp({ userId: u.id, nama: u.nama, keperluan: "verifikasi_wa", kanal: "whatsapp", tujuan: u.noWhatsapp })
  })

export const konfirmasiVerifikasiFn = createServerFn({ method: "POST" })
  .middleware([authMw])
  .validator(z.object({ kanal: kanalOtpSchema, kode: kodeOtpSchema }))
  .handler(async ({ data, context }) => {
    const u = context.user
    const tujuan = data.kanal === "email" ? u.email : u.noWhatsapp
    if (!tujuan) throw new PesanError("Kontak belum diisi.")
    await cekOtp({
      userId: u.id,
      keperluan: data.kanal === "email" ? "verifikasi_email" : "verifikasi_wa",
      kode: data.kode,
      tujuan, // kode tidak berlaku bila kontak diganti setelah kode dikirim
    })
    await db
      .update(users)
      .set(data.kanal === "email" ? { emailTerverifikasiPada: new Date() } : { waTerverifikasiPada: new Date() })
      .where(eq(users.id, u.id))
    return { ok: true }
  })

// =============================================================== lupa password (belum login)

/** Langkah 1: kanal apa saja yang bisa menerima kode (alamat ditampilkan tersamar). */
export const lupaPasswordCekFn = createServerFn({ method: "POST" })
  .validator(z.object({ username: loginSchema.shape.username }))
  .handler(async ({ data }) => {
    batasiIp("cek")
    const a = await akunUntukReset(data.username)
    const kanal: Array<{ kanal: "email" | "whatsapp"; label: string }> = []
    if (a?.email) kanal.push({ kanal: "email", label: samarkanEmail(a.email) })
    if (a?.wa) kanal.push({ kanal: "whatsapp", label: samarkanWa(a.wa) })
    return { kanal }
  })

/** Langkah 2: kirim kode ke kanal terpilih. */
export const lupaPasswordKirimFn = createServerFn({ method: "POST" })
  .validator(z.object({ username: loginSchema.shape.username, kanal: kanalOtpSchema }))
  .handler(async ({ data }) => {
    batasiIp("kirim")
    const a = await akunUntukReset(data.username)
    const tujuan = data.kanal === "email" ? a?.email : a?.wa
    if (!a || !tujuan) throw new PesanError("Kontak ini tidak bisa dipakai untuk reset password.")
    return kirimOtp({ userId: a.id, nama: a.nama, keperluan: "reset_password", kanal: data.kanal, tujuan })
  })

/** Langkah 3: cek kode, simpan password baru, langsung masuk. */
export const lupaPasswordResetFn = createServerFn({ method: "POST" })
  .validator(lupaPasswordResetSchema)
  .handler(async ({ data }) => {
    batasiIp("reset")
    const a = await akunUntukReset(data.username)
    if (!a) throw new PesanError("Kode sudah tidak berlaku. Minta kode baru.")
    const { kanal } = await cekOtp({ userId: a.id, keperluan: "reset_password", kode: data.kode })

    const [u] = await db
      .update(users)
      .set({
        password: await hashPassword(data.passwordBaru),
        harusGantiPassword: false,
        // Menerima kode membuktikan kontak itu milik pengguna.
        ...(kanal === "email" ? { emailTerverifikasiPada: new Date() } : { waTerverifikasiPada: new Date() }),
      })
      .where(eq(users.id, a.id))
      .returning({ role: users.role })

    await hapusSemuaSesi(a.id) // keluarkan semua perangkat yang memakai password lama
    await buatSesi(a.id)
    return { role: u.role }
  })
