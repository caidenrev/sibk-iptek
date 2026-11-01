import { useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Garis tipis di atas layar saat pindah halaman masih menunggu data.
 * Muncul setelah 120 ms supaya perpindahan yang cepat tidak berkedip,
 * dan tidak muncul saat data disegarkan di latar (alamat halaman tidak berubah).
 */
export function IndikatorMuat() {
  const pindah = useRouterState({
    select: (s) => s.status === "pending" && s.location.href !== s.resolvedLocation?.href,
  })
  const [tampil, setTampil] = useState(false)

  useEffect(() => {
    if (!pindah) {
      setTampil(false)
      return
    }
    const t = setTimeout(() => setTampil(true), 120)
    return () => clearTimeout(t)
  }, [pindah])

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200",
        tampil ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="h-full w-full bg-primary motion-safe:w-2/5 motion-safe:animate-[sibk-muat_1.1s_ease-in-out_infinite]" />
    </div>
  )
}
