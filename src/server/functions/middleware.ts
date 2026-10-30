import { createMiddleware } from "@tanstack/react-start"
import { userDariSesi } from "../auth/session"
import type { Peran } from "../db/schema"
import { PesanError } from "@/lib/errors"

export { PesanError }

/** Wajib login. Menambahkan `context.user` untuk server function. */
export const authMw = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const user = await userDariSesi()
  if (!user) throw new PesanError("Sesi berakhir. Silakan masuk kembali.")
  return next({ context: { user } })
})

function peranMw(...peran: Array<Peran>) {
  return createMiddleware({ type: "function" })
    .middleware([authMw])
    .server(async ({ next, context }) => {
      // RBAC ditegakkan di server: menyembunyikan menu saja tidak cukup (BB-11).
      if (!peran.includes(context.user.role)) throw new PesanError("Akses ditolak.")
      return next()
    })
}

export const adminMw = peranMw("admin")
export const guruMw = peranMw("guru_bk")
export const siswaMw = peranMw("siswa")
export const guruAtauAdminMw = peranMw("guru_bk", "admin")
