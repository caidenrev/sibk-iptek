import { KeyRound, MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react"
import type { KonfirmasiState } from "./konfirmasi"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAksi } from "@/lib/use-aksi"
import { resetPasswordFn, setAkunAktifFn } from "@/server/functions/master"

/** Menu aksi baris untuk akun Guru BK / siswa: ubah, reset password, aktif/nonaktif. */
export function MenuAkun({
  nama,
  userId,
  aktif,
  labelPasswordAwal,
  onUbah,
  konfirmasi,
}: {
  nama: string
  userId: number
  aktif: boolean
  /** "NIS" atau "NIP" */
  labelPasswordAwal: string
  onUbah: () => void
  konfirmasi: (s: KonfirmasiState) => void
}) {
  const aksi = useAksi()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${nama}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onUbah}>
          <Pencil /> Ubah data
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            konfirmasi({
              judul: `Reset password ${nama}?`,
              deskripsi: `Password dikembalikan ke ${labelPasswordAwal} dan wajib diganti saat login berikutnya. Semua perangkat yang sedang login akan dikeluarkan.`,
              aksi: "Reset password",
              jalankan: () => aksi(() => resetPasswordFn({ data: { userId } }), `Password ${nama} direset ke ${labelPasswordAwal}.`),
            })
          }
        >
          <KeyRound /> Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {aktif ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              konfirmasi({
                judul: `Nonaktifkan akun ${nama}?`,
                deskripsi: "Akun tidak bisa login sampai diaktifkan kembali. Data dan riwayatnya tetap tersimpan.",
                aksi: "Nonaktifkan",
                bahaya: true,
                jalankan: () => aksi(() => setAkunAktifFn({ data: { userId, aktif: false } }), `Akun ${nama} dinonaktifkan.`),
              })
            }
          >
            <PowerOff /> Nonaktifkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => aksi(() => setAkunAktifFn({ data: { userId, aktif: true } }), `Akun ${nama} diaktifkan.`)}
          >
            <Power /> Aktifkan
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
