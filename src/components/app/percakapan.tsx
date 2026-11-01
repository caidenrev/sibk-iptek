import { zodResolver } from "@hookform/resolvers/zod"
import { FileText, ImageIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { formatJam, formatTanggalPendek } from "@/lib/format"
import { cn } from "@/lib/utils"
import { pesanSchema } from "@/lib/validasi"

// Warna mengikuti logo SIBK: siswa = teal tua, Guru BK = teal muda.
// Posisi mengikuti pembaca: pesan milik pembaca selalu di kanan.

export type Pesan = {
  id: number | string
  pengirim: "siswa" | "guru_bk"
  isi: string
  guruNama?: string | null
  createdAt: Date | string
}

function waktu(d: Date | string) {
  return `${formatTanggalPendek(d)} · ${formatJam(d)}`
}

export function Percakapan({
  pesan,
  pembaca,
  labelSiswa,
}: {
  pesan: Array<Pesan>
  pembaca: "siswa" | "guru_bk"
  /** Nama tampilan siswa bagi Guru BK (alias bila anonim). Untuk pembaca siswa: "Kamu". */
  labelSiswa: string
}) {
  return (
    <ol className="grid gap-4" aria-label="Percakapan">
      {pesan.map((p) => {
        const milikSaya = p.pengirim === pembaca
        const dariSiswa = p.pengirim === "siswa"
        const nama = dariSiswa ? labelSiswa : (p.guruNama ?? "Guru BK")
        return (
          <li key={p.id} className={cn("flex max-w-[85%] flex-col gap-1 md:max-w-[75%]", milikSaya && "items-end self-end")}>
            <span className="px-1 text-xs text-muted-foreground">
              {milikSaya ? "Kamu" : nama} · <time dateTime={new Date(p.createdAt).toISOString()}>{waktu(p.createdAt)}</time>
            </span>
            <p
              className={cn(
                "rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap",
                dariSiswa ? "bg-primary text-primary-foreground" : "bg-logo-2 text-[#0f2a2e]",
                milikSaya ? "rounded-br-sm" : "rounded-bl-sm"
              )}
            >
              {p.isi}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/** Kotak lampiran: gambar ditampilkan kecil, PDF sebagai tautan. Dibuka lewat route yang memeriksa hak akses. */
export function Lampiran({ kode, tipe }: { kode: string; tipe: string | null }) {
  if (!tipe) return null
  const url = `/api/lampiran/${kode}`
  if (tipe === "application/pdf") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-muted"
      >
        <FileText className="size-4 text-muted-foreground" aria-hidden /> Buka lampiran PDF
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block w-fit rounded-xl border bg-card p-1.5">
      <img src={url} alt="Lampiran pengaduan" loading="lazy" className="max-h-56 rounded-lg object-contain" />
      <span className="flex items-center gap-1.5 px-1.5 pt-1.5 pb-0.5 text-xs text-muted-foreground group-hover:text-foreground">
        <ImageIcon className="size-3.5" aria-hidden /> Buka ukuran penuh
      </span>
    </a>
  )
}

const formSchema = z.object({ isi: pesanSchema })

/** Kotak balas di bawah percakapan. `onKirim` mengembalikan true bila berhasil (form dikosongkan). */
export function FormBalas({
  onKirim,
  placeholder = "Tulis balasan…",
  label = "Balasan",
}: {
  onKirim: (isi: string) => Promise<boolean>
  placeholder?: string
  label?: string
}) {
  const form = useForm<z.input<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { isi: "" } })
  const galat = form.formState.errors.isi
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async ({ isi }) => {
        if (await onKirim(isi)) form.reset({ isi: "" })
      })}
      className="grid gap-2"
    >
      <Field data-invalid={!!galat}>
        <label htmlFor="isi-balasan" className="sr-only">
          {label}
        </label>
        <Textarea
          id="isi-balasan"
          rows={3}
          placeholder={placeholder}
          aria-invalid={!!galat}
          className="min-h-24 resize-y text-base md:text-sm"
          {...form.register("isi")}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter untuk mengirim cepat
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void form.handleSubmit(async ({ isi }) => {
                if (await onKirim(isi)) form.reset({ isi: "" })
              })()
            }
          }}
        />
        {galat && <FieldError errors={[galat]} />}
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="hidden text-xs text-muted-foreground md:inline">Ctrl + Enter untuk mengirim</span>
        <Button type="submit" className="h-11 md:h-9" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Kirim balasan
        </Button>
      </div>
    </form>
  )
}
