import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { parseISO } from "date-fns"
import { ArrowLeft, CalendarX2, Check, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { id as localeId } from "react-day-picker/locale"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/components/app/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatHari, formatSlot, jamTitik } from "@/lib/format"
import { pesanError } from "@/lib/pesan-error"
import { cn } from "@/lib/utils"
import { ajukanJadwalFn, konteksAjukanFn, opsiGuruJadwalFn, slotTersediaFn } from "@/server/functions/jadwal"

export const Route = createFileRoute("/siswa/jadwal/ajukan")({
  validateSearch: z.object({ kode: z.string().optional().catch(undefined) }),
  loader: async () => {
    const [guru, konteks] = await Promise.all([opsiGuruJadwalFn(), konteksAjukanFn()])
    return { guru, konteks }
  },
  head: () => ({ meta: [{ title: "Ajukan Konseling · SIBK" }] }),
  component: AjukanKonseling,
})

type Slot = Awaited<ReturnType<typeof slotTersediaFn>>[number]
const TANPA = "__tanpa__"
const ke = (t: string) => parseISO(t)
const keTeks = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function AjukanKonseling() {
  const { guru, konteks } = Route.useLoaderData()
  const { kode } = Route.useSearch()
  const navigate = useNavigate()
  const penuh = konteks.aktif >= konteks.maks

  const [guruId, setGuruId] = useState<number | null>(guru.find((g) => g.pembina && g.slotTersedia > 0)?.id ?? null)
  const [slot, setSlot] = useState<Array<Slot> | null>(null)
  const [tanggal, setTanggal] = useState<string | null>(null)
  const [slotId, setSlotId] = useState<number | null>(null)
  const [topik, setTopik] = useState("")
  const [aduan, setAduan] = useState(konteks.aduan.some((a) => a.kodeTiket === kode?.toUpperCase()) ? kode!.toUpperCase() : TANPA)
  const [galat, setGalat] = useState<string | null>(null)
  const [kirim, setKirim] = useState(false)

  // Slot dimuat ulang setiap Guru BK diganti.
  useEffect(() => {
    if (!guruId) return
    let batal = false
    setSlot(null)
    setTanggal(null)
    setSlotId(null)
    slotTersediaFn({ data: { guruBkId: guruId } })
      .then((s) => {
        if (batal) return
        setSlot(s)
        setTanggal(s[0]?.tanggal ?? null)
      })
      .catch((e) => !batal && toast.error(pesanError(e)))
    return () => {
      batal = true
    }
  }, [guruId])

  const tanggalAda = [...new Set((slot ?? []).map((s) => s.tanggal))]
  const slotHari = (slot ?? []).filter((s) => s.tanggal === tanggal)
  const dipilih = slot?.find((s) => s.id === slotId)
  const guruDipilih = guru.find((g) => g.id === guruId)

  async function ajukan() {
    if (!slotId) return
    if (topik.trim().length < 5) {
      setGalat("Tulis topik minimal 5 karakter, misalnya Konsultasi pilihan PKL.")
      return
    }
    setKirim(true)
    try {
      await ajukanJadwalFn({ data: { slotId, topik, kodePengaduan: aduan === TANPA ? undefined : aduan } })
      toast.success("Pengajuan terkirim. Tunggu persetujuan Guru BK.")
      await navigate({ to: "/siswa/jadwal" })
    } catch (e) {
      toast.error(pesanError(e))
      // Slot mungkin baru diambil siswa lain: muat ulang pilihan.
      if (guruId) slotTersediaFn({ data: { guruBkId: guruId } }).then(setSlot).catch(() => {})
      setSlotId(null)
    } finally {
      setKirim(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 h-11 text-muted-foreground md:h-8">
        <Link to="/siswa/jadwal">
          <ArrowLeft data-icon="inline-start" /> Jadwal saya
        </Link>
      </Button>
      <PageHeader title="Ajukan konseling" description="Pilih Guru BK dan waktu bertemu. Guru BK akan menyetujui atau memberi alasan bila tidak bisa." />

      {penuh && (
        <Alert className="mb-6">
          <CalendarX2 aria-hidden />
          <AlertTitle>Kamu sudah punya {konteks.maks} pengajuan aktif</AlertTitle>
          <AlertDescription>
            Tunggu keputusan Guru BK, atau batalkan salah satunya di{" "}
            <Link to="/siswa/jadwal" className="font-medium text-primary underline underline-offset-4">
              Jadwal saya
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <ol className="grid gap-8">
        {/* ---------------------------------------------------------- 1. Guru BK */}
        <Langkah no={1} judul="Pilih Guru BK">
          <div role="radiogroup" aria-label="Guru BK" className="grid gap-3 sm:grid-cols-2">
            {guru.map((g) => {
              const aktif = g.id === guruId
              const kosong = g.slotTersedia === 0
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  disabled={kosong || penuh}
                  onClick={() => setGuruId(g.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                    aktif ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
                  )}
                >
                  <Avatar className="size-11">
                    <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
                      {g.nama.split(/\s+/).slice(0, 2).map((x) => x[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-semibold">{g.nama}</span>
                    {g.pembina && <span className="text-xs font-medium text-primary">Pembina kelasmu</span>}
                    <span className="text-sm text-muted-foreground">
                      {kosong ? "Belum ada slot dalam 30 hari" : `${g.slotTersedia} slot tersedia`}
                    </span>
                  </span>
                  {aktif && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
                </button>
              )
            })}
          </div>
          {guru.every((g) => g.slotTersedia === 0) && (
            <p className="text-sm text-muted-foreground">
              Belum ada Guru BK yang membuka slot. Coba lagi nanti, atau temui Guru BK langsung di ruang BK.
            </p>
          )}
        </Langkah>

        {/* ---------------------------------------------------------- 2. Waktu */}
        {guruId && !penuh && (
          <Langkah no={2} judul="Pilih tanggal dan jam">
            {slot === null ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : slot.length === 0 ? (
              <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                {guruDipilih?.nama} belum punya slot yang bisa dipesan. Pilih Guru BK lain.
              </p>
            ) : (
              <div className="grid gap-4 rounded-2xl border bg-card p-3 md:grid-cols-[auto_1fr] md:p-4">
                <Calendar
                  mode="single"
                  locale={localeId}
                  selected={tanggal ? ke(tanggal) : undefined}
                  onSelect={(d) => {
                    if (!d) return
                    setTanggal(keTeks(d))
                    setSlotId(null)
                  }}
                  defaultMonth={ke(tanggalAda[0])}
                  startMonth={ke(tanggalAda[0])}
                  endMonth={ke(tanggalAda[tanggalAda.length - 1])}
                  disabled={(d) => !tanggalAda.includes(keTeks(d))}
                  modifiers={{ adaSlot: tanggalAda.map(ke) }}
                  modifiersClassNames={{ adaSlot: "[&>button]:font-semibold [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-primary" }}
                  className="mx-auto rounded-xl p-0 md:mx-0"
                />
                <div className="min-w-0">
                  <p className="mb-2 text-sm font-semibold">{tanggal ? formatHari(tanggal) : "Pilih tanggal bertanda titik"}</p>
                  <div role="radiogroup" aria-label="Jam tersedia" className="grid gap-2 sm:grid-cols-2">
                    {slotHari.map((s) => {
                      const aktif = s.id === slotId
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={aktif}
                          onClick={() => setSlotId(s.id)}
                          className={cn(
                            "grid min-h-11 gap-0.5 rounded-xl border px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            aktif ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/60"
                          )}
                        >
                          <span className="tabular font-semibold">
                            {jamTitik(s.jamMulai)}–{jamTitik(s.jamSelesai)}
                          </span>
                          <span className={cn("flex items-center gap-1 text-xs", aktif ? "opacity-90" : "text-muted-foreground")}>
                            <MapPin className="size-3" aria-hidden /> {s.lokasi}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </Langkah>
        )}

        {/* ---------------------------------------------------------- 3. Topik */}
        {dipilih && (
          <Langkah no={3} judul="Ceritakan singkat topiknya">
            <Field data-invalid={!!galat}>
              <FieldLabel htmlFor="topik">Topik</FieldLabel>
              <Input
                id="topik"
                maxLength={200}
                value={topik}
                onChange={(e) => {
                  setTopik(e.target.value)
                  setGalat(null)
                }}
                placeholder="Misalnya: Konsultasi pilihan tempat PKL"
                aria-invalid={!!galat}
                className="h-11 text-base md:h-9 md:text-sm"
              />
              <FieldDescription>Cukup satu kalimat. Detailnya bisa diceritakan saat bertemu.</FieldDescription>
              {galat && <FieldError>{galat}</FieldError>}
            </Field>

            {konteks.aduan.length > 0 && (
              <Field>
                <FieldLabel htmlFor="aduan">Tautkan ke pengaduan (opsional)</FieldLabel>
                <Select value={aduan} onValueChange={setAduan}>
                  <SelectTrigger id="aduan" className="h-11 w-full md:h-9">
                    <SelectValue>
                      {aduan === TANPA ? "Tidak ditautkan" : `${aduan} · ${konteks.aduan.find((a) => a.kodeTiket === aduan)?.judul ?? ""}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TANPA}>Tidak ditautkan</SelectItem>
                    {konteks.aduan.map((a) => (
                      <SelectItem key={a.kodeTiket} value={a.kodeTiket}>
                        {a.kodeTiket} · {a.judul}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Hanya pengaduan dengan namamu yang bisa ditautkan. Pengaduan anonim tetap tersamar.</FieldDescription>
              </Field>
            )}

            <Card className="bg-muted/40">
              <CardContent className="grid gap-1 text-sm">
                <p className="font-semibold">{guruDipilih?.nama}</p>
                <p className="tabular">{formatSlot(dipilih.tanggal, dipilih.jamMulai, dipilih.jamSelesai)}</p>
                <p className="text-muted-foreground">{dipilih.lokasi}</p>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" className="h-11 md:h-10">
                <Link to="/siswa/jadwal">Batal</Link>
              </Button>
              <Button className="h-11 px-6 text-base md:h-10 md:text-sm" disabled={kirim} onClick={ajukan}>
                {kirim && <Spinner data-icon="inline-start" />}
                Ajukan jadwal
              </Button>
            </div>
          </Langkah>
        )}
      </ol>
    </div>
  )
}

function Langkah({ no, judul, children }: { no: number; judul: string; children: React.ReactNode }) {
  return (
    <li className="grid gap-3">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <span className="tabular flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">{no}</span>
        {judul}
      </h2>
      {children}
    </li>
  )
}
