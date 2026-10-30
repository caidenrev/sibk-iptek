import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarPlus, ChevronRight, Clock, MapPin, MessageSquareHeart } from "lucide-react"

import { AnonBadge, KodeTiket, StatusBadge } from "@/components/app/status-badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatRentangSesi } from "@/lib/format"

export const Route = createFileRoute("/siswa/")({
  head: () => ({ meta: [{ title: "Beranda · SIBK" }] }),
  component: DashboardSiswa,
})

// Data contoh Sprint 0 — diganti query sungguhan di Sprint 2–4.
const CONTOH_ADUAN = [
  { kode: "BK-7F3K9Q", judul: "Sering diejek teman sekelas", status: "diproses", anonim: true, balasanBaru: true },
  { kode: "BK-M2P8XA", judul: "Bingung memilih tempat PKL", status: "baru", anonim: false, balasanBaru: false },
]

const CONTOH_JADWAL = {
  mulai: "2026-11-04T03:00:00Z",
  selesai: "2026-11-04T03:45:00Z",
  guru: "Ibu Dewi Lestari",
  lokasi: "Ruang BK 1",
  status: "disetujui",
}

function DashboardSiswa() {
  const { user } = Route.useRouteContext()
  const nama = user.nama.split(" ")[0]
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Halo, {nama}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ada yang ingin kamu ceritakan hari ini?</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AksiCard
          to="/siswa/pengaduan/baru"
          icon={<MessageSquareHeart className="size-5" />}
          judul="Kirim pengaduan"
          isi="Ceritakan masalahmu, boleh tanpa nama."
          utama
        />
        <AksiCard
          to="/siswa/jadwal/ajukan"
          icon={<CalendarPlus className="size-5" />}
          judul="Ajukan konseling"
          isi="Pilih waktu bertemu Guru BK."
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Jadwal berikutnya</CardTitle>
          <CardAction>
            <StatusBadge status={CONTOH_JADWAL.status} />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            {formatRentangSesi(CONTOH_JADWAL.mulai, CONTOH_JADWAL.selesai)}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {CONTOH_JADWAL.lokasi} · {CONTOH_JADWAL.guru}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pengaduan aktif</CardTitle>
          <CardDescription>Balasan Guru BK muncul di sini.</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link to="/siswa/pengaduan">Lihat semua</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <ul className="divide-y">
            {CONTOH_ADUAN.map((a) => (
              <li key={a.kode}>
                <Link
                  to="/siswa/pengaduan"
                  className="flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted"
                >
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <KodeTiket kode={a.kode} className="text-xs whitespace-nowrap text-muted-foreground" />
                      {a.anonim && <AnonBadge />}
                    </span>
                    <span className="truncate font-medium">{a.judul}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.status} />
                      {a.balasanBaru && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <span className="size-2 rounded-full bg-primary" aria-hidden />
                          Balasan baru
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-muted-foreground">Data di halaman ini masih contoh (Sprint 0).</p>
    </div>
  )
}

function AksiCard({
  to,
  icon,
  judul,
  isi,
  utama,
}: {
  to: "/siswa/pengaduan/baru" | "/siswa/jadwal/ajukan"
  icon: React.ReactNode
  judul: string
  isi: string
  utama?: boolean
}) {
  return (
    <Link
      to={to}
      className={
        utama
          ? "group flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm transition-transform outline-none focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-[0.99]"
          : "group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-colors outline-none hover:bg-muted/50 focus-visible:ring-4 focus-visible:ring-ring/40"
      }
    >
      <span
        className={
          utama
            ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15"
            : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        }
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{judul}</span>
        <span className={utama ? "block text-sm text-primary-foreground/85" : "block text-sm text-muted-foreground"}>
          {isi}
        </span>
      </span>
      <ChevronRight className="size-5 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
