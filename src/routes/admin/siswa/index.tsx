import { zodResolver } from "@hookform/resolvers/zod"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, FileUp, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { MenuAkun } from "@/components/app/aksi-akun"
import { DataTable } from "@/components/app/data-table"
import { FormInput, FormSelect } from "@/components/app/form"
import { FormSheet } from "@/components/app/form-sheet"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { StatusAkun, formatWa } from "@/components/app/status-akun"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAksi } from "@/lib/use-aksi"
import { siswaSchema } from "@/lib/validasi"
import type { SiswaInput } from "@/lib/validasi"
import { opsiKelasFn } from "@/server/functions/master"
import { daftarSiswaFn, simpanSiswaFn } from "@/server/functions/siswa"

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  kelasId: z.number().int().positive().optional().catch(undefined),
  status: z.enum(["aktif", "nonaktif", "belum_login"]).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute("/admin/siswa/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [hasil, kelas] = await Promise.all([daftarSiswaFn({ data: { ...deps, page: deps.page ?? 1 } }), opsiKelasFn()])
    return { ...hasil, kelas }
  },
  head: () => ({ meta: [{ title: "Data Siswa · SIBK" }] }),
  component: HalamanSiswa,
})

type Siswa = Awaited<ReturnType<typeof daftarSiswaFn>>["rows"][number]

const SEMUA = "semua"

function HalamanSiswa() {
  const { rows, total, page, perHalaman, kelas } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [form, setForm] = useState<{ open: boolean; data: SiswaInput | null }>({ open: false, data: null })
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)
  const [cari, setCari] = useState(search.q ?? "")

  // Pencarian ditunda 300 ms agar tidak memanggil server di setiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = cari.trim() || undefined
      if (q !== search.q) navigate({ search: (s) => ({ ...s, q, page: undefined }), replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [cari, search.q, navigate])

  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman))
  const kosongAwal = (k: number | undefined) => ({ nama: "", nis: "", kelasId: k ?? kelas[0]?.id ?? 0, jenisKelamin: "L" as const, email: "", noWhatsapp: "" })

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Data Siswa"
        description="Siswa login memakai NIS. Password awal = NIS."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/siswa/import">
                <FileUp data-icon="inline-start" /> Import Excel
              </Link>
            </Button>
            <Button onClick={() => setForm({ open: true, data: kosongAwal(search.kelasId) })} disabled={kelas.length === 0}>
              <Plus data-icon="inline-start" /> Tambah siswa
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau NIS"
            aria-label="Cari nama atau NIS"
            type="search"
          />
        </InputGroup>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select
            value={search.kelasId ? String(search.kelasId) : SEMUA}
            onValueChange={(v) => navigate({ search: (s) => ({ ...s, kelasId: v === SEMUA ? undefined : Number(v), page: undefined }) })}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter kelas">
              <SelectValue>{kelas.find((k) => k.id === search.kelasId)?.nama ?? "Semua kelas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua kelas</SelectItem>
              {kelas.map((k) => (
                <SelectItem key={k.id} value={String(k.id)}>
                  {k.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.status ?? SEMUA}
            onValueChange={(v) =>
              navigate({ search: (s) => ({ ...s, status: v === SEMUA ? undefined : (v as "aktif"), page: undefined }) })
            }
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter status">
              <SelectValue>{search.status ? { aktif: "Aktif", belum_login: "Belum login", nonaktif: "Nonaktif" }[search.status] : "Semua status"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="belum_login">Belum login</SelectItem>
              <SelectItem value="nonaktif">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable<Siswa>
        rows={rows}
        rowKey={(s) => s.id}
        kosong={
          search.q || search.kelasId || search.status
            ? { judul: "Tidak ada siswa yang cocok", deskripsi: "Coba ubah kata kunci atau filter." }
            : {
                judul: "Belum ada siswa",
                deskripsi: "Import dari Excel untuk menambahkan banyak siswa sekaligus.",
                aksi: (
                  <Button asChild>
                    <Link to="/admin/siswa/import">Import Excel</Link>
                  </Button>
                ),
              }
        }
        kolom={[
          {
            header: "Siswa",
            cell: (s) => (
              <div className="min-w-0">
                <p className="font-medium">{s.nama}</p>
                <p className="tabular text-xs text-muted-foreground">
                  NIS {s.nis} · {s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                </p>
              </div>
            ),
          },
          { header: "Kelas", cell: (s) => s.namaKelas },
          {
            header: "Kontak",
            className: "max-lg:hidden",
            cell: (s) =>
              s.noWhatsapp || s.email ? (
                <div className="text-sm">
                  {s.noWhatsapp && <p className="tabular">{formatWa(s.noWhatsapp)}</p>}
                  {s.email && <p className="text-muted-foreground">{s.email}</p>}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Belum diisi</span>
              ),
          },
          { header: "Status", className: "max-sm:hidden", cell: (s) => <StatusAkun aktif={s.aktif} harusGanti={s.harusGantiPassword} /> },
          {
            header: <span className="sr-only">Aksi</span>,
            className: "w-12 text-right",
            cell: (s) => (
              <MenuAkun
                nama={s.nama}
                userId={s.userId}
                aktif={s.aktif}
                labelPasswordAwal="NIS"
                konfirmasi={setKonfirmasi}
                onUbah={() =>
                  setForm({
                    open: true,
                    data: {
                      id: s.id,
                      nama: s.nama,
                      nis: s.nis,
                      kelasId: s.kelasId,
                      jenisKelamin: s.jenisKelamin,
                      email: s.email ?? "",
                      noWhatsapp: formatWa(s.noWhatsapp),
                    },
                  })
                }
              />
            ),
          },
        ]}
      />

      {total > 0 && (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Paginasi">
          <p className="text-muted-foreground">
            <span className="tabular">
              {(page - 1) * perHalaman + 1}–{Math.min(page * perHalaman, total)}
            </span>{" "}
            dari <span className="tabular">{total}</span> siswa
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Halaman sebelumnya"
              disabled={page <= 1}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page - 1 > 1 ? page - 1 : undefined }) })}
            >
              <ChevronLeft />
            </Button>
            <span className="tabular px-2">
              {page} / {totalHalaman}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Halaman berikutnya"
              disabled={page >= totalHalaman}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page + 1 }) })}
            >
              <ChevronRight />
            </Button>
          </div>
        </nav>
      )}

      {form.data && (
        <SiswaForm
          key={form.data.id ?? "baru"}
          open={form.open}
          onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
          awal={form.data}
          kelas={kelas}
        />
      )}
      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </div>
  )
}

