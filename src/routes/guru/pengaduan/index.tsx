import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { PageHeader } from "@/components/app/page-header"
import { AnonBadge, KodeTiket, StatusBadge, UrgensiBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTanggalPendek } from "@/lib/format"
import { cn } from "@/lib/utils"
import { daftarGuruFn, opsiKategoriFn } from "@/server/functions/pengaduan"

const searchSchema = z.object({
  tab: z.enum(["antrean", "saya", "semua"]).optional().catch(undefined),
  status: z.enum(["baru", "diproses", "selesai"]).optional().catch(undefined),
  kategoriId: z.number().int().positive().optional().catch(undefined),
  urgensi: z.enum(["rendah", "sedang", "tinggi"]).optional().catch(undefined),
  mode: z.enum(["anonim", "identitas"]).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute("/guru/pengaduan/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [hasil, kategori] = await Promise.all([
      daftarGuruFn({ data: { ...deps, tab: deps.tab ?? "antrean", page: deps.page ?? 1 } }),
      opsiKategoriFn(),
    ])
    return { ...hasil, kategori }
  },
  head: () => ({ meta: [{ title: "Pengaduan Masuk · SIBK" }] }),
  component: PengaduanMasuk,
})

const SEMUA = "semua"

function PengaduanMasuk() {
  const { rows, total, page, perHalaman, jumlahTab, kategori } = Route.useLoaderData()
  const search = Route.useSearch()
  const tab = search.tab ?? "antrean"
  const navigate = useNavigate({ from: Route.fullPath })
  const [cari, setCari] = useState(search.q ?? "")

  useEffect(() => {
    const t = setTimeout(() => {
      const q = cari.trim() || undefined
      if (q !== search.q) navigate({ search: (s) => ({ ...s, q, page: undefined }), replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [cari, search.q, navigate])

  const ubah = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (s) => ({ ...s, ...patch, page: undefined }) })
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman))
  const adaFilter = !!(search.status || search.kategoriId || search.urgensi || search.mode || search.q)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pengaduan masuk"
        description="Aduan anonim masuk ke antrean bersama. Klik Tangani untuk menjadi penanggung jawabnya."
      />

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as "antrean" } })}>
        <TabsList className="flex-wrap group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="antrean" className="h-10 px-3 md:h-8">
            Antrean{jumlahTab.antrean > 0 && <span className="tabular ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{jumlahTab.antrean}</span>}
          </TabsTrigger>
          <TabsTrigger value="saya" className="h-10 px-3 md:h-8">
            Milik saya{jumlahTab.saya > 0 && <span className="tabular ml-1.5 text-muted-foreground">{jumlahTab.saya}</span>}
          </TabsTrigger>
          <TabsTrigger value="semua" className="h-10 px-3 md:h-8">
            Semua
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 mb-4 grid gap-2 md:flex md:flex-wrap">
        <InputGroup className="md:w-64">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Kode tiket atau judul" aria-label="Cari kode tiket atau judul" type="search" />
        </InputGroup>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Filter
            label="Status"
            value={search.status}
            onChange={(v) => ubah({ status: v as "baru" | undefined })}
            opsi={[
              ["baru", "Baru"],
              ["diproses", "Diproses"],
              ["selesai", "Selesai"],
            ]}
          />
          <Filter
            label="Kategori"
            value={search.kategoriId ? String(search.kategoriId) : undefined}
            onChange={(v) => ubah({ kategoriId: v ? Number(v) : undefined })}
            opsi={kategori.map((k) => [String(k.id), k.nama] as [string, string])}
          />
          <Filter
            label="Urgensi"
            value={search.urgensi}
            onChange={(v) => ubah({ urgensi: v as "tinggi" | undefined })}
            opsi={[
              ["tinggi", "Tinggi"],
              ["sedang", "Sedang"],
              ["rendah", "Rendah"],
            ]}
          />
          <Filter
            label="Mode"
            value={search.mode}
            onChange={(v) => ubah({ mode: v as "anonim" | undefined })}
            opsi={[
              ["anonim", "Anonim"],
              ["identitas", "Dengan nama"],
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty className="border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>
              {adaFilter ? "Tidak ada yang cocok dengan filter" : tab === "antrean" ? "Antrean kosong" : tab === "saya" ? "Belum ada pengaduan yang kamu tangani" : "Belum ada pengaduan"}
            </EmptyTitle>
            <EmptyDescription>
              {adaFilter
                ? "Ubah atau hapus filter untuk melihat pengaduan lain."
                : tab === "antrean"
                  ? "Semua aduan anonim sudah punya penanggung jawab."
                  : "Pengaduan dari siswa akan muncul di sini."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {rows.map((r) => (
            <li key={r.kodeTiket}>
              <Link
                to="/guru/pengaduan/$kode"
                params={{ kode: r.kodeTiket }}
                className="grid gap-x-4 gap-y-2 px-4 py-4 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.belumDibaca && <span className="size-2 rounded-full bg-primary" aria-label="Belum dibaca" />}
                    <KodeTiket kode={r.kodeTiket} className="text-xs text-muted-foreground" />
                    {r.pengirim.anonim ? <AnonBadge /> : null}
                    <span className="text-xs text-muted-foreground">· {r.kategori}</span>
                  </div>
                  <p className={cn("mt-1 truncate", r.belumDibaca ? "font-semibold" : "font-medium")}>{r.judul}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.pengirim.anonim ? r.pengirim.alias : `${r.pengirim.nama} · ${r.pengirim.kelas}`} · {r.cuplikan}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end md:justify-center">
                  <div className="flex gap-1.5">
                    {r.urgensi !== "rendah" && <UrgensiBadge urgensi={r.urgensi} />}
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.diAntrean ? "Belum ditangani" : r.milikSaya ? "Kamu" : r.penanggungJawab} · {formatTanggalPendek(r.updatedAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > perHalaman && (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Paginasi">
          <p className="text-muted-foreground">
            <span className="tabular">
              {(page - 1) * perHalaman + 1}–{Math.min(page * perHalaman, total)}
            </span>{" "}
            dari <span className="tabular">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-11 md:size-9" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => navigate({ search: (s) => ({ ...s, page: page > 2 ? page - 1 : undefined }) })}>
              <ChevronLeft />
            </Button>
            <span className="tabular px-2">
              {page} / {totalHalaman}
            </span>
            <Button variant="outline" size="icon" className="size-11 md:size-9" aria-label="Halaman berikutnya" disabled={page >= totalHalaman} onClick={() => navigate({ search: (s) => ({ ...s, page: page + 1 }) })}>
              <ChevronRight />
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}

function Filter({
  label,
  value,
  onChange,
  opsi,
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  opsi: Array<[string, string]>
}) {
  return (
    <Select value={value ?? SEMUA} onValueChange={(v) => onChange(v === SEMUA ? undefined : v)}>
      <SelectTrigger className="h-11 w-full md:h-9 md:w-36" aria-label={`Filter ${label.toLowerCase()}`}>
        {/* Teks diisi langsung: SelectValue kosong sebelum daftar pilihan pernah dibuka (render server) */}
        <SelectValue>{opsi.find(([v]) => v === value)?.[1] ?? `Semua ${label.toLowerCase()}`}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEMUA}>Semua {label.toLowerCase()}</SelectItem>
        {opsi.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
