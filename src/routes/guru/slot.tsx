import { zodResolver } from "@hookform/resolvers/zod"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { CalendarPlus, ChevronLeft, ChevronRight, Lock, LockOpen, MapPin, Plus, Trash2, UserRound } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { FormInput } from "@/components/app/form"
import { FormSheet } from "@/components/app/form-sheet"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatHari, formatTanggalPendek, jamTitik } from "@/lib/format"
import { NAMA_HARI, geserTanggal, hariIniWib, hariIso, seninDari, tanggalSlotBerulang } from "@/lib/tanggal"
import { useAksi } from "@/lib/use-aksi"
import { cn } from "@/lib/utils"
import { slotSchema, tanggalSchema } from "@/lib/validasi"
import type { SlotInput } from "@/lib/validasi"
import { slotMingguanFn, tambahSlotFn, ubahSlotFn } from "@/server/functions/jadwal"

export const Route = createFileRoute("/guru/slot")({
  validateSearch: z.object({ minggu: tanggalSchema.optional().catch(undefined) }),
  loaderDeps: ({ search }) => ({ minggu: search.minggu }),
  loader: ({ deps }) => slotMingguanFn({ data: { mulai: seninDari(deps.minggu ?? hariIniWib()) } }),
  head: () => ({ meta: [{ title: "Slot Jadwal · SIBK" }] }),
  component: HalamanSlot,
})

type Slot = Awaited<ReturnType<typeof slotMingguanFn>>["slot"][number]

