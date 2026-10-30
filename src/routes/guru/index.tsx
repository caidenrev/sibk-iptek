import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarCheck, Clock, Hourglass, Inbox, Loader } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/app/page-header"
import { AnonBadge, KodeTiket, StatusBadge, UrgensiBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export const Route = createFileRoute("/guru/")({
  head: () => ({ meta: [{ title: "Dashboard Guru BK · SIBK" }] }),
  component: DashboardGuru,
})

// Data contoh Sprint 0 — diganti query sungguhan di Sprint 4.
const STAT = [
  { label: "Aduan baru", nilai: 5, icon: Inbox },
  { label: "Sedang diproses", nilai: 8, icon: Loader },
  { label: "Menunggu persetujuan", nilai: 3, icon: Hourglass },
  { label: "Sesi hari ini", nilai: 2, icon: CalendarCheck },
]

const PER_KATEGORI = [
  { kategori: "Pribadi", jumlah: 12 },
  { kategori: "Sosial", jumlah: 9 },
  { kategori: "Belajar", jumlah: 7 },
  { kategori: "Karier", jumlah: 4 },
]

const chartConfig = { jumlah: { label: "Pengaduan", color: "var(--chart-1)" } } satisfies ChartConfig

const ADUAN_TERBARU = [
  { kode: "BK-Q9W2LZ", pengirim: "Siswa Amber-17", anonim: true, judul: "Merasa tertekan di rumah", urgensi: "tinggi" as const, status: "baru" },
  { kode: "BK-7F3K9Q", pengirim: "Siswa Teal-42", anonim: true, judul: "Sering diejek teman sekelas", urgensi: "sedang" as const, status: "diproses" },
  { kode: "BK-M2P8XA", pengirim: "Rina Aulia · XI RPL 1", anonim: false, judul: "Bingung memilih tempat PKL", urgensi: "rendah" as const, status: "baru" },
]

const AGENDA = [
  { jam: "10.00–10.45", siswa: "Rina Aulia · XI RPL 1", topik: "Konsultasi PKL", lokasi: "Ruang BK 1" },
  { jam: "13.00–13.45", siswa: "Fajar Nugroho · X TKJ 2", topik: "Motivasi belajar", lokasi: "Ruang BK 1" },
]

function DashboardGuru() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" description="Ringkasan layanan BK bulan ini · data contoh (Sprint 0)" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT.map((s) => (
          <Card key={s.label} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardDescription className="flex items-center gap-2">
                <s.icon className="size-4" aria-hidden />
                {s.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <p className="tabular text-3xl font-bold">{s.nilai}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pengaduan per kategori</CardTitle>
            <CardDescription>Oktober 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <BarChart data={PER_KATEGORI} margin={{ left: -16, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="kategori" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="jumlah" fill="var(--color-jumlah)" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda hari ini</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/guru/jadwal">Semua sesi</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {AGENDA.map((a) => (
              <div key={a.jam} className="flex gap-3 rounded-xl border p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="tabular font-semibold">{a.jam} WIB</p>
                  <p className="truncate">{a.siswa}</p>
                  <p className="truncate text-muted-foreground">
                    {a.topik} · {a.lokasi}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pengaduan terbaru</CardTitle>
          <CardDescription>Urgensi tinggi ditampilkan paling atas.</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link to="/guru/pengaduan">Lihat semua</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <ul className="divide-y">
            {ADUAN_TERBARU.map((a) => (
              <li key={a.kode} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex items-center gap-2">
                    <KodeTiket kode={a.kode} className="text-xs text-muted-foreground" />
                    {a.anonim && <AnonBadge />}
                  </div>
                  <p className="mt-0.5 truncate font-medium">{a.judul}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.pengirim}</p>
                </div>
                <UrgensiBadge urgensi={a.urgensi} />
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
