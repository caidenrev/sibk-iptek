import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarPlus, CalendarX2, MapPin, MessageSquareText, X } from "lucide-react"
import { useState } from "react"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { KodeTiket, StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatSlot } from "@/lib/format"
import { batalkanJadwalFn, jadwalSayaFn } from "@/server/functions/jadwal"

export const Route = createFileRoute("/siswa/jadwal/")({
  loader: () => jadwalSayaFn(),
  head: () => ({ meta: [{ title: "Jadwal Konseling · SIBK" }] }),
  component: JadwalSaya,
})

type Jadwal = Awaited<ReturnType<typeof jadwalSayaFn>>[number]

const aktif = (j: Jadwal) => (j.status === "menunggu" || j.status === "disetujui") && !j.sudahLewat

function JadwalSaya() {
  const semua = Route.useLoaderData()
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)
  // Mendatang: terdekat dulu. Riwayat: terbaru dulu (urutan dari server).
  const mendatang = semua.filter(aktif).reverse()
  const riwayat = semua.filter((j) => !aktif(j))

  const batalkan = (j: Jadwal) =>
    setKonfirmasi({
      judul: "Batalkan jadwal ini?",
      deskripsi: `${j.guruNama} · ${formatSlot(j.slot.tanggal, j.slot.jamMulai, j.slot.jamSelesai)}. Slot akan dibuka lagi untuk siswa lain.`,
      aksi: "Batalkan jadwal",
      bahaya: true,
      jalankan: () => batalkanJadwalFn({ data: { id: j.id } }),
    })

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Jadwal konseling"
        description="Pengajuan bertemu Guru BK. Pembatalan bisa dilakukan paling lambat 2 jam sebelum sesi."
        actions={
          <Button asChild className="h-11 md:h-9">
            <Link to="/siswa/jadwal/ajukan">
              <CalendarPlus data-icon="inline-start" /> Ajukan konseling
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="mendatang">
        <TabsList>
          <TabsTrigger value="mendatang">Mendatang ({mendatang.length})</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat ({riwayat.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="mendatang" className="mt-4">
          {mendatang.length === 0 ? (
            <Empty className="border bg-card py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarPlus />
                </EmptyMedia>
                <EmptyTitle>Belum ada jadwal</EmptyTitle>
                <EmptyDescription>Ingin bertemu Guru BK langsung? Pilih waktu yang cocok untukmu.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild className="h-11 md:h-9">
                  <Link to="/siswa/jadwal/ajukan">Ajukan konseling</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="grid gap-3">
              {mendatang.map((j) => (
                <li key={j.id}>
                  <KartuJadwal jadwal={j} onBatal={() => batalkan(j)} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="riwayat" className="mt-4">
          {riwayat.length === 0 ? (
            <Empty className="border bg-card py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarX2 />
                </EmptyMedia>
                <EmptyTitle>Belum ada riwayat</EmptyTitle>
                <EmptyDescription>Sesi yang sudah lewat, ditolak, atau dibatalkan akan tercatat di sini.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid gap-3">
              {riwayat.map((j) => (
                <li key={j.id}>
                  <KartuJadwal jadwal={j} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </div>
  )
}

function KartuJadwal({ jadwal: j, onBatal }: { jadwal: Jadwal; onBatal?: () => void }) {
  // Sesi disetujui yang sudah lewat tapi belum ditandai Guru BK: tampilkan sebagai "menunggu dicatat", bukan "Disetujui".
  const belumDicatat = j.status === "disetujui" && j.sudahLewat
  return (
    <article className="grid gap-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="tabular font-semibold">{formatSlot(j.slot.tanggal, j.slot.jamMulai, j.slot.jamSelesai)}</p>
          <p className="text-sm text-muted-foreground">
            {j.guruNama} ·{" "}
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {j.slot.lokasi}
            </span>
          </p>
        </div>
        {belumDicatat ? <span className="text-xs text-muted-foreground">Menunggu dicatat Guru BK</span> : <StatusBadge status={j.status} />}
      </div>
      <p className="text-sm">
        <span className="text-muted-foreground">Topik: </span>
        {j.topik}
      </p>
      {j.pengaduan && (
        <Link
          to="/siswa/pengaduan/$kode"
          params={{ kode: j.pengaduan.kodeTiket }}
          className="inline-flex max-w-full items-center gap-1.5 justify-self-start rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageSquareText className="size-4 shrink-0" aria-hidden />
          <KodeTiket kode={j.pengaduan.kodeTiket} className="text-xs" />
          <span className="truncate">{j.pengaduan.judul}</span>
        </Link>
      )}
      {j.status === "menunggu" && !j.sudahLewat && (
        <p className="text-sm text-muted-foreground">Guru BK akan menyetujui atau memberi alasan bila tidak bisa.</p>
      )}
      {j.tindakLanjut && (
        <div className="rounded-lg bg-primary/5 px-3 py-2 text-sm dark:bg-primary/10">
          <p className="font-medium">Tindak lanjut dari {j.guruNama.split(" ")[0]}</p>
          <p className="mt-0.5 whitespace-pre-line">{j.tindakLanjut}</p>
        </div>
      )}
      {j.alasanPenolakan && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium">Alasan dari Guru BK: </span>
          {j.alasanPenolakan}
        </p>
      )}
      {onBatal &&
        (j.masihBisaBatal ? (
          <Button variant="outline" className="h-11 justify-self-start md:h-9" onClick={onBatal}>
            <X data-icon="inline-start" /> Batalkan
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Kurang dari 2 jam lagi. Kalau berhalangan, hubungi Guru BK langsung.</p>
        ))}
    </article>
  )
}
