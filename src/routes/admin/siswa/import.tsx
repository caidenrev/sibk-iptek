import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, RotateCcw, TriangleAlert, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { DataTable } from "@/components/app/data-table"
import { PageHeader } from "@/components/app/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bacaFile, templateCsv } from "@/lib/import-siswa"
import { pesanError } from "@/lib/pesan-error"
import { cn } from "@/lib/utils"
import { opsiKelasFn } from "@/server/functions/master"
import { pratinjauImportFn, simpanImportFn } from "@/server/functions/siswa"
import type { HasilPratinjau } from "@/server/functions/siswa"

export const Route = createFileRoute("/admin/siswa/import")({
  loader: () => opsiKelasFn(),
  head: () => ({ meta: [{ title: "Import Siswa · SIBK" }] }),
  component: HalamanImport,
})

const UKURAN_BATCH = 25

type Tahap =
  | { t: "pilih" }
  | { t: "membaca"; nama: string }
  | { t: "pratinjau"; nama: string; hasil: Array<HasilPratinjau> }
  | { t: "menyimpan"; nama: string; selesai: number; total: number }
  | { t: "selesai"; berhasil: number; gagal: Array<{ baris: number; nis: string; alasan: string }> }

function HalamanImport() {
  const kelas = Route.useLoaderData()
  const router = useRouter()
  const [tahap, setTahap] = useState<Tahap>({ t: "pilih" })

  async function proses(file: File) {
    setTahap({ t: "membaca", nama: file.name })
    try {
      const rows = await bacaFile(file)
      const hasil = await pratinjauImportFn({ data: { rows } })
      setTahap({ t: "pratinjau", nama: file.name, hasil })
    } catch (e) {
      toast.error(pesanError(e, "File tidak bisa dibaca."))
      setTahap({ t: "pilih" })
    }
  }

  async function simpan(hasil: Array<HasilPratinjau>, nama: string) {
    const valid = hasil.flatMap((h) => (h.data ? [h.data] : []))
    let berhasil = 0
    const gagal: Array<{ baris: number; nis: string; alasan: string }> = []
    setTahap({ t: "menyimpan", nama, selesai: 0, total: valid.length })
    for (let i = 0; i < valid.length; i += UKURAN_BATCH) {
      const batch = valid.slice(i, i + UKURAN_BATCH)
      try {
        const r = await simpanImportFn({ data: { rows: batch } })
        berhasil += r.berhasil
        gagal.push(...r.gagal)
      } catch (e) {
        const alasan = pesanError(e)
        gagal.push(...batch.map((b) => ({ baris: b.baris, nis: b.nis, alasan })))
      }
      setTahap({ t: "menyimpan", nama, selesai: Math.min(i + UKURAN_BATCH, valid.length), total: valid.length })
    }
    setTahap({ t: "selesai", berhasil, gagal })
    await router.invalidate()
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
        <Link to="/admin/siswa">
          <ArrowLeft data-icon="inline-start" /> Data siswa
        </Link>
      </Button>
      <PageHeader title="Import Siswa" description="Tambahkan banyak siswa sekaligus dari file Excel atau CSV." />

      {(tahap.t === "pilih" || tahap.t === "membaca") && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <PilihFile onPilih={proses} membaca={tahap.t === "membaca" ? tahap.nama : null} />
          <Petunjuk kelas={kelas} />
        </div>
      )}

      {tahap.t === "pratinjau" && (
        <Pratinjau
          nama={tahap.nama}
          hasil={tahap.hasil}
          onUlang={() => setTahap({ t: "pilih" })}
          onSimpan={() => simpan(tahap.hasil, tahap.nama)}
        />
      )}

      {tahap.t === "menyimpan" && (
        <Card>
          <CardHeader>
            <CardTitle>Menyimpan siswa…</CardTitle>
            <CardDescription>Jangan tutup halaman ini. Setiap akun dibuatkan password terenkripsi, jadi butuh beberapa detik.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Progress value={(tahap.selesai / tahap.total) * 100} aria-label="Progres penyimpanan" />
            <p className="tabular text-sm text-muted-foreground">
              {tahap.selesai} dari {tahap.total} siswa
            </p>
          </CardContent>
        </Card>
      )}

      {tahap.t === "selesai" && (
        <Card>
          <CardHeader>
            <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
            <CardTitle>{tahap.berhasil} siswa berhasil ditambahkan</CardTitle>
            <CardDescription>
              Siswa dapat login memakai NIS sebagai username dan password awal, lalu diminta membuat password baru.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {tahap.gagal.length > 0 && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{tahap.gagal.length} baris gagal disimpan</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc pl-4">
                    {tahap.gagal.slice(0, 10).map((g) => (
                      <li key={g.baris}>
                        Baris {g.baris} (NIS {g.nis}): {g.alasan}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/admin/siswa">Lihat data siswa</Link>
              </Button>
              <Button variant="outline" onClick={() => setTahap({ t: "pilih" })}>
                Import file lain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PilihFile({ onPilih, membaca }: { onPilih: (f: File) => void; membaca: string | null }) {
  const input = useRef<HTMLInputElement>(null)
  const [seret, setSeret] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Pilih file</CardTitle>
        <CardDescription>Format .xlsx atau .csv, maksimal 2.000 baris.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setSeret(true)
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault()
            setSeret(false)
            const f = e.dataTransfer.files[0]
            if (f) onPilih(f)
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            seret ? "border-primary bg-primary/5" : "hover:bg-muted/50",
            membaca && "pointer-events-none opacity-70"
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {membaca ? <Spinner className="size-6" /> : <Upload className="size-6" aria-hidden />}
          </span>
          {membaca ? (
            <span className="text-sm">Memeriksa {membaca}…</span>
          ) : (
            <>
              <span className="font-medium">Seret file ke sini, atau klik untuk memilih</span>
              <span className="text-sm text-muted-foreground">Data belum disimpan sampai kamu menyetujui pratinjau.</span>
            </>
          )}
          <input
            ref={input}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPilih(f)
              e.target.value = ""
            }}
          />
        </label>
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => {
            const url = URL.createObjectURL(templateCsv())
            const a = document.createElement("a")
            a.href = url
            a.download = "template-import-siswa.csv"
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          <Download data-icon="inline-start" /> Unduh template
        </Button>
      </CardContent>
    </Card>
  )
}

function Petunjuk({ kelas }: { kelas: Array<{ id: number; nama: string }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4" aria-hidden /> Format kolom
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <dt className="font-mono text-xs font-semibold">nis</dt>
          <dd>Wajib, angka saja</dd>
          <dt className="font-mono text-xs font-semibold">nama</dt>
          <dd>Wajib</dd>
          <dt className="font-mono text-xs font-semibold">jenis_kelamin</dt>
          <dd>Wajib, L atau P</dd>
          <dt className="font-mono text-xs font-semibold">kelas</dt>
          <dd>Wajib, harus sama dengan nama kelas terdaftar</dd>
          <dt className="font-mono text-xs font-semibold">email</dt>
          <dd className="text-muted-foreground">Opsional</dd>
          <dt className="font-mono text-xs font-semibold">no_whatsapp</dt>
          <dd className="text-muted-foreground">Opsional, contoh 0812…</dd>
        </dl>
        <div>
          <p className="mb-2 font-medium">Kelas terdaftar</p>
          {kelas.length ? (
            <div className="flex flex-wrap gap-1.5">
              {kelas.map((k) => (
                <Badge key={k.id} variant="secondary">
                  {k.nama}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Belum ada kelas.{" "}
              <Link to="/admin/kelas" className="text-primary underline underline-offset-4">
                Tambahkan kelas dulu
              </Link>
              .
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Pratinjau({
  nama,
  hasil,
  onUlang,
  onSimpan,
}: {
  nama: string
  hasil: Array<HasilPratinjau>
  onUlang: () => void
  onSimpan: () => void
}) {
  const [filter, setFilter] = useState<"semua" | "masalah">(() => (hasil.some((h) => !h.valid) ? "masalah" : "semua"))
  const valid = hasil.filter((h) => h.valid).length
  const masalah = hasil.length - valid
  const tampil = filter === "masalah" ? hasil.filter((h) => !h.valid) : hasil

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>2. Periksa pratinjau</CardTitle>
          <CardDescription>
            {nama} · {hasil.length} baris
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-success" aria-hidden />
              <span className="tabular font-semibold">{valid}</span> siap disimpan
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-destructive" aria-hidden />
              <span className="tabular font-semibold">{masalah}</span> bermasalah (dilewati)
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onUlang}>
              <RotateCcw data-icon="inline-start" /> Pilih file lain
            </Button>
            <Button onClick={onSimpan} disabled={valid === 0}>
              Simpan {valid} siswa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "semua")}>
        <TabsList>
          <TabsTrigger value="masalah">Bermasalah ({masalah})</TabsTrigger>
          <TabsTrigger value="semua">Semua ({hasil.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable<HasilPratinjau>
        rows={tampil.slice(0, 300)}
        rowKey={(h) => h.baris}
        kosong={{ judul: "Tidak ada baris bermasalah", deskripsi: "Semua baris siap disimpan." }}
        kolom={[
          { header: "Baris", className: "w-16 tabular text-muted-foreground", cell: (h) => h.baris },
          { header: "NIS", className: "tabular", cell: (h) => h.nis || "—" },
          { header: "Nama", cell: (h) => h.nama || "—" },
          { header: "L/P", className: "max-sm:hidden", cell: (h) => h.jenisKelamin || "—" },
          { header: "Kelas", cell: (h) => h.kelas || "—" },
          {
            header: "Status",
            className: "whitespace-normal",
            cell: (h) =>
              h.valid ? (
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="size-4" aria-hidden /> Siap
                </span>
              ) : (
                <ul className="text-sm text-destructive">
                  {h.alasan.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ),
          },
        ]}
      />
      {tampil.length > 300 && (
        <p className="text-sm text-muted-foreground">Menampilkan 300 baris pertama dari {tampil.length}.</p>
      )}
    </div>
  )
}
