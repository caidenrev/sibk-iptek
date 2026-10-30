import { cn } from "@/lib/utils"

// Logo SIBK "Bertemu": dua gelembung percakapan — siswa (kiri) dan Guru BK (kanan) — yang
// irisannya menjadi ruang bersama. File master & panduan: docs/brand/.
const GELEMBUNG_KIRI =
  "M88.29 162.04A64 64 0 0 1 76.95 158L38.83 165.17L46 127.05A64 64 0 1 1 167.71 93.96A64 64 0 0 0 88.29 162.04Z"
const GELEMBUNG_KANAN =
  "M167.71 93.96A64 64 0 0 1 210 183.05L217.17 221.17L179.05 214A64 64 0 0 1 88.29 162.04A64 64 0 0 0 167.71 93.96Z"

/**
 * Simbol SIBK.
 * - `warna="merek"` (bawaan): teal + teal muda, otomatis menyesuaikan mode gelap.
 * - `warna="terbalik"`: putih + teal sangat muda, untuk diletakkan di atas latar teal.
 * - `warna="satu"`: satu warna mengikuti `currentColor`.
 */
export function LogoMark({
  className,
  warna = "merek",
}: {
  className?: string
  warna?: "merek" | "terbalik" | "satu"
}) {
  const [kiri, kanan] =
    warna === "merek"
      ? ["fill-logo-1", "fill-logo-2"]
      : warna === "terbalik"
        ? ["fill-white", "fill-[#A7E0DA]"]
        : ["fill-current", "fill-current"]
  return (
    <svg viewBox="34 32 188 194" aria-hidden className={cn("size-8 shrink-0", className)}>
      <path className={kiri} d={GELEMBUNG_KIRI} />
      <path className={kanan} d={GELEMBUNG_KANAN} />
    </svg>
  )
}

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="grid leading-tight">
        <span className="text-[15px] font-extrabold tracking-wide text-logo-teks">SIBK</span>
        {subtitle && <span className="text-xs text-muted-foreground">SMK IPTEK Tangsel</span>}
      </span>
    </span>
  )
}
