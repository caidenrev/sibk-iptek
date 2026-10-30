import { createFileRoute, useRouter } from "@tanstack/react-router"
import { KeyRound } from "lucide-react"
import { GantiPasswordForm } from "@/components/app/ganti-password-form"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { wajibLogin } from "@/lib/guard"
import { BERANDA_PERAN } from "@/lib/peran"
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <CardTitle className="text-xl">{wajib ? "Buat password baru" : "Ganti password"}</CardTitle>
          <CardDescription>
            {wajib
              ? `Halo, ${user.nama.split(" ")[0]}. Ini login pertamamu. Ganti password awal supaya akunmu aman.`
              : "Masukkan password lama dan password baru."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GantiPasswordForm
            labelLama={wajib ? (user.role === "siswa" ? "Password awal (NIS)" : "Password awal") : "Password lama"}
            tombol="Simpan & lanjutkan"
            onBerhasil={async () => {
              await router.navigate({ to: BERANDA_PERAN[user.role] })
            }}
          />
        </CardContent>
      </Card>
      <Button
        variant="link"
        className="text-muted-foreground"
        onClick={async () => {
          await logoutFn()
          await router.navigate({ to: "/login" })
        }}
      >
        Keluar
      </Button>
    </div>
  )
}
