import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Status akun: Aktif / Nonaktif / Belum ganti password. */
export function StatusAkun({ aktif, harusGanti }: { aktif: boolean; harusGanti?: boolean }) {
  if (!aktif) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Nonaktif
      </Badge>
    )
  }
  return (
    <Badge
      variant="secondary"
      className={cn(harusGanti ? "bg-warning text-warning-foreground" : "bg-success/10 text-success dark:bg-success/20")}
      title={harusGanti ? "Masih memakai password awal" : undefined}
    >
      {harusGanti ? "Belum login" : "Aktif"}
    </Badge>
  )
}

/** Tampilkan 6281234567890 sebagai 0812-3456-7890. */
export function formatWa(wa: string | null | undefined) {
  if (!wa) return ""
  const lokal = wa.startsWith("62") ? "0" + wa.slice(2) : wa
  return lokal.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3")
}