function SiswaForm({
  open,
  onOpenChange,
  awal,
  kelas,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  awal: SiswaInput
  kelas: Array<{ id: number; nama: string }>
}) {
  const aksi = useAksi()
  const form = useForm<SiswaInput>({ resolver: zodResolver(siswaSchema), values: awal })
  const ubah = !!awal.id

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      judul={ubah ? "Ubah data siswa" : "Tambah siswa"}
      deskripsi={ubah ? undefined : "Password awal sama dengan NIS dan wajib diganti saat login pertama."}
      menyimpan={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(async (data) => {
        const ok = await aksi(() => simpanSiswaFn({ data }), ubah ? "Data siswa diperbarui." : "Siswa ditambahkan.")
        if (ok) onOpenChange(false)
      })}
    >
      <FormInput control={form.control} name="nama" label="Nama lengkap" autoComplete="off" />
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          control={form.control}
          name="nis"
          label="NIS"
          inputMode="numeric"
          autoComplete="off"
        />
        <FormSelect
          control={form.control}
          name="jenisKelamin"
          label="Jenis kelamin"
          opsi={[
            { value: "L", label: "Laki-laki" },
            { value: "P", label: "Perempuan" },
          ]}
        />
      </div>
      {ubah && <p className="-mt-3 text-xs text-muted-foreground">Mengubah NIS juga mengubah username login.</p>}
      <FormSelect
        control={form.control}
        name="kelasId"
        label="Kelas"
        angka
        opsi={kelas.map((k) => ({ value: String(k.id), label: k.nama }))}
      />
      <FormInput control={form.control} name="noWhatsapp" label="Nomor WhatsApp" inputMode="tel" autoComplete="off" placeholder="0812-3456-7890" description="Opsional. Siswa juga bisa mengisinya sendiri di Profil." />
      <FormInput control={form.control} name="email" label="Email" type="email" autoComplete="off" description="Opsional." />
    </FormSheet>
  )
}
