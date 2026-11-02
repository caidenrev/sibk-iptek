import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft, CalendarPlus, Check, Lock, MapPin, MessageSquareText, UserX } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { KodeTiket, StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { formatSlot, formatTanggal } from "@/lib/format"
import { pesanError } from "@/lib/pesan-error"
import { useAksi } from "@/lib/use-aksi"
import { detailJadwalGuruFn, simpanCatatanFn, tandaiSesiFn } from "@/server/functions/jadwal"

export const Route = createFileRoute("/guru/jadwal/$id")({
  params: { parse: (p) => ({ id: z.coerce.number().int().positive().parse(p.id) }), stringify: (p) => ({ id: String(p.id) }) },
  loader: async ({ params }) => {
    const d = await detailJadwalGuruFn({ data: { id: params.id } })
    if (!d) throw notFound()
    return d
  },
  head: () => ({ meta: [{ title: "Detail Sesi · SIBK" }] }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <p className="font-semibold">Sesi tidak ditemukan</p>
      <Button asChild variant="link">
        <Link to="/guru/jadwal">Kembali ke pengajuan & sesi</Link>
      </Button>
    </div>
  ),
  component: DetailSesi,
})

type Detail = Awaited<ReturnType<typeof detailJadwalGuruFn>> & {}

function DetailSesi() {
  const d = Route.useLoaderData()
  const aksi = useAksi()
  const [jalan, setJalan] = useState<string | null>(null)
  const tandai = async (hasil: "selesai" | "tidak_hadir") => {
    setJalan(hasil)
    await aksi(() => tandaiSesiFn({ data: { id: d.id, hasil } }), hasil === "selesai" ? "Sesi ditandai selesai. Sekarang isi catatannya." : "Sesi ditandai tidak hadir.")
    setJalan(null)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 h-11 text-muted-foreground md:h-8">
        <Link to="/guru/jadwal" search={{ tab: d.status === "menunggu" ? undefined : d.status === "disetujui" ? "disetujui" : "riwayat" }}>
          <ArrowLeft data-icon="inline-start" /> Pengajuan & sesi
        </Link>
      </Button>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{d.siswa.nama}</h1>
          <StatusBadge status={d.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.siswa.kelas} · NIS <span className="tabular">{d.siswa.nis}</span>
        </p>
        <p className="tabular mt-3 font-medium">{formatSlot(d.slot.tanggal, d.slot.jamMulai, d.slot.jamSelesai)}</p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden /> {d.slot.lokasi}
        </p>
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Topik: </span>
          {d.topik}
        </p>
        {d.pengaduan && (
          <Link
            to="/guru/pengaduan/$kode"
            params={{ kode: d.pengaduan.kodeTiket }}
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquareText className="size-4 shrink-0" aria-hidden />
            <KodeTiket kode={d.pengaduan.kodeTiket} className="text-xs" />
            <span className="truncate">{d.pengaduan.judul}</span>
          </Link>
        )}
        {d.status === "disetujui" && d.sudahMulai && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="h-11 md:h-9" disabled={jalan !== null} onClick={() => tandai("selesai")}>
              {jalan === "selesai" ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />} Tandai selesai
            </Button>
            <Button variant="outline" className="h-11 md:h-9" disabled={jalan !== null} onClick={() => tandai("tidak_hadir")}>
              {jalan === "tidak_hadir" ? <Spinner data-icon="inline-start" /> : <UserX data-icon="inline-start" />} Tidak hadir
            </Button>
          </div>
        )}
      </header>

      <KartuCatatan d={d} />

      {d.riwayat.length > 0 && (
        <section className="mt-6" aria-labelledby="judul-riwayat">
          <h2 id="judul-riwayat" className="mb-3 font-semibold">
            Sesi sebelumnya dengan {d.siswa.nama.split(" ")[0]}
          </h2>
          <ul className="grid gap-3">
            {d.riwayat.map((r) => (
              <li key={r.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to="/guru/jadwal/$id" params={{ id: r.id }} className="tabular font-medium text-primary underline-offset-4 hover:underline">
                    {formatSlot(r.slot.tanggal, r.slot.jamMulai, r.slot.jamSelesai)}
                  </Link>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-muted-foreground">Topik: {r.topik}</p>
                {r.catatan ? (
                  <p className="mt-2 whitespace-pre-line">{r.catatan.ringkasan}</p>
                ) : (
                  <p className="mt-2 text-muted-foreground">Tanpa catatan.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function KartuCatatan({ d }: { d: Detail }) {
  const aksi = useAksi()
  const [ringkasan, setRingkasan] = useState(d.catatan?.ringkasanMasalah ?? "")
  const [tindak, setTindak] = useState(d.catatan?.tindakLanjut ?? "")
  const [tampil, setTampil] = useState(d.catatan?.tampilkanKeSiswa ?? false)
  const [lanjutan, setLanjutan] = useState(d.catatan?.perluLanjutan ?? false)
  const [galat, setGalat] = useState<string | null>(null)
  const [jalan, setJalan] = useState(false)

  if (d.status !== "selesai") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4 text-muted-foreground" aria-hidden /> Catatan konseling
          </CardTitle>
          <CardDescription>
            {d.status === "tidak_hadir"
              ? "Siswa tidak hadir, jadi sesi ini tidak punya catatan."
              : "Catatan bisa diisi setelah sesi berlangsung dan ditandai Selesai."}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="size-4 text-muted-foreground" aria-hidden /> Catatan konseling
        </CardTitle>
        <CardDescription>
          Ringkasan hanya bisa dibaca olehmu. Siswa hanya melihat tindak lanjut bila kamu mengizinkannya. Admin tidak bisa membuka catatan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (ringkasan.trim().length < 10) {
              setGalat("Tulis ringkasan minimal 10 karakter.")
              return
            }
            setJalan(true)
            await aksi(
              () => simpanCatatanFn({ data: { jadwalId: d.id, ringkasanMasalah: ringkasan, tindakLanjut: tindak, tampilkanKeSiswa: tampil, perluLanjutan: lanjutan } }),
              "Catatan tersimpan."
            ).catch((err) => toast.error(pesanError(err)))
            setJalan(false)
          }}
        >
          <Field data-invalid={!!galat}>
            <FieldLabel htmlFor="ringkasan">Ringkasan masalah</FieldLabel>
            <Textarea
              id="ringkasan"
              rows={6}
              maxLength={5000}
              value={ringkasan}
              onChange={(e) => {
                setRingkasan(e.target.value)
                setGalat(null)
              }}
              placeholder="Apa yang dibicarakan, hal penting yang perlu diingat untuk sesi berikutnya."
              aria-invalid={!!galat}
              className="text-base md:text-sm"
            />
            {galat && <FieldError>{galat}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="tindak">Tindak lanjut</FieldLabel>
            <Textarea
              id="tindak"
              rows={3}
              maxLength={2000}
              value={tindak}
              onChange={(e) => {
                setTindak(e.target.value)
                if (!e.target.value.trim()) setTampil(false)
              }}
              placeholder="Misalnya: Siswa mencoba jurnal harian selama seminggu, lalu kita bahas lagi."
              className="text-base md:text-sm"
            />
          </Field>

          <Field orientation="horizontal" className="items-center justify-between rounded-xl border p-3">
            <div className="grid gap-0.5">
              <FieldLabel htmlFor="tampil">Tampilkan tindak lanjut ke siswa</FieldLabel>
              <FieldDescription>Muncul di riwayat jadwal siswa. Ringkasan masalah tetap tidak terlihat.</FieldDescription>
            </div>
            <Switch id="tampil" checked={tampil} disabled={!tindak.trim()} onCheckedChange={setTampil} />
          </Field>

          <Field orientation="horizontal" className="items-start gap-3">
            <Checkbox id="lanjutan" checked={lanjutan} onCheckedChange={(c) => setLanjutan(c === true)} className="mt-0.5" />
            <div className="grid gap-0.5">
              <FieldLabel htmlFor="lanjutan">Perlu sesi lanjutan</FieldLabel>
              <FieldDescription>Penanda untukmu. Buka slot baru supaya siswa bisa mengajukan lagi.</FieldDescription>
            </div>
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="h-11 md:h-9" disabled={jalan}>
              {jalan && <Spinner data-icon="inline-start" />} Simpan catatan
            </Button>
            {lanjutan && (
              <Button asChild variant="outline" className="h-11 md:h-9">
                <Link to="/guru/slot">
                  <CalendarPlus data-icon="inline-start" /> Buka slot lanjutan
                </Link>
              </Button>
            )}
            {d.catatan && <span className="text-xs text-muted-foreground">Terakhir disimpan {formatTanggal(d.catatan.diperbarui)}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
