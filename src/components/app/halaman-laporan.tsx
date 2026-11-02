import { Download } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { z } from "zod"
import { PageHeader } from "./page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTanggalPendek } from "@/lib/format"
import { geserTanggal, hariIniWib } from "@/lib/tanggal"
import type { IsiLaporan } from "@/server/services/laporan"

export const searchLaporanSchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  kategoriId: z.number().int().positive().optional().catch(undefined),
  guruBkId: z.number().int().positive().optional().catch(undefined),
})
export type SearchLaporan = z.infer<typeof searchLaporanSchema>

/** Bawaan: awal bulan ini sampai hari ini (WIB). */
export function periodeLaporan(s: SearchLaporan) {
  const hariIni = hariIniWib()
  const dari = s.dari ?? `${hariIni.slice(0, 8)}01`
  const sampai = s.sampai ?? hariIni
  return dari <= sampai ? { dari, sampai } : { dari: sampai, sampai: dari }
}

const LABEL: Record<string, string> = {
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  menunggu: "Menunggu persetujuan",
  disetujui: "Disetujui, belum dicatat",
  tidak_hadir: "Tidak hadir",
  ditolak: "Ditolak",
  batal: "Dibatalkan siswa",
}
const SEMUA = "semua"
const chartConfig = { jumlah: { label: "Pengaduan", color: "var(--chart-1)" } } satisfies ChartConfig

function TabelRekap({ judul, baris }: { judul: string; baris: Array<{ label: string; jumlah: number }> }) {
  const total = baris.reduce((n, b) => n + b.jumlah, 0)
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">{judul}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            {baris.map((b) => (
              <tr key={b.label} className="border-b last:border-0">
                <td className="py-1.5">{LABEL[b.label] ?? b.label}</td>
                <td className="tabular py-1.5 text-right font-medium">{b.jumlah}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="pt-2 font-semibold">Total</td>
              <td className="tabular pt-2 text-right font-semibold">{total}</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  )
}

export function HalamanLaporan({
  isi,
  opsi,
  search,
  ubah,
}: {
  isi: IsiLaporan
  opsi: { kategori: Array<{ id: number; nama: string }>; guru: Array<{ id: number; nama: string }> }
  search: SearchLaporan
  ubah: (patch: Partial<SearchLaporan>) => void
}) {
  const { dari, sampai } = isi.filter
  const r = isi.ringkas
  const persen = (n: number) => (r.total ? `${Math.round((n / r.total) * 100)}%` : "0%")
  const hariIni = hariIniWib()
  const awalBulanLalu = `${geserTanggal(`${hariIni.slice(0, 8)}01`, -1).slice(0, 8)}01`
  const urlPdf = `/api/laporan.pdf?${new URLSearchParams(
    Object.entries({ dari, sampai, kategoriId: isi.filter.kategoriId, guruBkId: isi.filter.guruBkId })
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  )}`
  const stat = [
    { label: "Pengaduan masuk", nilai: String(r.total), ket: `${r.selesai} selesai` },
    { label: "Anonim", nilai: persen(r.anonim), ket: `${r.anonim} aduan · ${r.dibuka} dibuka identitasnya` },
    { label: "Sudah ditanggapi", nilai: persen(r.dibalas), ket: `${r.dibalas} dari ${r.total} aduan` },
    { label: "Tanggapan pertama", nilai: r.rataJam == null ? "-" : `${String(r.rataJam).replace(".", ",")} jam`, ket: "rata-rata sejak aduan dikirim" },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Laporan layanan BK"
        description="Angka rekap tanpa isi pengaduan atau identitas siswa. Bisa diunduh sebagai PDF berkop sekolah."
        actions={
          <Button asChild className="h-11 md:h-9">
            <a href={urlPdf} download>
              <Download data-icon="inline-start" /> Unduh PDF
            </a>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="dari">Dari</FieldLabel>
            <Input id="dari" type="date" value={dari} max={sampai} onChange={(e) => e.target.value && ubah({ dari: e.target.value })} className="h-11 md:h-9" />
          </Field>
          <Field>
            <FieldLabel htmlFor="sampai">Sampai</FieldLabel>
            <Input id="sampai" type="date" value={sampai} min={dari} onChange={(e) => e.target.value && ubah({ sampai: e.target.value })} className="h-11 md:h-9" />
          </Field>
          <Field>
            <FieldLabel htmlFor="kategori">Kategori</FieldLabel>
            <Select value={search.kategoriId ? String(search.kategoriId) : SEMUA} onValueChange={(v) => ubah({ kategoriId: v === SEMUA ? undefined : Number(v) })}>
              <SelectTrigger id="kategori" className="h-11 w-full md:h-9">
                <SelectValue>{opsi.kategori.find((k) => k.id === search.kategoriId)?.nama ?? "Semua kategori"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMUA}>Semua kategori</SelectItem>
                {opsi.kategori.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)}>
                    {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="guru">Guru BK</FieldLabel>
            <Select value={search.guruBkId ? String(search.guruBkId) : SEMUA} onValueChange={(v) => ubah({ guruBkId: v === SEMUA ? undefined : Number(v) })}>
              <SelectTrigger id="guru" className="h-11 w-full md:h-9">
                <SelectValue>{opsi.guru.find((g) => g.id === search.guruBkId)?.nama ?? "Semua Guru BK"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMUA}>Semua Guru BK</SelectItem>
                {opsi.guru.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-11 md:h-8" onClick={() => ubah({ dari: undefined, sampai: undefined })}>
            Bulan ini
          </Button>
          <Button variant="outline" size="sm" className="h-11 md:h-8" onClick={() => ubah({ dari: awalBulanLalu, sampai: geserTanggal(`${hariIni.slice(0, 8)}01`, -1) })}>
            Bulan lalu
          </Button>
          <Button variant="outline" size="sm" className="h-11 md:h-8" onClick={() => ubah({ dari: `${hariIni.slice(0, 4)}-01-01`, sampai: hariIni })}>
            Tahun ini
          </Button>
          <p className="ml-auto self-center text-sm text-muted-foreground">
            {formatTanggalPendek(`${dari}T12:00:00+07:00`)} s.d. {formatTanggalPendek(`${sampai}T12:00:00+07:00`)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat.map((x) => (
          <Card key={x.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardDescription>{x.label}</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <p className="tabular text-2xl font-bold">{x.nilai}</p>
              <p className="text-xs text-muted-foreground">{x.ket}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pengaduan per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {r.total === 0 ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Tidak ada pengaduan pada periode ini.</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                <BarChart data={isi.kategori} margin={{ left: -16, right: 8 }} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="jumlah" fill="var(--color-jumlah)" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <TabelRekap judul={`Sesi konseling (${isi.totalSesi})`} baris={isi.sesi} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <TabelRekap judul="Per kategori" baris={isi.kategori} />
        <TabelRekap judul="Per urgensi" baris={isi.urgensi} />
        <TabelRekap judul="Per status" baris={isi.status} />
      </div>
    </div>
  )
}
