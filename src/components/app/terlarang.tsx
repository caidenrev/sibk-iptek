import { Link } from "@tanstack/react-router"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BERANDA_PERAN } from "@/lib/peran"
import type { Peran } from "@/lib/peran"

/** Halaman 403 — tampil saat peran tidak berhak membuka halaman (BB-11). */
export function Terlarang({ peran }: { peran: Peran }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="size-6" aria-hidden />
      </span>
      <p className="font-mono text-sm text-muted-foreground">403</p>
      <h1 className="text-2xl font-bold">Akses ditolak</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Halaman ini tidak tersedia untuk akunmu. Kalau menurutmu ini keliru, hubungi admin sekolah.
      </p>
      <Button asChild className="mt-2">
        <Link to={BERANDA_PERAN[peran]}>Kembali ke beranda saya</Link>
      </Button>
    </main>
  )
}
