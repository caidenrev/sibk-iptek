import { createFileRoute, useRouter } from "@tanstack/react-router"
import { KeyRound } from "lucide-react"
import { GantiPasswordForm } from "@/components/app/ganti-password-form"
import { TataLetakMasuk } from "@/components/app/tata-letak-masuk"
import { Button } from "@/components/ui/button"
import { wajibLogin } from "@/lib/guard"
import { BERANDA_PERAN } from "@/lib/peran"
import { lupakanSesi } from "@/lib/sesi-klien"
import { logoutFn } from "@/server/functions/auth"

export const Route = createFileRoute("/ganti-password")({
  beforeLoad: ({ context, location }) => wajibLogin(context, location, { izinkanGantiPassword: true }),
  head: () => ({ meta: [{ title: "Ganti Password · SIBK" }] }),
  component: GantiPassword,
})

function GantiPassword() {
  const router = useRouter()
  const { user } = Route.useRouteContext()
  const wajib = user.harusGantiPassword

  return (
    <TataLetakMasuk
      judul={wajib ? "Buat password baru" : "Ganti password"}
      ikon={<KeyRound className="size-5" aria-hidden />}
      deskripsi={
        wajib
          ? `Halo, ${user.nama.split(" ")[0]}. Ini login pertamamu. Ganti password awal supaya akunmu aman.`
          : "Masukkan password lama dan password baru."
      }
      bawah={
        <>
          <span className="lg:hidden">Bukan akunmu? </span>
          <Button
            variant="link"
            className="h-auto p-0 font-medium text-primary lg:h-9 lg:px-4 lg:text-muted-foreground"
            onClick={async () => {
              await logoutFn()
              lupakanSesi()
              await router.navigate({ to: "/login" })
            }}
          >
            Keluar
          </Button>
        </>
      }
    >
      <GantiPasswordForm
        ikon
        labelLama={wajib ? (user.role === "siswa" ? "Password awal (NIS)" : "Password awal") : "Password lama"}
        tombol="Simpan & lanjutkan"
        onBerhasil={async () => {
          lupakanSesi()
          await router.navigate({ to: BERANDA_PERAN[user.role] })
        }}
      />
    </TataLetakMasuk>
  )
}
