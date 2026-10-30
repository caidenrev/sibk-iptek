import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { MenuAkun } from "@/components/app/aksi-akun"
import { DataTable } from "@/components/app/data-table"
import { FormInput } from "@/components/app/form"
import { FormSheet } from "@/components/app/form-sheet"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { StatusAkun, formatWa } from "@/components/app/status-akun"
import { Button } from "@/components/ui/button"
import { useAksi } from "@/lib/use-aksi"
import { guruSchema } from "@/lib/validasi"
import type { GuruInput } from "@/lib/validasi"
import { daftarGuruFn, simpanGuruFn } from "@/server/functions/master"

export const Route = createFileRoute("/admin/guru")({
  head: () => ({ meta: [{ title: "Data Guru BK · SIBK" }] }),
  loader: () => daftarGuruFn(),
  component: HalamanGuru,
})

type Guru = Awaited<ReturnType<typeof daftarGuruFn>>[number]

const KOSONG: GuruInput = { nama: "", nip: "", email: "", noWhatsapp: "" }

function HalamanGuru() {
  const guru = Route.useLoaderData()
  const [form, setForm] = useState<{ open: boolean; data: GuruInput }>({ open: false, data: KOSONG })
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Data Guru BK"
        description="Akun Guru BK login memakai NIP. Password awal = NIP."
        actions={
          <Button onClick={() => setForm({ open: true, data: KOSONG })}>
            <Plus data-icon="inline-start" /> Tambah Guru BK
          </Button>
        }
      />

      <DataTable<Guru>
        rows={guru}
        rowKey={(g) => g.id}
        kosong={{ judul: "Belum ada Guru BK" }}
        kolom={[
          {
            header: "Nama",
            cell: (g) => (
              <div className="min-w-0">
                <p className="font-medium">{g.nama}</p>
                <p className="tabular text-xs text-muted-foreground">NIP {g.nip}</p>
              </div>
            ),
          },
          {
            header: "Kontak",
            className: "max-md:hidden",
            cell: (g) => (
              <div className="text-sm">
                <p>{g.email ?? <span className="text-muted-foreground">Email belum diisi</span>}</p>
                <p className="tabular text-muted-foreground">{formatWa(g.noWhatsapp) || "WA belum diisi"}</p>
              </div>
            ),
          },
          { header: "Kelas binaan", className: "max-sm:hidden text-right", cell: (g) => <span className="tabular">{g.jumlahKelas}</span> },
          { header: "Status", cell: (g) => <StatusAkun aktif={g.aktif} harusGanti={g.harusGantiPassword} /> },
          {
            header: <span className="sr-only">Aksi</span>,
            className: "w-12 text-right",
            cell: (g) => (
              <MenuAkun
                nama={g.nama}
                userId={g.userId}
                aktif={g.aktif}
                labelPasswordAwal="NIP"
                konfirmasi={setKonfirmasi}
                onUbah={() =>
                  setForm({
                    open: true,
                    data: { id: g.id, nama: g.nama, nip: g.nip, email: g.email ?? "", noWhatsapp: formatWa(g.noWhatsapp) },
                  })
                }
              />
            ),
          },
        ]}
      />

      <GuruForm
        key={form.data.id ?? "baru"}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        awal={form.data}
      />
      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </div>
  )
}

function GuruForm({ open, onOpenChange, awal }: { open: boolean; onOpenChange: (o: boolean) => void; awal: GuruInput }) {
  const aksi = useAksi()
  const form = useForm<GuruInput>({ resolver: zodResolver(guruSchema), values: awal })
  const ubah = !!awal.id

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      judul={ubah ? "Ubah Guru BK" : "Tambah Guru BK"}
      deskripsi={ubah ? undefined : "Password awal sama dengan NIP dan wajib diganti saat login pertama."}
      menyimpan={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(async (data) => {
        const ok = await aksi(() => simpanGuruFn({ data }), ubah ? "Data Guru BK diperbarui." : "Guru BK ditambahkan.")
        if (ok) onOpenChange(false)
      })}
    >
      <FormInput control={form.control} name="nama" label="Nama lengkap" autoComplete="off" />
      <FormInput
        control={form.control}
        name="nip"
        label="NIP"
        inputMode="numeric"
        autoComplete="off"
        description={ubah ? "Mengubah NIP juga mengubah username login." : undefined}
      />
      <FormInput control={form.control} name="email" label="Email" type="email" autoComplete="off" description="Untuk notifikasi pengaduan & jadwal." />
      <FormInput control={form.control} name="noWhatsapp" label="Nomor WhatsApp" inputMode="tel" autoComplete="off" placeholder="0812-3456-7890" />
    </FormSheet>
  )
}
