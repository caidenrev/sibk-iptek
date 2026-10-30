import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Check, Circle, ShieldCheck, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Status selalu tampil sebagai teks + warna (+ ikon) — docs/DESIGN.md §2 "Warna status"

type Nada = "info" | "primary" | "success" | "destructive" | "muted" | "warning" | "anon"

const NADA: Record<Nada, string> = {
  info: "bg-info/10 text-info dark:bg-info/20",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  success: "bg-success/10 text-success dark:bg-success/20",
  destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  muted: "bg-muted text-muted-foreground",
  warning: "bg-warning text-warning-foreground",
  anon: "bg-anon/10 text-anon dark:bg-anon/20",
}

const STATUS: Record<string, { label: string; nada: Nada; icon: LucideIcon }> = {
  baru: { label: "Baru", nada: "info", icon: Circle },
  menunggu: { label: "Menunggu", nada: "info", icon: Circle },
  diproses: { label: "Diproses", nada: "primary", icon: Circle },
  disetujui: { label: "Disetujui", nada: "primary", icon: Check },
  selesai: { label: "Selesai", nada: "success", icon: Check },
  terkirim: { label: "Terkirim", nada: "success", icon: Check },
  ditolak: { label: "Ditolak", nada: "destructive", icon: X },
  batal: { label: "Dibatalkan", nada: "destructive", icon: X },
  gagal: { label: "Gagal", nada: "destructive", icon: X },
  tidak_hadir: { label: "Tidak hadir", nada: "muted", icon: Circle },
  dilewati: { label: "Dilewati", nada: "muted", icon: Circle },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, nada: "muted" as const, icon: Circle }
  const Icon = s.icon
  return (
    <Badge variant="secondary" className={cn(NADA[s.nada], className)}>
      <Icon data-icon="inline-start" className={cn(Icon === Circle && "fill-current")} aria-hidden />
      {s.label}
    </Badge>
  )
}

export function AnonBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn(NADA.anon, className)}>
      <ShieldCheck data-icon="inline-start" aria-hidden />
      Anonim
    </Badge>
  )
}

const URGENSI = {
  rendah: { label: "Rendah", nada: "muted" as Nada },
  sedang: { label: "Sedang", nada: "info" as Nada },
  tinggi: { label: "Tinggi", nada: "warning" as Nada },
}

export function UrgensiBadge({ urgensi, className }: { urgensi: keyof typeof URGENSI; className?: string }) {
  const u = URGENSI[urgensi]
  return (
    <Badge variant="secondary" className={cn(NADA[u.nada], className)}>
      {urgensi === "tinggi" && <AlertTriangle data-icon="inline-start" aria-hidden />}
      {u.label}
    </Badge>
  )
}

export function KodeTiket({ kode, className }: { kode: string; className?: string }) {
  return <span className={cn("font-mono text-sm font-medium tracking-wider", className)}>{kode}</span>
}
