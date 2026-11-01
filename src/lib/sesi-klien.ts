import type { SessionUser } from "@/server/auth/session"

// Hasil cek sesi disimpan sebentar di browser, supaya pindah menu tidak selalu menunggu satu
// perjalanan ke database dulu. Keamanan tidak bergantung pada ini: setiap server function tetap
// memeriksa sesi sendiri di server.
const UMUR_MS = 60_000

let simpanan: { user: SessionUser; waktu: number } | null = null

export function sesiTersimpan(): SessionUser | null {
  if (typeof window === "undefined" || !simpanan) return null
  if (Date.now() - simpanan.waktu > UMUR_MS) {
    simpanan = null
    return null
  }
  return simpanan.user
}

/** Hanya user yang sudah login disimpan; "belum login" selalu dicek ulang ke server. */
export function simpanSesi(user: SessionUser | null) {
  if (typeof window === "undefined") return
  simpanan = user ? { user, waktu: Date.now() } : null
}

/** Panggil setelah login, logout, ganti password, atau perubahan data akun. */
export function lupakanSesi() {
  simpanan = null
}
