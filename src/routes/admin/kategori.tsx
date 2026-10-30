import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { MoreHorizontal, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { DataTable } from "@/components/app/data-table"
import { FormInput, FormTextarea } from "@/components/app/form"
import { FormSheet } from "@/components/app/form-sheet"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { StatusAkun } from "@/components/app/status-akun"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAksi } from "@/lib/use-aksi"
import { kategoriSchema } from "@/lib/validasi"
import type { KategoriInput } from "@/lib/validasi"
import { daftarKategoriFn, hapusKategoriFn, setKategoriAktifFn, simpanKategoriFn } from "@/server/functions/master"

export const Route = createFileRoute("/admin/kategori")({
  head: () => ({ meta: [{ title: "Kategori Masalah · SIBK" }] }),
  loader: () => daftarKategoriFn(),
  component: HalamanKategori,
})

type Kategori = Awaited<ReturnType<typeof daftarKategoriFn>>[number]

const KOSONG: KategoriInput = { namaKategori: "", deskripsi: "" }

function HalamanKategori() {
  const kategori = Route.useLoaderData()
  const aksi = useAksi()
  const [form, setForm] = useState<{ open: boolean; data: KategoriInput }>({ open: false, data: KOSONG })
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kategori Masalah"
        description="Pilihan kategori di formulir pengaduan siswa. Kategori nonaktif tidak muncul di formulir."
        actions={
          <Button onClick={() => setForm({ open: true, data: KOSONG })}>
            <Plus data-icon="inline-start" /> Tambah kategori
          </Button>
        }
      />

      <DataTable<Kategori>
        rows={kategori}
        rowKey={(k) => k.id}
        kosong={{ judul: "Belum ada kategori" }}
        kolom={[
          {
            header: "Kategori",
            cell: (k) => (
              <div className="max-w-xl min-w-0 whitespace-normal">
                <p className="font-medium">{k.namaKategori}</p>
                {k.deskripsi && <p className="text-sm text-muted-foreground">{k.deskripsi}</p>}
              </div>
            ),
          },
          { header: "Status", className: "w-28", cell: (k) => <StatusAkun aktif={k.isActive} /> },
          {
            header: <span className="sr-only">Aksi</span>,
            className: "w-12 text-right",
            cell: (k) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${k.namaKategori}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setForm({ open: true, data: { id: k.id, namaKategori: k.namaKategori, deskripsi: k.deskripsi ?? "" } })}
                  >
                    <Pencil /> Ubah
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      aksi(
                        () => setKategoriAktifFn({ data: { id: k.id, aktif: !k.isActive } }),
                        k.isActive ? "Kategori dinonaktifkan." : "Kategori diaktifkan."
                      )
                    }
                  >
                    {k.isActive ? <PowerOff /> : <Power />} {k.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      setKonfirmasi({
                        judul: `Hapus kategori ${k.namaKategori}?`,
                        deskripsi: "Kategori yang sudah dipakai pengaduan tidak bisa dihapus; nonaktifkan saja.",
                        aksi: "Hapus kategori",
                        bahaya: true,
                        jalankan: () => aksi(() => hapusKategoriFn({ data: { id: k.id } }), "Kategori dihapus."),
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

      <KategoriForm
        key={form.data.id ?? "baru"}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        awal={form.data}
      />
      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </div>
  )
}

function KategoriForm({ open, onOpenChange, awal }: { open: boolean; onOpenChange: (o: boolean) => void; awal: KategoriInput }) {
  const aksi = useAksi()
  const form = useForm<KategoriInput>({ resolver: zodResolver(kategoriSchema), values: awal })
  const ubah = !!awal.id
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      judul={ubah ? "Ubah kategori" : "Tambah kategori"}
      menyimpan={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(async (data) => {
        const ok = await aksi(() => simpanKategoriFn({ data }), ubah ? "Kategori diperbarui." : "Kategori ditambahkan.")
        if (ok) onOpenChange(false)
      })}
    >
      <FormInput control={form.control} name="namaKategori" label="Nama kategori" placeholder="mis. Keluarga" />
      <FormTextarea
        control={form.control}
        name="deskripsi"
        label="Deskripsi"
        rows={3}
        description="Ditampilkan sebagai penjelasan singkat di formulir pengaduan."
      />
    </FormSheet>
  )
}
