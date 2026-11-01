import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router"
import { ArrowLeft, SearchX } from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"
import { FormBalas, Lampiran, Percakapan } from "@/components/app/percakapan"
import { AnonBadge, KodeTiket, StatusBadge, UrgensiBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatTanggal } from "@/lib/format"
import { pesanError } from "@/lib/pesan-error"
import { balasSiswaFn, detailSiswaFn } from "@/server/functions/pengaduan"

export const Route = createFileRoute("/siswa/pengaduan/$kode")({
  loader: async ({ params }) => {
    const d = await detailSiswaFn({ data: { kode: params.kode } })
    if (!d) throw notFound()
    return d
  },
  head: ({ params }) => ({ meta: [{ title: `${params.kode.toUpperCase()} · SIBK` }] }),
  notFoundComponent: TidakDitemukan,
  component: Detail,
})

function Detail() {
  const d = Route.useLoaderData()
  const router = useRouter()

  // Loader layout (lencana menu) jalan bersamaan dengan loader ini, sebelum aduan ditandai dibaca.
  useEffect(() => {
    router.invalidate({ filter: (m) => m.routeId === "/siswa" })
  }, [d.kodeTiket, router])

  const pesan = [
    { id: "awal", pengirim: "siswa" as const, isi: d.isi, createdAt: d.createdAt },
    ...d.percakapan,
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 h-11 text-muted-foreground md:h-8">
        <Link to="/siswa/pengaduan">
          <ArrowLeft data-icon="inline-start" /> Pengaduan saya
        </Link>
      </Button>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <KodeTiket kode={d.kodeTiket} className="text-sm text-muted-foreground" />
          {d.isAnonim && <AnonBadge />}
          <StatusBadge status={d.status} />
          {d.urgensi === "tinggi" && <UrgensiBadge urgensi="tinggi" />}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance">{d.judul}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.kategori} · dikirim {formatTanggal(d.createdAt)} ·{" "}
          {d.penanggungJawab ? `ditangani ${d.penanggungJawab}` : "menunggu Guru BK"}
        </p>
        {d.isAnonim && !d.identitasDibuka && (
          <p className="mt-3 rounded-xl bg-anon/10 px-4 py-3 text-sm text-anon dark:bg-anon/20">
            Guru BK melihatmu sebagai <strong className="font-semibold">{d.alias}</strong>. Namamu tidak ditampilkan.
          </p>
        )}
      </header>

      <Card>
        <CardContent className="grid gap-6">
          <Percakapan pesan={pesan} pembaca="siswa" labelSiswa="Kamu" />
          {d.lampiranTipe && (
            <div className="grid gap-2">
              <p className="text-xs font-medium text-muted-foreground">Lampiran</p>
              <Lampiran kode={d.kodeTiket} tipe={d.lampiranTipe} />
            </div>
          )}
          {d.percakapan.length === 0 && (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Guru BK belum membalas. Kamu akan melihat balasannya di sini.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        {d.status === "selesai" ? (
          <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Pengaduan ini sudah selesai.{" "}
            <Link to="/siswa/pengaduan/baru" className="font-medium text-primary underline-offset-4 hover:underline">
              Kirim pengaduan baru
            </Link>{" "}
            kalau masih perlu bantuan.
          </p>
        ) : (
          <FormBalas
            placeholder="Tambahkan cerita atau balas Guru BK…"
            onKirim={async (isi) => {
              try {
                await balasSiswaFn({ data: { kode: d.kodeTiket, isi } })
                await router.invalidate()
                return true
              } catch (e) {
                toast.error(pesanError(e))
                return false
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

function TidakDitemukan() {
  return (
    <div className="mx-auto max-w-3xl">
      <Empty className="border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>Pengaduan tidak ditemukan</EmptyTitle>
          <EmptyDescription>Periksa lagi kode tiketnya. Kamu hanya bisa membuka pengaduan dari akunmu sendiri.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" className="h-11 md:h-10">
            <Link to="/siswa/pengaduan">Kembali ke pengaduan saya</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
