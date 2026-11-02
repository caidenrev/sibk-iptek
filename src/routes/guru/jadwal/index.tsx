import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { CalendarCheck, Check, MapPin, MessageSquareText, UserX, X } from "lucide-react"
import { useState } from "react"
import { z } from "zod"
import { PageHeader } from "@/components/app/page-header"
import { KodeTiket, StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { formatSlot } from "@/lib/format"
import { useAksi } from "@/lib/use-aksi"
import { daftarJadwalGuruFn, setujuiJadwalFn, tandaiSesiFn, tolakJadwalFn } from "@/server/functions/jadwal"

const TAB = ["menunggu", "disetujui", "riwayat"] as const

export const Route = createFileRoute("/guru/jadwal/")({
  validateSearch: z.object({ tab: z.enum(TAB).optional().catch(undefined) }),
  loaderDeps: ({ search }) => ({ tab: search.tab ?? "menunggu" }),
  loader: ({ deps }) => daftarJadwalGuruFn({ data: { tab: deps.tab } }),
  head: () => ({ meta: [{ title: "Pengajuan & Sesi · SIBK" }] }),
  component: HalamanPengajuan,
})

type Jadwal = Awaited<ReturnType<typeof daftarJadwalGuruFn>>["rows"][number]
type Tolak = { jadwal: Jadwal; mode: "tolak" | "batal" }

function HalamanPengajuan() {
  const { rows, jumlah } = Route.useLoaderData()
  const tab = Route.useSearch().tab ?? "menunggu"
  const navigate = useNavigate({ from: Route.fullPath })
  const [tolak, setTolak] = useState<Tolak | null>(null)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Pengajuan & sesi"
        description="Setujui atau tolak pengajuan siswa. Setelah sesi berlangsung, tandai hasilnya."
        actions={
          <Button asChild variant="outline" className="h-11 md:h-9">
            <Link to="/guru/slot">Atur slot jadwal</Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v === "menunggu" ? undefined : (v as "riwayat") } })}>
        <TabsList className="flex-wrap group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="menunggu" className="h-10 px-3 md:h-8">
            Menunggu
            {jumlah.menunggu > 0 && <span className="tabular ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{jumlah.menunggu}</span>}
          </TabsTrigger>
          <TabsTrigger value="disetujui" className="h-10 px-3 md:h-8">
            Disetujui{jumlah.disetujui > 0 && <span className="tabular ml-1.5 text-muted-foreground">{jumlah.disetujui}</span>}
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="h-10 px-3 md:h-8">
            Riwayat
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {rows.length === 0 ? (
          <Empty className="border bg-card py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>
                {tab === "menunggu" ? "Tidak ada pengajuan yang menunggu" : tab === "disetujui" ? "Belum ada sesi yang disetujui" : "Belum ada riwayat"}
              </EmptyTitle>
              <EmptyDescription>
                {tab === "menunggu" ? "Pengajuan baru dari siswa akan muncul di sini." : "Sesi yang sudah diputuskan akan tercatat di sini."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-3">
            {rows.map((j) => (
              <li key={j.id}>
                <KartuPengajuan jadwal={j} onTolak={(mode) => setTolak({ jadwal: j, mode })} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogTolak state={tolak} onClose={() => setTolak(null)} />
    </div>
  )
}

function KartuPengajuan({ jadwal: j, onTolak }: { jadwal: Jadwal; onTolak: (mode: "tolak" | "batal") => void }) {
  const aksi = useAksi()
  const [jalan, setJalan] = useState<string | null>(null)
  const lakukan = async (kunci: string, fn: () => Promise<unknown>, pesan: string) => {
    setJalan(kunci)
    await aksi(fn, pesan)
    setJalan(null)
  }
  const lewatTanpaKeputusan = j.status === "menunggu" && j.sudahMulai

  return (
    <article className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{j.siswa.nama}</h2>
          <span className="text-sm text-muted-foreground">
            {j.siswa.kelas} · <span className="tabular">{j.siswa.nis}</span>
          </span>
        </div>
        <p className="tabular mt-1 text-sm font-medium">{formatSlot(j.slot.tanggal, j.slot.jamMulai, j.slot.jamSelesai)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden /> {j.slot.lokasi}
        </p>
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Topik: </span>
          {j.topik}
        </p>
        {j.pengaduan && (
          <Link
            to="/guru/pengaduan/$kode"
            params={{ kode: j.pengaduan.kodeTiket }}
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquareText className="size-4 shrink-0" aria-hidden />
            <KodeTiket kode={j.pengaduan.kodeTiket} className="text-xs" />
            <span className="truncate">{j.pengaduan.judul}</span>
          </Link>
        )}
        {j.alasanPenolakan && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Alasan: </span>
            {j.alasanPenolakan}
          </p>
        )}
        {lewatTanpaKeputusan && (
          <p className="mt-3 text-sm text-muted-foreground">Waktu sesi sudah lewat sebelum diputuskan. Tolak agar siswa bisa mengajukan ulang.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
        <StatusBadge status={j.status} />
        <div className="flex flex-wrap gap-2 md:justify-end">
          {j.status === "menunggu" && (
            <>
              {!j.sudahMulai && (
                <Button
                  className="h-11 md:h-9"
                  disabled={jalan !== null}
                  onClick={() => lakukan("setuju", () => setujuiJadwalFn({ data: { id: j.id } }), `Sesi dengan ${j.siswa.nama} disetujui.`)}
                >
                  {jalan === "setuju" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />} Setujui
                </Button>
              )}
              <Button variant="outline" className="h-11 md:h-9" disabled={jalan !== null} onClick={() => onTolak("tolak")}>
                <X data-icon="inline-start" /> Tolak
              </Button>
            </>
          )}
          {j.status === "disetujui" && !j.sudahMulai && (
            <Button variant="outline" className="h-11 md:h-9" onClick={() => onTolak("batal")}>
              <X data-icon="inline-start" /> Batalkan sesi
            </Button>
          )}
          {j.status === "disetujui" && j.sudahMulai && (
            <>
              <Button
                className="h-11 md:h-9"
                disabled={jalan !== null}
                onClick={() => lakukan("selesai", () => tandaiSesiFn({ data: { id: j.id, hasil: "selesai" } }), "Sesi ditandai selesai.")}
              >
                {jalan === "selesai" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />} Selesai
              </Button>
              <Button
                variant="outline"
                className="h-11 md:h-9"
                disabled={jalan !== null}
                onClick={() => lakukan("absen", () => tandaiSesiFn({ data: { id: j.id, hasil: "tidak_hadir" } }), "Sesi ditandai tidak hadir.")}
              >
                {jalan === "absen" ? <Spinner data-icon="inline-start" /> : <UserX data-icon="inline-start" />} Tidak hadir
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

function DialogTolak({ state, onClose }: { state: Tolak | null; onClose: () => void }) {
  const aksi = useAksi()
  const [alasan, setAlasan] = useState("")
  const [galat, setGalat] = useState<string | null>(null)
  const [jalan, setJalan] = useState(false)
  const batal = state?.mode === "batal"

  const tutup = () => {
    if (jalan) return
    setAlasan("")
    setGalat(null)
    onClose()
  }

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!state) return
            if (alasan.trim().length < 5) {
              setGalat("Tulis alasan minimal 5 karakter. Siswa akan membacanya.")
              return
            }
            setJalan(true)
            const ok = await aksi(
              () => tolakJadwalFn({ data: { id: state.jadwal.id, alasan } }),
              batal ? "Sesi dibatalkan. Slot kembali tersedia." : "Pengajuan ditolak. Slot kembali tersedia."
            )
            setJalan(false)
            if (ok) {
              setAlasan("")
              onClose()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{batal ? "Batalkan sesi yang sudah disetujui?" : "Tolak pengajuan?"}</DialogTitle>
            <DialogDescription>
              {state && `${state.jadwal.siswa.nama} · ${formatSlot(state.jadwal.slot.tanggal, state.jadwal.slot.jamMulai, state.jadwal.slot.jamSelesai)}`}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!galat}>
            <FieldLabel htmlFor="alasan">Alasan untuk siswa</FieldLabel>
            <Textarea
              id="alasan"
              rows={4}
              maxLength={500}
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value)
                setGalat(null)
              }}
              placeholder={batal ? "Misalnya: Ada rapat mendadak. Silakan pilih slot lain minggu ini." : "Misalnya: Jadwal bentrok dengan kegiatan sekolah. Silakan pilih slot Rabu."}
              aria-invalid={!!galat}
              className="text-base md:text-sm"
            />
            {galat && <FieldError>{galat}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={tutup} disabled={jalan}>
              Kembali
            </Button>
            <Button type="submit" variant="destructive" className="h-11 md:h-9" disabled={jalan}>
              {jalan && <Spinner data-icon="inline-start" />}
              {batal ? "Batalkan sesi" : "Tolak pengajuan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
