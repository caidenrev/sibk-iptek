import { redirect } from "@tanstack/react-router"
import { createIsomorphicFn } from "@tanstack/react-start"
import { setResponseStatus } from "@tanstack/react-start/server"
import type { Peran } from "./peran"
import type { SessionUser } from "@/server/auth/session"

/** Saat SSR, ubah status HTTP halaman menjadi 403 (BB-11). Di browser tidak melakukan apa pun. */
const tandai403 = createIsomorphicFn()
  .server(() => setResponseStatus(403))
  .client(() => {})

type Ctx = { user: SessionUser | null }
type Loc = { href: string }

/** Wajib login (peran apa pun). Dipakai di beforeLoad. */
export function wajibLogin(ctx: Ctx, location: Loc, opts: { izinkanGantiPassword?: boolean } = {}) {
  const user = ctx.user
  if (!user) throw redirect({ to: "/login", search: { redirect: location.href } })
  if (user.harusGantiPassword && !opts.izinkanGantiPassword) throw redirect({ to: "/ganti-password" })
  return { user }
}

/** Wajib login dengan peran tertentu. Peran lain → halaman 403 (bukan redirect, agar jelas ditolak). */
export function wajibPeran(ctx: Ctx, location: Loc, peran: Peran) {
  const { user } = wajibLogin(ctx, location)
  if (user.role !== peran) {
    tandai403()
    return { user, terlarang: true }
  }
  return { user, terlarang: false }
}
