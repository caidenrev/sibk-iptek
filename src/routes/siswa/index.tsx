import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarPlus, ChevronRight, MapPin, MessageSquareHeart } from "lucide-react"

import { AnonBadge, KodeTiket, StatusBadge } from "@/components/app/status-badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatSlot, formatTanggalPendek } from "@/lib/format"
import { riwayatSiswaFn } from "@/server/functions/pengaduan"
import { jadwalBerikutnyaFn } from "@/server/functions/jadwal"

export const Route = createFileRoute("/siswa/")({
  head: () => ({ meta: [{ title: "Beranda · SIBK" }] }),
  loader: async () => {
    const [aduan, jadwal] = await Promise.all([riwayatSiswaFn(), jadwalBerikutnyaFn()])
    return { aduan, jadwal }
  },
  component: DashboardSiswa,
})

function DashboardSiswa() {
  const { user } = Route.useRouteContext()
  const { aduan, jadwal } = Route.useLoaderData()
  const aktif = aduan.filter((p) => p.status !== "selesai")
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
            <Button asChild variant="ghost" size="sm" className="h-11 md:h-8">
              <Link to="/siswa/jadwal">Semua jadwal</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {jadwal ? (
            <Link
              to="/siswa/jadwal"
              className="grid gap-1 rounded-xl border p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="tabular font-semibold">{formatSlot(jadwal.slot.tanggal, jadwal.slot.jamMulai, jadwal.slot.jamSelesai)}</span>
                <StatusBadge status={jadwal.status} />
              </span>
              <span className="text-sm text-muted-foreground">
                {jadwal.guruNama} · <MapPin className="inline size-3.5 align-[-2px]" aria-hidden /> {jadwal.slot.lokasi}
              </span>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada jadwal.{" "}
              <Link to="/siswa/jadwal/ajukan" className="font-medium text-primary underline-offset-4 hover:underline">
                Ajukan konseling
              </Link>{" "}
              kalau ingin bertemu Guru BK langsung.
            </p>
          )}
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
          {aktif.length === 0 && (
            <p className="px-4 pb-2 text-sm text-muted-foreground">
              Belum ada pengaduan aktif. Kalau ada yang mengganjal, kamu bisa mulai dari tombol Kirim pengaduan di atas.
            </p>
          )}
          <ul className="divide-y">
            {aktif.slice(0, 4).map((a) => (
              <li key={a.kodeTiket}>
                <Link
                  to="/siswa/pengaduan/$kode"
                  params={{ kode: a.kodeTiket }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted"
                >
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <KodeTiket kode={a.kodeTiket} className="text-xs whitespace-nowrap text-muted-foreground" />
                      {a.isAnonim && <AnonBadge />}
                    </span>
                    <span className="truncate font-medium">{a.judul}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.status} />
                      {a.balasanBaru ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <span className="size-2 rounded-full bg-primary" aria-hidden />
                          Balasan baru
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Diperbarui {formatTanggalPendek(a.updatedAt)}</span>
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
