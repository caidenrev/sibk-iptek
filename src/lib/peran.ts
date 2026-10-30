export type Peran = "admin" | "guru_bk" | "siswa"

/** Halaman awal tiap peran setelah login. */
export const BERANDA_PERAN = {
  siswa: "/siswa",
  guru_bk: "/guru",
  admin: "/admin",
} as const satisfies Record<Peran, string>

/** Awalan URL yang menjadi wilayah tiap peran (untuk redirect setelah login). */
export function urlSesuaiPeran(url: string, peran: Peran) {
  if (!url.startsWith("/") || url.startsWith("//")) return false
  if (url === "/profil" || url.startsWith("/profil?")) return true
  const base = BERANDA_PERAN[peran]
  return url === base || url.startsWith(base + "/") || url.startsWith(base + "?")
}
