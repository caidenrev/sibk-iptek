import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarClock, Clock, Inbox, Loader, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/app/page-header"
import { AnonBadge, KodeTiket, StatusBadge, UrgensiBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { agendaGuruFn } from "@/server/functions/jadwal"
import { ringkasanGuruFn } from "@/server/functions/pengaduan"
import { jamTitik } from "@/lib/format"

export const Route = createFileRoute("/guru/")({
  head: () => ({ meta: [{ title: "Dashboard Guru BK · SIBK" }] }),
  loader: async () => {
    const [ringkasan, agenda] = await Promise.all([ringkasanGuruFn(), agendaGuruFn()])
    return { ...ringkasan, agenda }
  },
  component: DashboardGuru,
})

const chartConfig = { jumlah: { label: "Pengaduan", color: "var(--chart-1)" } } satisfies ChartConfig

const BULAN = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })

function DashboardGuru() {
  const { angka, perKategori, terbaru, agenda } = Route.useLoaderData()
  const stat = [
    { label: "Antrean anonim", nilai: angka.antrean, icon: Users },
    { label: "Aduan baru", nilai: angka.baru, icon: Inbox },
    { label: "Saya proses", nilai: angka.diprosesSaya, icon: Loader },
    { label: "Pengajuan jadwal", nilai: agenda.menunggu, icon: CalendarClock },
  ]
  const totalBulanIni = perKategori.reduce((n, k) => n + k.jumlah, 0)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" description="Ringkasan pengaduan yang masih terbuka." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat.map((s) => (
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
            <CardDescription>
              {BULAN.format(new Date())} · <span className="tabular">{totalBulanIni}</span> pengaduan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalBulanIni === 0 ? (
              <p className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
                Belum ada pengaduan bulan ini.
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                <BarChart data={perKategori} margin={{ left: -16, right: 8 }} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="kategori" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="jumlah" fill="var(--color-jumlah)" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Agenda hari ini</CardTitle>
            <CardDescription>Sesi konseling yang sudah kamu setujui.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-11 md:h-8">
                <Link to="/guru/jadwal" search={{ tab: "disetujui" }}>Semua sesi</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {agenda.hariIni.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada sesi hari ini.
                {agenda.menunggu > 0 && (
                  <>
                    {" "}
                    <Link to="/guru/jadwal" className="font-medium text-primary underline-offset-4 hover:underline">
                      {agenda.menunggu} pengajuan menunggu keputusanmu.
                    </Link>
                  </>
                )}
              </p>
            ) : (
              agenda.hariIni.map((a) => (
                <div key={a.id} className="flex gap-3 rounded-xl border p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="tabular font-semibold">
                      {jamTitik(a.slot.jamMulai)}–{jamTitik(a.slot.jamSelesai)} WIB
                    </p>
                    <p className="truncate">
                      {a.siswa.nama} · {a.siswa.kelas}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {a.topik} · {a.slot.lokasi}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pengaduan terbuka</CardTitle>
          <CardDescription>Urgensi tinggi ditampilkan paling atas.</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm" className="h-11 md:h-8">
              <Link to="/guru/pengaduan" search={{ tab: "semua" }}>Lihat semua</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {terbaru.length === 0 && (
            <p className="px-4 pb-2 text-sm text-muted-foreground">Tidak ada pengaduan terbuka.</p>
          )}
          <ul className="divide-y">
            {terbaru.map((a) => (
              <li key={a.kodeTiket}>
                <Link
                  to="/guru/pengaduan/$kode"
                  params={{ kode: a.kodeTiket }}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex items-center gap-2">
                      {a.belumDibaca && <span className="size-2 rounded-full bg-primary" aria-label="Belum dibaca" />}
                      <KodeTiket kode={a.kodeTiket} className="text-xs text-muted-foreground" />
                      {a.pengirim.anonim && <AnonBadge />}
                    </div>
                    <p className="mt-0.5 truncate font-medium">{a.judul}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.pengirim.anonim ? a.pengirim.alias : `${a.pengirim.nama} · ${a.pengirim.kelas}`} ·{" "}
                      {a.diAntrean ? "belum ditangani" : a.milikSaya ? "kamu" : a.penanggungJawab}
                    </p>
                  </div>
                  {a.urgensi !== "rendah" && <UrgensiBadge urgensi={a.urgensi} />}
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
