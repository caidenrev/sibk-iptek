import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BellRing, ChevronLeft, ChevronRight, EyeOff, RotateCw } from "lucide-react"
import { useState } from "react"
import { z } from "zod"
import { IkonEmail, IkonWhatsApp } from "@/components/app/ikon-kontak"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { formatJam, formatTanggalPendek } from "@/lib/format"
import { useAksi } from "@/lib/use-aksi"
import { kirimUlangFn, logNotifikasiFn } from "@/server/functions/notifikasi"

const searchSchema = z.object({
  kanal: z.enum(["email", "whatsapp"]).optional().catch(undefined),
  status: z.enum(["menunggu", "terkirim", "gagal", "dilewati"]).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute("/admin/notifikasi")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => logNotifikasiFn({ data: { ...deps, page: deps.page ?? 1 } }),
  head: () => ({ meta: [{ title: "Log Notifikasi · SIBK" }] }),
  component: LogNotifikasi,
})

const JENIS: Record<string, string> = {
  pengaduan_baru: "Pengaduan baru",
  tanggapan: "Tanggapan",
  pengajuan_jadwal: "Pengajuan jadwal",
  konfirmasi: "Jadwal disetujui",
  penolakan: "Jadwal ditolak",
  pembatalan: "Jadwal dibatalkan",
  pengingat_h1: "Pengingat H-1",
  pengingat_1jam: "Pengingat 1 jam",
  tes: "Uji kirim",
}
const SEMUA = "semua"

function LogNotifikasi() {
  const { rows, total, page, perHalaman } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman))
  const ubah = (patch: Partial<z.infer<typeof searchSchema>>) => navigate({ search: (s) => ({ ...s, ...patch, page: undefined }) })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Log notifikasi"
        description="Riwayat pesan WhatsApp dan email. Isi pesan tidak ditampilkan; penerima notifikasi aduan anonim disamarkan."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <Select value={search.kanal ?? SEMUA} onValueChange={(v) => ubah({ kanal: v === SEMUA ? undefined : (v as "email") })}>
          <SelectTrigger className="h-11 w-full sm:w-40 md:h-9" aria-label="Filter kanal">
            <SelectValue>{search.kanal === "email" ? "Email" : search.kanal === "whatsapp" ? "WhatsApp" : "Semua kanal"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua kanal</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={search.status ?? SEMUA} onValueChange={(v) => ubah({ status: v === SEMUA ? undefined : (v as "gagal") })}>
          <SelectTrigger className="h-11 w-full sm:w-40 md:h-9" aria-label="Filter status">
            <SelectValue>
              {search.status ? { menunggu: "Menunggu", terkirim: "Terkirim", gagal: "Gagal", dilewati: "Dilewati" }[search.status] : "Semua status"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua status</SelectItem>
            <SelectItem value="menunggu">Menunggu</SelectItem>
            <SelectItem value="terkirim">Terkirim</SelectItem>
            <SelectItem value="gagal">Gagal</SelectItem>
            <SelectItem value="dilewati">Dilewati</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <Empty className="border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellRing />
            </EmptyMedia>
            <EmptyTitle>{search.kanal || search.status ? "Tidak ada yang cocok dengan filter" : "Belum ada notifikasi"}</EmptyTitle>
            <EmptyDescription>Pesan yang dikirim SIBK ke siswa dan Guru BK akan tercatat di sini.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {rows.map((r) => (
            <li key={r.id}>
              <BarisLog r={r} />
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

type Baris = Awaited<ReturnType<typeof logNotifikasiFn>>["rows"][number]

function BarisLog({ r }: { r: Baris }) {
  const aksi = useAksi()
  const [jalan, setJalan] = useState(false)
  const bisaUlang = r.status === "gagal" || r.status === "dilewati"
  return (
    <div className="grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {r.kanal === "email" ? <IkonEmail /> : <IkonWhatsApp />}
          <span className="font-medium">{JENIS[r.jenis] ?? r.jenis}</span>
          <span className="tabular text-muted-foreground">
            · {formatTanggalPendek(r.dibuat)} {formatJam(r.dibuat)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {r.sensitif ? (
            <span className="inline-flex items-center gap-1">
              <EyeOff className="size-3.5" aria-hidden /> Penerima disamarkan (aduan anonim)
            </span>
          ) : (
            <>
              {r.penerima} · <span className="font-mono text-xs">{r.tujuan}</span>
            </>
          )}
        </p>
        {r.error && <p className="mt-1 text-xs break-words text-muted-foreground">{r.error}</p>}
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <StatusBadge status={r.status} />
        {r.percobaan > 1 && <span className="tabular text-xs text-muted-foreground">{r.percobaan}× dicoba</span>}
        {bisaUlang && (
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-8"
            disabled={jalan}
            onClick={async () => {
              setJalan(true)
              await aksi(() => kirimUlangFn({ data: { id: r.id } }), "Pesan dikirim ulang.")
              setJalan(false)
            }}
          >
            {jalan ? <Spinner data-icon="inline-start" /> : <RotateCw data-icon="inline-start" />} Kirim ulang
          </Button>
        )}
      </div>
    </div>
  )
}
