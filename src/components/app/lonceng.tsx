import { Link, useRouter } from "@tanstack/react-router"
import { Bell, CalendarCheck2, CalendarClock, CalendarX2, Inbox, MessageSquareText } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelatif } from "@/lib/format"
import { cn } from "@/lib/utils"
import { daftarPemberitahuanFn, tandaiPemberitahuanFn } from "@/server/functions/notifikasi"

type Daftar = Awaited<ReturnType<typeof daftarPemberitahuanFn>>

const IKON: Record<string, typeof Bell> = {
  pengaduan_baru: Inbox,
  tanggapan: MessageSquareText,
  pengajuan_jadwal: CalendarClock,
  konfirmasi: CalendarCheck2,
  penolakan: CalendarX2,
  pembatalan: CalendarX2,
  pengingat_h1: Bell,
  pengingat_1jam: Bell,
}

/**
 * Lonceng notifikasi di header. Jumlah belum dibaca datang dari loader layout (ikut disegarkan
 * pemantau data baru). Daftar diambil saat lonceng dibuka, lalu semuanya ditandai sudah dibaca.
 */
export function Lonceng({ belumDibaca = 0 }: { belumDibaca?: number }) {
  const router = useRouter()
  const [buka, setBuka] = useState(false)
  const [data, setData] = useState<(Daftar & { geser: number }) | null>(null)
  const [gagal, setGagal] = useState(false)
  // Angka langsung hilang setelah ditandai dibaca, tanpa menunggu data layout dimuat ulang.
  // Muncul lagi begitu jumlah dari server berubah (ada notifikasi baru).
  const [disembunyikan, setDisembunyikan] = useState(false)
  useEffect(() => setDisembunyikan(false), [belumDibaca])
  const angka = disembunyikan ? 0 : belumDibaca
  const daftar = data?.item ?? null
  // Selisih jam perangkat dengan server, supaya "Baru saja" tidak tampil sebagai "2 menit lalu".
  const geser = data?.geser ?? 0

  async function muat() {
    setGagal(false)
    try {
      const d = await daftarPemberitahuanFn()
      setData({ ...d, geser: d.sekarang - Date.now() })
      if (d.item.some((x) => !x.dibaca)) {
        await tandaiPemberitahuanFn()
        setDisembunyikan(true)
        void router.invalidate()
      }
    } catch {
      setGagal(true)
    }
  }

  return (
    <Popover
      open={buka}
      onOpenChange={(v) => {
        setBuka(v)
        if (v) void muat()
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative max-md:size-11" aria-label={angka ? `Notifikasi, ${angka} belum dibaca` : "Notifikasi"}>
          <Bell />
          {angka > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground ring-2 ring-background tabular-nums"
            >
              {angka > 9 ? "9+" : angka}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifikasi</div>
        {daftar === null && !gagal ? (
          <div className="grid gap-3 p-4" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : gagal ? (
          <div className="grid justify-items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            Notifikasi gagal dimuat.
            <Button variant="outline" size="sm" onClick={() => void muat()}>
              Coba lagi
            </Button>
          </div>
        ) : daftar && daftar.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>Belum ada notifikasi</EmptyTitle>
              <EmptyDescription>Tanggapan dan pengingat jadwal akan muncul di sini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="max-h-[min(26rem,70vh)] overflow-y-auto py-1">
            {daftar?.map((n) => {
              const Ikon = IKON[n.jenis] ?? Bell
              return (
                <li key={n.id}>
                  <Link
                    to={n.tautan}
                    onClick={() => setBuka(false)}
                    className={cn(
                      "flex gap-3 px-4 py-3 outline-none hover:bg-muted/60 focus-visible:bg-muted/60",
                      !n.dibaca && "bg-primary/5 dark:bg-primary/10"
                    )}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <Ikon className="size-4" aria-hidden />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{n.judul}</span>
                        {!n.dibaca && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />}
                      </span>
                      <span className="text-sm text-muted-foreground">{n.isi}</span>
                      <span className="text-xs text-muted-foreground">{formatRelatif(n.waktu, Date.now() + geser)}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
