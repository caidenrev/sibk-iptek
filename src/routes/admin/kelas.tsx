import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { DataTable } from "@/components/app/data-table"
import { FormInput, FormSelect } from "@/components/app/form"
import { FormSheet } from "@/components/app/form-sheet"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAksi } from "@/lib/use-aksi"
import { kelasSchema } from "@/lib/validasi"
import type { KelasInput } from "@/lib/validasi"
import { daftarKelasFn, hapusKelasFn, opsiGuruFn, simpanKelasFn } from "@/server/functions/master"

export const Route = createFileRoute("/admin/kelas")({
  head: () => ({ meta: [{ title: "Data Kelas · SIBK" }] }),
  loader: async () => {
    const [kelas, guru] = await Promise.all([daftarKelasFn(), opsiGuruFn()])
    return { kelas, guru }
  },
  component: HalamanKelas,
})

type Kelas = Awaited<ReturnType<typeof daftarKelasFn>>[number]

const KOSONG: KelasInput = { namaKelas: "", jurusan: "", guruBkId: null }

function HalamanKelas() {
  const { kelas, guru } = Route.useLoaderData()
  const aksi = useAksi()
  const [form, setForm] = useState<{ open: boolean; data: KelasInput }>({ open: false, data: KOSONG })
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)

  const totalSiswa = kelas.reduce((n, k) => n + k.jumlahSiswa, 0)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Data Kelas"
        description={`${kelas.length} kelas · ${totalSiswa} siswa`}
        actions={
          <Button onClick={() => setForm({ open: true, data: KOSONG })}>
            <Plus data-icon="inline-start" /> Tambah kelas
          </Button>
        }
      />

      <DataTable<Kelas>
        rows={kelas}
        rowKey={(k) => k.id}
        kosong={{ judul: "Belum ada kelas", deskripsi: "Tambahkan kelas sebelum mendaftarkan siswa." }}
        kolom={[
          { header: "Kelas", cell: (k) => <span className="font-medium">{k.namaKelas}</span> },
          { header: "Jurusan", cell: (k) => k.jurusan, className: "max-sm:hidden" },
          {
            header: "Guru BK pembina",
            cell: (k) => k.pembina ?? <span className="text-muted-foreground">Belum ditentukan</span>,
          },
          { header: "Siswa", cell: (k) => <span className="tabular">{k.jumlahSiswa}</span>, className: "text-right" },
          {
            header: <span className="sr-only">Aksi</span>,
            className: "w-12 text-right",
            cell: (k) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${k.namaKelas}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      setForm({ open: true, data: { id: k.id, namaKelas: k.namaKelas, jurusan: k.jurusan, guruBkId: k.guruBkId } })
                    }
                  >
                    <Pencil /> Ubah
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      setKonfirmasi({
                        judul: `Hapus kelas ${k.namaKelas}?`,
                        deskripsi:
                          k.jumlahSiswa > 0
                            ? `Kelas ini masih berisi ${k.jumlahSiswa} siswa, jadi belum bisa dihapus. Pindahkan siswanya dulu.`
                            : "Kelas akan dihapus permanen.",
                        aksi: "Hapus kelas",
                        bahaya: true,
                        jalankan: () => aksi(() => hapusKelasFn({ data: { id: k.id } }), "Kelas dihapus."),
                      })
                    }
                  >
                    <Trash2 /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      <KelasForm
        key={form.data.id ?? "baru"}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        awal={form.data}
        guru={guru}
      />
      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </div>
  )
}

function KelasForm({
  open,
  onOpenChange,
  awal,
  guru,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  awal: KelasInput
  guru: Array<{ id: number; nama: string; aktif: boolean }>
}) {
  const aksi = useAksi()
  const form = useForm<KelasInput>({ resolver: zodResolver(kelasSchema), values: awal })
  const ubah = !!awal.id

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      judul={ubah ? "Ubah kelas" : "Tambah kelas"}
      deskripsi="Guru BK pembina menerima pengaduan beridentitas dari siswa di kelas ini."
      menyimpan={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(async (data) => {
        const ok = await aksi(() => simpanKelasFn({ data }), ubah ? "Kelas diperbarui." : "Kelas ditambahkan.")
        if (ok) onOpenChange(false)
      })}
    >
      <FormInput control={form.control} name="namaKelas" label="Nama kelas" placeholder="XI RPL 1" />
      <FormInput control={form.control} name="jurusan" label="Jurusan / program keahlian" placeholder="Rekayasa Perangkat Lunak" />
      <FormSelect
        control={form.control}
        name="guruBkId"
        label="Guru BK pembina"
        angka
        kosong="Belum ditentukan"
        opsi={guru.filter((g) => g.aktif || g.id === awal.guruBkId).map((g) => ({ value: String(g.id), label: g.nama }))}
      />
    </FormSheet>
  )
}
