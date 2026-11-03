import { zodResolver } from "@hookform/resolvers/zod"
import { Link, createFileRoute } from "@tanstack/react-router"
import { CheckCircle2, ChevronDown, Copy, ImagePlus, ShieldCheck, TriangleAlert, UserRound, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { LogoMark } from "@/components/app/logo"
import { PageHeader } from "@/components/app/page-header"
import { KodeTiket } from "@/components/app/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { pesanError } from "@/lib/pesan-error"
import { cn } from "@/lib/utils"
import { pengaduanSchema } from "@/lib/validasi"
import type { PengaduanInput } from "@/lib/validasi"
import { kirimPengaduanFn, opsiKategoriFn } from "@/server/functions/pengaduan"

export const Route = createFileRoute("/siswa/pengaduan/baru")({
  head: () => ({ meta: [{ title: "Kirim Pengaduan · SIBK" }] }),
  loader: () => opsiKategoriFn(),
  component: HalamanKirim,
})

const BATAS_BERKAS = 5 * 1024 * 1024
const MAKS_ISI = 5000

function HalamanKirim() {
  const [terkirim, setTerkirim] = useState<{ kode: string; anonim: boolean } | null>(null)
  return (
    <div className="mx-auto max-w-2xl">
      {terkirim ? (
        <Sukses kode={terkirim.kode} anonim={terkirim.anonim} onLagi={() => setTerkirim(null)} />
      ) : (
        <>
          <PageHeader title="Kirim pengaduan" description="Ceritakan apa yang kamu alami. Guru BK akan membalas di sini." />
          <FormPengaduan onTerkirim={setTerkirim} />
        </>
      )}
    </div>
  )
}

function FormPengaduan({ onTerkirim }: { onTerkirim: (t: { kode: string; anonim: boolean }) => void }) {
  const kategori = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const [berkas, setBerkas] = useState<File | null>(null)
  const [galatBerkas, setGalatBerkas] = useState<string | null>(null)
  const [konfirmasi, setKonfirmasi] = useState(false)

  const form = useForm<PengaduanInput>({
    resolver: zodResolver(pengaduanSchema),
    defaultValues: { anonim: true, kategoriId: undefined as unknown as number, urgensi: "sedang", judul: "", isi: "" },
  })
  const anonim = form.watch("anonim")
  const urgensi = form.watch("urgensi")
  const isi = form.watch("isi") ?? ""

  // Ganti ke anonim → PDF tidak diizinkan (PRD §6).
  useEffect(() => {
    if (anonim && berkas?.type === "application/pdf") {
      setBerkas(null)
      setGalatBerkas("PDF dilepas: pengaduan anonim hanya boleh melampirkan gambar.")
    }
  }, [anonim, berkas])

  async function kirim() {
    const data = form.getValues()
    const fd = new FormData()
    fd.set("data", JSON.stringify(data))
    if (berkas) fd.set("lampiran", berkas)
    try {
      const r = await kirimPengaduanFn({ data: fd })
      onTerkirim({ kode: r.kodeTiket, anonim: data.anonim })
      window.scrollTo({ top: 0 })
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setKonfirmasi(false)
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(() => setKonfirmasi(true))}>
      <FieldGroup className="gap-8">
        {/* ------------------------------------------------ mode */}
        <Controller
          control={form.control}
          name="anonim"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>Kirim sebagai</FieldLegend>
              <RadioGroup
                value={field.value ? "anonim" : "identitas"}
                onValueChange={(v) => field.onChange(v === "anonim")}
                className="grid gap-3 sm:grid-cols-2"
              >
                <KartuMode
                  value="anonim"
                  aktif={field.value}
                  ikon={<ShieldCheck className="size-5" aria-hidden />}
                  judul="Anonim"
                  isi="Guru BK hanya melihat nama samaran dan kode tiket. Nama, NIS, dan kelasmu tidak ditampilkan."
                />
                <KartuMode
                  value="identitas"
                  aktif={!field.value}
                  ikon={<UserRound className="size-5" aria-hidden />}
                  judul="Dengan nama"
                  isi="Guru BK pembina kelasmu bisa langsung mengenali dan menghubungimu."
                />
              </RadioGroup>
              <Collapsible>
                <CollapsibleTrigger className="group mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  Apa yang dilihat Guru BK?
                  <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <PratinjauGuru anonim={field.value} nama={user.nama} kelas={user.keterangan} nis={user.username} />
                </CollapsibleContent>
              </Collapsible>
            </FieldSet>
          )}
        />

        {/* ------------------------------------------------ kategori */}
        <Controller
          control={form.control}
          name="kategoriId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id="label-kategori">Kategori</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                aria-labelledby="label-kategori"
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => v && field.onChange(Number(v))}
                className="flex flex-wrap justify-start gap-2"
              >
                {kategori.map((k) => (
                  <ToggleGroupItem
                    key={k.id}
                    value={String(k.id)}
                    title={k.deskripsi ?? undefined}
                    className="h-11 rounded-full! border px-4 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary md:h-9"
                  >
                    {k.nama}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {field.value ? (
                <FieldDescription>{kategori.find((k) => k.id === field.value)?.deskripsi}</FieldDescription>
              ) : null}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* ------------------------------------------------ urgensi */}
        <Controller
          control={form.control}
          name="urgensi"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Seberapa mendesak?</FieldLegend>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-2">
                {(
                  [
                    ["rendah", "Bisa menunggu"],
                    ["sedang", "Perlu dibahas minggu ini"],
                    ["tinggi", "Mendesak"],
                  ] as const
                ).map(([v, label]) => (
                  <FieldLabel
                    key={v}
                    htmlFor={`urgensi-${v}`}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10 md:min-h-9"
                  >
                    <RadioGroupItem value={v} id={`urgensi-${v}`} />
                    {label}
                  </FieldLabel>
                ))}
              </RadioGroup>
              {urgensi === "tinggi" && (
                <Alert className="mt-2 border-warning bg-warning/15">
                  <TriangleAlert aria-hidden />
                  <AlertTitle>Kalau kamu atau temanmu dalam bahaya sekarang</AlertTitle>
                  <AlertDescription>
                    Jangan menunggu balasan di sini. Segera temui Guru BK, wali kelas, atau orang dewasa yang kamu
                    percaya. Pengaduan mendesak tetap ditandai paling atas di daftar Guru BK.
                  </AlertDescription>
                </Alert>
              )}
            </FieldSet>
          )}
        />

        {/* ------------------------------------------------ judul & cerita */}
        <Field data-invalid={!!form.formState.errors.judul}>
          <FieldLabel htmlFor="judul">Judul singkat</FieldLabel>
          <Input
            id="judul"
            maxLength={150}
            placeholder="Misalnya: Sering diejek di kelas"
            aria-invalid={!!form.formState.errors.judul}
            className="h-11 text-base md:h-9 md:text-sm"
            {...form.register("judul")}
          />
          {form.formState.errors.judul && <FieldError errors={[form.formState.errors.judul]} />}
        </Field>

        <Field data-invalid={!!form.formState.errors.isi}>
          <FieldLabel htmlFor="isi">Ceritakan apa yang terjadi</FieldLabel>
          <Textarea
            id="isi"
            rows={7}
            maxLength={MAKS_ISI}
            placeholder="Apa yang terjadi, sejak kapan, dan bagaimana perasaanmu. Tulis sebisanya."
            aria-invalid={!!form.formState.errors.isi}
            aria-describedby="isi-bantuan"
            className="min-h-40 resize-y text-base md:text-sm"
            {...form.register("isi")}
          />
          <div id="isi-bantuan" className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {anonim
                ? "Supaya tetap anonim, hindari menulis namamu, kelasmu, atau detail yang mudah dikenali."
                : "Ceritakan sejelas mungkin supaya Guru BK bisa membantu."}
            </span>
            <span className="tabular">
              {isi.length.toLocaleString("id-ID")} / {MAKS_ISI.toLocaleString("id-ID")}
            </span>
          </div>
          {form.formState.errors.isi && <FieldError errors={[form.formState.errors.isi]} />}
        </Field>

        {/* ------------------------------------------------ lampiran */}
        <PilihLampiran
          anonim={anonim}
          berkas={berkas}
          galat={galatBerkas}
          onPilih={(f, g) => {
            setBerkas(f)
            setGalatBerkas(g)
          }}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="h-11 md:h-10">
            <Link to="/siswa">Batal</Link>
          </Button>
          <Button type="submit" className="h-11 px-6 text-base md:h-10 md:text-sm">
            Kirim pengaduan
          </Button>
        </div>
      </FieldGroup>

      <AlertDialog open={konfirmasi} onOpenChange={(o) => !form.formState.isSubmitting && setKonfirmasi(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{anonim ? "Kirim sebagai anonim?" : "Kirim dengan namamu?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {anonim
                ? "Guru BK akan melihat nama samaran dan kode tiket, tanpa nama, NIS, dan kelasmu."
                : `Guru BK akan melihat namamu (${user.nama}) dan kelasmu (${user.keterangan}).`}{" "}
              Pengaduan yang sudah dikirim tidak bisa diubah, tapi kamu bisa menambahkan cerita lewat balasan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                await form.handleSubmit(kirim)()
              }}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
              Kirim pengaduan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