function HalamanSlot() {
  const { hariIni, slot } = Route.useLoaderData()
  const { minggu } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [tambah, setTambah] = useState(false)
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)

  const senin = seninDari(minggu ?? hariIni)
  const mingguIni = seninDari(hariIni)
  const hari = Array.from({ length: 7 }, (_, i) => geserTanggal(senin, i))
  // Sekolah buka Senin–Sabtu; kolom Minggu hanya muncul kalau memang ada slot.
  const tampil = hari.filter((t, i) => i < 6 || slot.some((s) => s.tanggal === t))
  const keMinggu = (t: string) => navigate({ search: { minggu: t === mingguIni ? undefined : t } })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Slot jadwal"
        description="Waktu kamu bisa ditemui siswa. Siswa bisa memesan slot paling lambat 2 jam sebelum mulai."
        actions={
          <Button className="h-11 md:h-9" onClick={() => setTambah(true)}>
            <Plus data-icon="inline-start" /> Tambah slot
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="size-11 md:size-9" aria-label="Minggu sebelumnya" onClick={() => keMinggu(geserTanggal(senin, -7))}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" className="size-11 md:size-9" aria-label="Minggu berikutnya" onClick={() => keMinggu(geserTanggal(senin, 7))}>
          <ChevronRight />
        </Button>
        <p className="tabular px-1 font-semibold">
          {formatTanggalPendek(senin).replace(/ \d{4}$/, "")} – {formatTanggalPendek(geserTanggal(senin, 6))}
        </p>
        {senin !== mingguIni && (
          <Button variant="ghost" className="h-11 text-primary md:h-9" onClick={() => keMinggu(mingguIni)}>
            Minggu ini
          </Button>
        )}
      </div>

      {slot.length === 0 ? (
        <Empty className="border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlus />
            </EmptyMedia>
            <EmptyTitle>Belum ada slot minggu ini</EmptyTitle>
            <EmptyDescription>Tambahkan waktu kamu bisa ditemui. Slot berulang tiap minggu bisa dibuat sekaligus.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="h-11 md:h-9" onClick={() => setTambah(true)}>
              <Plus data-icon="inline-start" /> Tambah slot
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className={cn("grid gap-3", tampil.length === 7 ? "lg:grid-cols-7" : "lg:grid-cols-6")}>
          {tampil.map((t) => {
            const isi = slot.filter((s) => s.tanggal === t)
            const hariIniKah = t === hariIni
            return (
              <section key={t} aria-label={formatHari(t)} className={cn("rounded-2xl border bg-card p-3", hariIniKah && "border-primary/50 ring-1 ring-primary/30")}>
                <h2 className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold">
                  <span>{formatHari(t)}</span>
                  {hariIniKah && <span className="text-xs font-medium text-primary">Hari ini</span>}
                </h2>
                {isi.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada slot</p>
                ) : (
                  <ul className="grid gap-2">
                    {isi.map((s) => (
                      <li key={s.id}>
                        <BlokSlot slot={s} onHapus={() => setKonfirmasi(konfirmasiHapus(s))} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {slot.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Keterangan warna">
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-primary/50 bg-primary/10" /> Tersedia</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-info/20" /> Menunggu persetujuan</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" /> Disetujui</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-muted ring-1 ring-border" /> Ditutup</li>
        </ul>
      )}

      <TambahSlot
        open={tambah}
        onOpenChange={setTambah}
        hariIni={hariIni}
        tanggalAwal={senin > hariIni ? senin : hariIni}
        onTersimpan={(t) => keMinggu(seninDari(t))}
      />
      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </div>
  )
}

function konfirmasiHapus(s: Slot): KonfirmasiState {
  return {
    judul: "Hapus slot ini?",
    deskripsi: `${formatHari(s.tanggal)}, ${jamTitik(s.jamMulai)}–${jamTitik(s.jamSelesai)} di ${s.lokasi}. Siswa tidak bisa memesannya lagi.`,
    aksi: "Hapus slot",
    bahaya: true,
    jalankan: () => ubahSlotFn({ data: { id: s.id, aksi: "hapus" } }),
  }
}

function BlokSlot({ slot: s, onHapus }: { slot: Slot; onHapus: () => void }) {
  const aksi = useAksi()
  const p = s.pengajuan
  const gaya =
    s.status === "ditutup"
      ? "bg-muted text-muted-foreground"
      : p?.status === "disetujui"
        ? "bg-primary text-primary-foreground"
        : p
          ? "bg-info/15 text-foreground dark:bg-info/25"
          : "border border-primary/40 bg-primary/5 hover:bg-primary/10"
  const keterangan = s.status === "ditutup" ? "Ditutup" : p ? (p.status === "disetujui" ? "Disetujui" : "Menunggu") : s.lewat ? "Lewat" : "Tersedia"
  const bisaTutup = s.status === "tersedia" && !s.lewat
  const bisaBuka = s.status === "ditutup" && !s.lewat
  const bisaHapus = s.status !== "dipesan" && !s.punyaRiwayat

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "grid w-full gap-0.5 rounded-xl px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          gaya,
          s.lewat && "opacity-60"
        )}
        aria-label={`Slot ${jamTitik(s.jamMulai)} sampai ${jamTitik(s.jamSelesai)}, ${keterangan}${p ? `, ${p.siswa}` : ""}. Buka pilihan.`}
      >
        <span className="tabular font-semibold">
          {jamTitik(s.jamMulai)}–{jamTitik(s.jamSelesai)}
        </span>
        {p ? (
          <span className="flex min-w-0 items-center gap-1">
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{p.siswa}</span>
          </span>
        ) : (
          <span className={cn("flex min-w-0 items-center gap-1", s.status !== "ditutup" && "text-muted-foreground")}>
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{s.lokasi}</span>
          </span>
        )}
        <span className={cn("text-xs", p?.status === "disetujui" ? "opacity-90" : "text-muted-foreground")}>{keterangan}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="grid font-normal">
          <span className="font-semibold">
            {formatHari(s.tanggal)}, {jamTitik(s.jamMulai)}–{jamTitik(s.jamSelesai)}
          </span>
          <span className="text-xs text-muted-foreground">{s.lokasi}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {p && (
          <DropdownMenuItem asChild>
            <Link to="/guru/jadwal" search={{ tab: p.status === "disetujui" ? "disetujui" : "menunggu" }}>
              <UserRound /> Lihat pengajuan {p.siswa}
            </Link>
          </DropdownMenuItem>
        )}
        {bisaTutup && (
          <DropdownMenuItem onSelect={() => void aksi(() => ubahSlotFn({ data: { id: s.id, aksi: "tutup" } }), "Slot ditutup. Siswa tidak bisa memesannya.")}>
            <Lock /> Tutup slot
          </DropdownMenuItem>
        )}
        {bisaBuka && (
          <DropdownMenuItem onSelect={() => void aksi(() => ubahSlotFn({ data: { id: s.id, aksi: "buka" } }), "Slot dibuka lagi.")}>
            <LockOpen /> Buka lagi
          </DropdownMenuItem>
        )}
        {bisaHapus && (
          <DropdownMenuItem variant="destructive" onSelect={onHapus}>
            <Trash2 /> Hapus slot
          </DropdownMenuItem>
        )}
        {!p && !bisaTutup && !bisaBuka && !bisaHapus && (
          <DropdownMenuItem disabled>Slot sudah lewat dan punya riwayat</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const PILIHAN_MINGGU = [2, 3, 4, 6, 8, 12]

function TambahSlot({
  open,
  onOpenChange,
  hariIni,
  tanggalAwal,
  onTersimpan,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  hariIni: string
  tanggalAwal: string
  onTersimpan: (tanggal: string) => void
}) {
  const aksi = useAksi()
  const form = useForm<SlotInput>({
    resolver: zodResolver(slotSchema),
    values: { tanggal: tanggalAwal, jamMulai: "10:00", jamSelesai: "11:00", lokasi: "Ruang BK", ulangiMinggu: 0, hari: [] },
  })
  const v = form.watch()
  const ulang = (v.ulangiMinggu ?? 0) > 0
  const tanggal = v.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(v.tanggal) ? tanggalSlotBerulang(v.tanggal, v.hari ?? [], v.ulangiMinggu ?? 0) : []

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      judul="Tambah slot"
      deskripsi="Satu slot untuk satu siswa. Slot tidak boleh bertabrakan dengan slot kamu yang lain."
      labelSimpan={tanggal.length > 1 ? `Tambah ${tanggal.length} slot` : "Tambah slot"}
      menyimpan={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(async (data) => {
        const ok = await aksi(() => tambahSlotFn({ data }), tanggal.length > 1 ? `${tanggal.length} slot ditambahkan.` : "Slot ditambahkan.")
        if (ok) {
          onOpenChange(false)
          form.reset()
          onTersimpan(data.tanggal)
        }
      })}
    >
      <FormInput control={form.control} name="tanggal" label={ulang ? "Mulai tanggal" : "Tanggal"} type="date" min={hariIni} className="[&_input]:h-11 md:[&_input]:h-9" />
      <div className="grid grid-cols-2 gap-3">
        <FormInput control={form.control} name="jamMulai" label="Jam mulai" type="time" step={900} className="[&_input]:h-11 md:[&_input]:h-9" />
        <FormInput control={form.control} name="jamSelesai" label="Jam selesai" type="time" step={900} className="[&_input]:h-11 md:[&_input]:h-9" />
      </div>
      <FormInput control={form.control} name="lokasi" label="Lokasi" placeholder="Ruang BK" className="[&_input]:h-11 md:[&_input]:h-9" />

      <Field orientation="horizontal" className="items-center justify-between rounded-xl border p-3">
        <div className="grid gap-0.5">
          <FieldLabel htmlFor="ulangi">Ulangi tiap minggu</FieldLabel>
          <FieldDescription>Misalnya setiap Senin dan Rabu selama 4 minggu.</FieldDescription>
        </div>
        <Switch
          id="ulangi"
          checked={ulang}
          onCheckedChange={(c) => {
            form.setValue("ulangiMinggu", c ? 4 : 0)
            form.setValue("hari", c && v.tanggal ? [hariIso(v.tanggal)] : [])
            form.clearErrors("hari")
          }}
        />
      </Field>

      {ulang && (
        <>
          <Controller
            control={form.control}
            name="hari"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel id="label-hari">Hari</FieldLabel>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  aria-labelledby="label-hari"
                  value={(field.value ?? []).map(String)}
                  onValueChange={(x) => field.onChange(x.map(Number))}
                  className="flex flex-wrap justify-start gap-1.5"
                >
                  {NAMA_HARI.map((n, i) => (
                    <ToggleGroupItem
                      key={n}
                      value={String(i + 1)}
                      className="size-11 rounded-lg! border data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary md:size-9"
                    >
                      {n}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="ulangiMinggu"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="selama">Selama</FieldLabel>
                <Select value={String(field.value)} onValueChange={(x) => field.onChange(Number(x))}>
                  <SelectTrigger id="selama" className="h-11 w-full md:h-9">
                    <SelectValue>{field.value} minggu</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PILIHAN_MINGGU.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} minggu
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </>
      )}

      {tanggal.length > 0 && (
        <div className="rounded-xl bg-muted/60 p-3 text-sm" aria-live="polite">
          <p className="font-medium">
            {tanggal.length === 1 ? "Akan dibuat 1 slot" : `Akan dibuat ${tanggal.length} slot`}
          </p>
          <p className="mt-1 text-muted-foreground">
            {tanggal.slice(0, 6).map(formatHari).join(" · ")}
            {tanggal.length > 6 && ` · dan ${tanggal.length - 6} lainnya`}
          </p>
        </div>
      )}
    </FormSheet>
  )
}
