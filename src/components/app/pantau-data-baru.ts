import { useRouter } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { jejakFn } from "@/server/functions/pengaduan"

/**
 * Menanyakan "ada perubahan?" ke server secara berkala (satu query ringan). Kalau jejaknya berubah
 * (aduan baru, balasan, klaim, ubah status), semua data di halaman dimuat ulang tanpa refresh browser.
 * Berhenti saat tab tidak dilihat; langsung mengecek lagi saat tab kembali dibuka.
 */
export function usePantauDataBaru(aktif: boolean, jedaMs: number) {
  const router = useRouter()
  const jejakTerakhir = useRef<string | null>(null)

  useEffect(() => {
    if (!aktif) return
    let berhenti = false
    let sedangCek = false

    async function cek() {
      if (sedangCek || document.visibilityState !== "visible") return
      sedangCek = true
      try {
        const { jejak } = await jejakFn()
        if (berhenti) return
        const sebelumnya = jejakTerakhir.current
        jejakTerakhir.current = jejak
        if (sebelumnya !== null && sebelumnya !== jejak) await router.invalidate()
      } catch {
        // Gagal sesekali (jaringan putus, sesi habis) tidak perlu ditampilkan; dicoba lagi di putaran berikutnya.
      } finally {
        sedangCek = false
      }
    }

    void cek()
    const timer = setInterval(cek, jedaMs)
    const saatKembali = () => {
      if (document.visibilityState === "visible") void cek()
    }
    document.addEventListener("visibilitychange", saatKembali)
    window.addEventListener("focus", saatKembali)
    return () => {
      berhenti = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", saatKembali)
      window.removeEventListener("focus", saatKembali)
    }
  }, [aktif, jedaMs, router])
}