function KartuMode({
  value,
  aktif,
  ikon,
  judul,
  isi,
}: {
  value: string
  aktif: boolean
  ikon: React.ReactNode
  judul: string
  isi: string
}) {
  return (
    <FieldLabel
      htmlFor={`mode-${value}`}
      className={cn(
        "flex cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 font-normal transition-colors",
        aktif ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
      )}
    >
      <span className="flex w-full items-center gap-2.5">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            value === "anonim" ? "bg-anon/10 text-anon dark:bg-anon/20" : "bg-primary/10 text-primary"
          )}
        >
          {ikon}
        </span>
        <span className="text-base font-semibold">{judul}</span>
        <RadioGroupItem value={value} id={`mode-${value}`} aria-label={judul} aria-describedby={`mode-${value}-isi`} className="ml-auto" />
      </span>
      <span id={`mode-${value}-isi`} className="text-sm leading-relaxed text-muted-foreground">{isi}</span>
    </FieldLabel>
  )
}

function PratinjauGuru({ anonim, nama, kelas, nis }: { anonim: boolean; nama: string; kelas: string; nis: string }) {
  return (
    <div className="mt-2 rounded-xl border bg-muted/40 p-4">
      <p className="mb-3 text-xs text-muted-foreground">Kira-kira seperti ini di daftar Guru BK:</p>
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        <LogoMark className="size-8" />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-medium">{anonim ? "Siswa Teal-42" : nama}</p>
          <p className="truncate text-xs text-muted-foreground">
            {anonim ? "BK-7F3K9Q · nama samaran dibuat otomatis" : `NIS ${nis} · ${kelas}`}
          </p>
        </div>
        {anonim && (
          <span className="ml-auto rounded-md bg-anon/10 px-2 py-0.5 text-xs font-medium text-anon dark:bg-anon/20">Anonim</span>
        )}
      </div>
    </div>
  )
}

