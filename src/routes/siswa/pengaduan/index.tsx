import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChevronRight, MessageSquareHeart, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { PageHeader } from "@/components/app/page-header"
import { AnonBadge, KodeTiket, StatusBadge, UrgensiBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTanggalPendek } from "@/lib/format"
import { riwayatSiswaFn } from "@/server/functions/pengaduan"

export const Route = createFileRoute("/siswa/pengaduan/")({
  head: () => ({ meta: [{ title: "Pengaduan Saya · SIBK" }] }),
  loader: () => riwayatSiswaFn(),
  component: Riwayat,
})

function Riwayat() {
  const semua = Route.useLoaderData()
  const navigate = useNavigate()
  const [tab, setTab] = useState<"aktif" | "selesai">("aktif")
  const [cari, setCari] = useState("")

  const tampil = useMemo(() => {
    const q = cari.trim().toUpperCase()
    return semua.filter(
      (p) =>
        (tab === "aktif" ? p.status !== "selesai" : p.status === "selesai") &&
        (!q || p.kodeTiket.includes(q) || p.judul.toUpperCase().includes(q))
    )
  }, [semua, tab, cari])

  if (semua.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Pengaduan saya" />
        <Empty className="border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareHeart />
            </EmptyMedia>
            <EmptyTitle>Belum ada pengaduan</EmptyTitle>
            <EmptyDescription>Kalau ada yang mengganjal, ceritakan ke Guru BK. Boleh tanpa nama.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="h-11 md:h-10">
              <Link to="/siswa/pengaduan/baru">Kirim pengaduan</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Pengaduan saya"
        description="Termasuk pengaduan anonim. Hanya kamu yang bisa melihat daftar ini."
        actions={
          <Button asChild className="h-11 md:h-9">
            <Link to="/siswa/pengaduan/baru">Kirim pengaduan</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "aktif")}>
          <TabsList>
            <TabsTrigger value="aktif">Aktif ({semua.filter((p) => p.status !== "selesai").length})</TabsTrigger>
            <TabsTrigger value="selesai">Selesai ({semua.filter((p) => p.status === "selesai").length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <form
          className="sm:w-64"
          onSubmit={(e) => {
            e.preventDefault()
            const kode = cari.trim().toUpperCase()
            const persis = semua.find((p) => p.kodeTiket === kode)
            if (persis) navigate({ to: "/siswa/pengaduan/$kode", params: { kode } })
          }}
        >
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari kode tiket atau judul"
              aria-label="Cari kode tiket atau judul"
              type="search"
              autoCapitalize="characters"
            />
          </InputGroup>
        </form>
      </div>

      {tampil.length === 0 ? (
        <Empty className="border bg-card py-12">
          <EmptyHeader>
            <EmptyTitle>{cari ? "Tidak ada yang cocok" : tab === "aktif" ? "Tidak ada pengaduan aktif" : "Belum ada yang selesai"}</EmptyTitle>
            {cari && <EmptyDescription>Periksa lagi kode tiketnya, misalnya BK-7F3K9Q.</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {tampil.map((p) => (
            <li key={p.kodeTiket}>
              <Link
                to="/siswa/pengaduan/$kode"
                params={{ kode: p.kodeTiket }}
                className="flex items-center gap-3 px-4 py-4 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted"
              >
                <span className="grid min-w-0 flex-1 gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <KodeTiket kode={p.kodeTiket} className="text-xs text-muted-foreground" />
                    {p.isAnonim && <AnonBadge />}
                    <span className="text-xs text-muted-foreground">· {p.kategori}</span>
                  </span>
                  <span className="truncate font-medium">{p.judul}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.urgensi === "tinggi" && <UrgensiBadge urgensi="tinggi" />}
                    {p.balasanBaru ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <span className="size-2 rounded-full bg-primary" aria-hidden />
                        Balasan baru
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.jumlahBalasan > 0 ? `${p.jumlahBalasan} balasan` : "Belum dibalas"} · {formatTanggalPendek(p.updatedAt)}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
