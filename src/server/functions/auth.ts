import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import { db } from "../db/client"
import { users } from "../db/schema"
import { lemparDuplikat } from "../db/errors"
import { hashPassword, verifyDummy, verifyPassword } from "../auth/password"
import { catatGagal, cekKunci, resetGagal } from "../auth/rate-limit"
import { buatSesi, hapusSemuaSesi, hapusSesiSaatIni, ipKlien, userDariSesi } from "../auth/session"
import { PesanError, authMw } from "./middleware"
import { gantiPasswordSchema, loginSchema, profilSchema } from "@/lib/validasi"

/** User yang sedang login, atau null. Dipanggil di beforeLoad root. */
export const getSesiFn = createServerFn({ method: "GET" }).handler(() => userDariSesi())

const PESAN_SALAH = "NIS/NIP/username atau password salah."

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const ip = ipKlien()
    const menit = cekKunci(data.username, ip)
    if (menit > 0) {
      throw new PesanError(`Terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.`)
    }

    // Username tidak membedakan huruf besar/kecil (perilaku sama seperti saat memakai MySQL).
    const [u] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${data.username})`)
      .limit(1)
    const cocok = u ? await verifyPassword(data.password, u.password) : await verifyDummy(data.password)

    if (!u || !cocok) {
      const sisa = catatGagal(data.username, ip)
      if (sisa === 0) throw new PesanError(`${PESAN_SALAH} Login dikunci sementara selama 15 menit.`)
      throw new PesanError(sisa <= 2 ? `${PESAN_SALAH} Sisa ${sisa} percobaan.` : PESAN_SALAH)
    }
    if (!u.isActive) throw new PesanError("Akun ini dinonaktifkan. Hubungi admin sekolah.")

    resetGagal(data.username, ip)
    await buatSesi(u.id)
    return { role: u.role, harusGantiPassword: u.harusGantiPassword }
  })

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await hapusSesiSaatIni()
  return { ok: true }
})

export const gantiPasswordFn = createServerFn({ method: "POST" })
  .middleware([authMw])
  .validator(gantiPasswordSchema)
  .handler(async ({ data, context }) => {
    const [u] = await db.select().from(users).where(eq(users.id, context.user.id))
    if (!(await verifyPassword(data.passwordLama, u.password))) {
      throw new PesanError("Password lama salah.")
    }
    if (data.passwordBaru === u.username) {
      throw new PesanError("Password tidak boleh sama dengan NIS/NIP/username.")
    }
    await db
      .update(users)
      .set({ password: await hashPassword(data.passwordBaru), harusGantiPassword: false })
      .where(eq(users.id, u.id))
    // Keluarkan perangkat lain yang mungkin masih login dengan password lama.
    await hapusSemuaSesi(u.id, true)
    return { role: u.role }
  })

export const updateProfilFn = createServerFn({ method: "POST" })
  .middleware([authMw])
  .validator(profilSchema)
  .handler(async ({ data, context }) => {
    try {
      const u = context.user
      const emailBerubah = data.email !== u.email
      const waBerubah = data.noWhatsapp !== u.noWhatsapp
      await db
        .update(users)
        .set({
          email: data.email,
          noWhatsapp: data.noWhatsapp,
          // Kontak baru yang diisi sendiri harus dikonfirmasi lewat kode OTP sebelum dipakai.
          ...(emailBerubah && { emailTerverifikasiPada: null }),
          ...(waBerubah && { waTerverifikasiPada: null }),
        })
        .where(eq(users.id, u.id))
      return { emailBerubah: emailBerubah && !!data.email, waBerubah: waBerubah && !!data.noWhatsapp }
    } catch (e) {
      lemparDuplikat(e, { users_email_unique: "Email ini sudah dipakai akun lain." })
    }
  })