function PilihLampiran({
  anonim,
  berkas,
  galat,
  onPilih,
}: {
  anonim: boolean
  berkas: File | null
  galat: string | null
  onPilih: (f: File | null, galat: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pratinjau, setPratinjau] = useState<string | null>(null)

  useEffect(() => {
    if (!berkas || !berkas.type.startsWith("image/")) {
      setPratinjau(null)
      return
    }
    const url = URL.createObjectURL(berkas)
    setPratinjau(url)
    return () => URL.revokeObjectURL(url)
  }, [berkas])

  function periksa(f: File) {
    const gambar = ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    if (!gambar && !(f.type === "application/pdf" && !anonim)) {
      return onPilih(null, anonim ? "Mode anonim hanya menerima gambar JPG, PNG, atau WEBP." : "Pilih gambar (JPG, PNG, WEBP) atau PDF.")
    }
    if (f.size > BATAS_BERKAS) return onPilih(null, "Ukuran lampiran maksimal 5 MB.")
    onPilih(f, null)
  }

  return (
    <Field data-invalid={!!galat}>
      <FieldLabel htmlFor="lampiran">
        Lampiran <span className="font-normal text-muted-foreground">(opsional)</span>
      </FieldLabel>
      {berkas ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          {pratinjau ? (
            <img src={pratinjau} alt="" className="size-14 rounded-lg object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-lg bg-muted text-xs font-semibold">PDF</span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{berkas.name}</p>
            <p className="text-muted-foreground">{(berkas.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Hapus lampiran" onClick={() => onPilih(null, null)}>
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Pilih {anonim ? "foto" : "foto atau PDF"}</span>
          <span className="text-xs text-muted-foreground">
            {anonim ? "JPG, PNG, WEBP" : "JPG, PNG, WEBP, PDF"} · maks. 5 MB · data lokasi di foto dihapus otomatis
          </span>
        </button>
      )}
      <input
        ref={input}
        id="lampiran"
        type="file"
        // Dipicu lewat tombol "Pilih foto" (input.click()). Tidak pakai sr-only karena Field
        // memaksa anaknya selebar penuh sehingga halaman melebar di HP.
        className="hidden"
        accept={anonim ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) periksa(f)
          e.target.value = ""
        }}
      />
      {galat && <FieldError>{galat}</FieldError>}
    </Field>
  )
}

function Sukses({ kode, anonim, onLagi }: { kode: string; anonim: boolean; onLagi: () => void }) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <CardTitle className="text-xl">Pengaduanmu sudah terkirim</CardTitle>
        <CardDescription>
          {anonim
            ? "Pengaduan masuk ke antrean Guru BK tanpa namamu. Balasan akan muncul di riwayat pengaduan."
            : "Guru BK pembina kelasmu akan membacanya. Balasan akan muncul di riwayat pengaduan."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-muted-foreground">Kode tiket</p>
          <div className="mt-1 flex items-center gap-2">
            <KodeTiket kode={kode} className="text-2xl" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Salin kode tiket"
              onClick={async () => {
                await navigator.clipboard.writeText(kode)
                toast.success("Kode tiket disalin.")
              }}
            >
              <Copy />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Simpan kode ini untuk mencari pengaduanmu. Kode hanya bisa dibuka dari akunmu sendiri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11 md:h-10">
            <Link to="/siswa/pengaduan/$kode" params={{ kode }}>
              Lihat pengaduan
            </Link>
          </Button>
          <Button variant="outline" className="h-11 md:h-10" onClick={onLagi}>
            Kirim pengaduan lain
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
