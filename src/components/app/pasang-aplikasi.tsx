import { Download, Share, SquarePlus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { LogoMark } from "./logo"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { pasangAplikasi, useStatusPasang } from "@/lib/pwa"
import { cn } from "@/lib/utils"

/** Tombol "Pasang aplikasi". Tidak tampil bila browser tidak mendukung atau aplikasi sudah terpasang. */
export function TombolPasang({
  className,
  variant = "outline",
  size = "lg",
  label = "Pasang aplikasi",
}: {
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  label?: string
}) {
  const status = useStatusPasang()
  const [petunjuk, setPetunjuk] = useState(false)
  if (status !== "bisa" && status !== "ios") return null
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => (status === "ios" ? setPetunjuk(true) : void pasangAplikasi())}
      >
        <Download data-icon="inline-start" />
        {label}
      </Button>
      <PetunjukIphone open={petunjuk} onOpenChange={setPetunjuk} />
    </>
  )
}

/** Safari di iPhone/iPad tidak punya tombol pasang otomatis; ini langkah manualnya. */
function PetunjukIphone({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pasang SIBK di iPhone</DialogTitle>
          <DialogDescription>Buka halaman ini di Safari, lalu ikuti tiga langkah berikut.</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3 text-sm">
          <Langkah no={1}>
            Ketuk tombol <strong className="font-semibold">Bagikan</strong>{" "}
            <Share className="inline size-4 align-[-3px] text-primary" aria-hidden /> di bagian
            bawah layar.
          </Langkah>
          <Langkah no={2}>
            Gulir, lalu pilih <strong className="font-semibold">Tambah ke Layar Utama</strong>{" "}
            <SquarePlus className="inline size-4 align-[-3px] text-primary" aria-hidden />.
          </Langkah>
          <Langkah no={3}>
            Ketuk <strong className="font-semibold">Tambah</strong>. Ikon SIBK muncul di layar utama HP-mu.
          </Langkah>
        </ol>
        <DialogFooter>
          <Button type="button" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
            Mengerti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Langkah({ no, children }: { no: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {no}
      </span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  )
}

const KUNCI_TUTUP = "sibk-ajakan-pasang-ditutup"
const JEDA_MS = 30 * 24 * 60 * 60 * 1000

/** Ajakan kecil di dashboard. Bisa ditutup; muncul lagi setelah 30 hari bila belum dipasang. */
export function AjakanPasang({ className }: { className?: string }) {
  const status = useStatusPasang()
  const [ditutup, setDitutup] = useState(true)

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(KUNCI_TUTUP) ?? 0)
      setDitutup(Date.now() - t < JEDA_MS)
    } catch {
      setDitutup(false)
    }
  }, [])

  if (ditutup || (status !== "bisa" && status !== "ios")) return null

  const tutup = () => {
    setDitutup(true)
    try {
      localStorage.setItem(KUNCI_TUTUP, String(Date.now()))
    } catch {
      // Penyimpanan diblokir: ajakan hanya tertutup sampai halaman dimuat ulang.
    }
  }

  return (
    <aside
      aria-label="Pasang aplikasi"
      className={cn(
        // HP: [ikon][teks][tutup] lalu tombol Pasang selebar kartu di baris kedua. Layar lebar: satu baris.
        "mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:p-4",
        className
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#007373]">
        <LogoMark warna="terbalik" className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{"Pasang SIBK di HP‑mu"}</p>
        <p className="text-sm text-muted-foreground">Buka dari layar utama, tanpa mengetik alamat web.</p>
      </div>
      <TombolPasang variant="default" size="default" label="Pasang" className="order-last col-span-3 h-11 sm:order-none sm:col-span-1 md:h-9" />
      <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground sm:order-last md:size-9" aria-label="Tutup ajakan pasang aplikasi" onClick={tutup}>
        <X />
      </Button>
    </aside>
  )
}
