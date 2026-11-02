import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router"
import { ArrowLeft, Hand, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FormBalas, Lampiran, Percakapan } from "@/components/app/percakapan"
import { AnonBadge, KodeTiket, StatusBadge, UrgensiBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { formatTanggal } from "@/lib/format"
import { pesanError } from "@/lib/pesan-error"
import { detailGuruFn, tanganiFn, tanggapiGuruFn, ubahStatusFn } from "@/server/functions/pengaduan"

export const Route = createFileRoute("/guru/pengaduan/$kode")({
  loader: async ({ params }) => {
    const d = await detailGuruFn({ data: { kode: params.kode } })
    if (!d) throw notFound()
    return d
  },
  head: ({ params }) => ({ meta: [{ title: `${params.kode.toUpperCase()} · SIBK` }] }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <p className="font-semibold">Pengaduan tidak ditemukan</p>
      <Button asChild variant="link">
        <Link to="/guru/pengaduan">Kembali ke pengaduan masuk</Link>
      </Button>
    </div>
  ),
  component: DetailGuru,
})

function DetailGuru() {
  const d = Route.useLoaderData()
  const router = useRouter()

  // Loader layout (lencana menu) jalan bersamaan dengan loader ini, sebelum aduan ditandai dibaca.
  useEffect(() => {
    router.invalidate({ filter: (m) => m.routeId === "/guru" })
  }, [d.kodeTiket, router])
  const [proses, setProses] = useState<"tangani" | "status" | null>(null)

  const namaSiswa = d.pengirim.anonim ? d.pengirim.alias : d.pengirim.nama
  const pesan = [{ id: "awal", pengirim: "siswa" as const, isi: d.isi, createdAt: d.createdAt }, ...d.percakapan]
  const bolehBalas = (d.milikSaya || d.diAntrean) && d.status !== "selesai"

  async function jalankan(jenis: "tangani" | "status", fn: () => Promise<unknown>, sukses: string) {
    setProses(jenis)
    try {
      await fn()
      toast.success(sukses)
      await router.invalidate()
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setProses(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 h-11 text-muted-foreground md:h-8">
        <Link to="/guru/pengaduan">
          <ArrowLeft data-icon="inline-start" /> Pengaduan masuk
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <header className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <KodeTiket kode={d.kodeTiket} className="text-sm text-muted-foreground" />
              {d.pengirim.anonim && <AnonBadge />}
              <StatusBadge status={d.status} />
              {d.urgensi === "tinggi" && <UrgensiBadge urgensi="tinggi" />}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance">{d.judul}</h1>
          </header>

          <Card>
            <CardContent className="grid gap-6">
              <Percakapan pesan={pesan} pembaca="guru_bk" labelSiswa={namaSiswa} />
              {d.adaLampiran && (
                <div className="grid gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Lampiran dari siswa</p>
                  <Lampiran kode={d.kodeTiket} tipe={d.lampiranTipe} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4">
            {bolehBalas ? (
              <>
                {d.diAntrean && (
                  <p className="mb-2 text-sm text-muted-foreground">Membalas akan menjadikanmu penanggung jawab pengaduan ini.</p>
                )}
                <FormBalas
                  label="Tanggapan untuk siswa"
                  placeholder="Tulis tanggapan untuk siswa…"
                  onKirim={async (isi) => {
                    try {
                      await tanggapiGuruFn({ data: { kode: d.kodeTiket, isi } })
                      await router.invalidate()
                      return true
                    } catch (e) {
                      toast.error(pesanError(e))
                      return false
                    }
                  }}
                />
              </>
            ) : (
              <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                {d.status === "selesai"
                  ? "Pengaduan sudah selesai. Ubah status ke Diproses untuk membalas lagi."
                  : `Pengaduan ini ditangani ${d.penanggungJawab}. Kamu hanya bisa membacanya.`}
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ panel info */}
        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengirim</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {d.pengirim.anonim ? (
                // Untuk aduan anonim tidak ada kolom identitas sama sekali, bukan sekadar disembunyikan.
                <div className="flex items-start gap-3 rounded-xl bg-anon/10 p-3 text-anon dark:bg-anon/20">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">{d.pengirim.alias}</p>
                    <p className="mt-0.5 text-xs leading-relaxed">
                      Siswa memilih anonim. Identitas baru terlihat bila siswa sendiri memilih membukanya.
                    </p>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-[5rem_1fr] gap-y-1.5">
                  <dt className="text-muted-foreground">Nama</dt>
                  <dd className="font-medium">{d.pengirim.nama}</dd>
                  <dt className="text-muted-foreground">NIS</dt>
                  <dd className="tabular">{d.pengirim.nis}</dd>
                  <dt className="text-muted-foreground">Kelas</dt>
                  <dd>{d.pengirim.kelas}</dd>
                  {d.pengirim.dariAnonim && (
                    <dd className="col-span-2 mt-2 rounded-lg bg-anon/10 px-3 py-2 text-xs leading-relaxed text-anon dark:bg-anon/20">
                      Awalnya dikirim anonim. Siswa membuka identitasnya untuk aduan ini agar bisa konseling tatap muka.
                    </dd>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Penanganan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1.5">
                <dt className="text-muted-foreground">Kategori</dt>
                <dd>{d.kategori}</dd>
                <dt className="text-muted-foreground">Urgensi</dt>
                <dd className="capitalize">{d.urgensi}</dd>
                <dt className="text-muted-foreground">Dikirim</dt>
                <dd>{formatTanggal(d.createdAt)}</dd>
                <dt className="text-muted-foreground">Ditangani</dt>
                <dd>{d.diAntrean ? "Belum ada" : d.milikSaya ? "Kamu" : d.penanggungJawab}</dd>
              </dl>

              {d.diAntrean && (
                <Button
                  className="h-11 md:h-9"
                  disabled={proses !== null}
                  onClick={() => jalankan("tangani", () => tanganiFn({ data: { kode: d.kodeTiket } }), "Kamu sekarang penanggung jawab pengaduan ini.")}
                >
                  {proses === "tangani" ? <Spinner data-icon="inline-start" /> : <Hand data-icon="inline-start" />}
                  Tangani
                </Button>
              )}

              {d.milikSaya && (
                <Field>
                  <FieldLabel htmlFor="status-aduan">Status</FieldLabel>
                  <Select
                    value={d.status}
                    disabled={proses !== null}
                    onValueChange={(v) =>
                      jalankan("status", () => ubahStatusFn({ data: { kode: d.kodeTiket, status: v as "baru" } }), "Status diperbarui.")
                    }
                  >
                    <SelectTrigger id="status-aduan" className="h-11 w-full md:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baru">Baru</SelectItem>
                      <SelectItem value="diproses">Diproses</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
