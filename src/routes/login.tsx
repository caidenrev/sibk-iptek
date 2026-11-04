import { zodResolver } from "@hookform/resolvers/zod"
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FormInput, FormPassword } from "@/components/app/form"
import { TataLetakMasuk } from "@/components/app/tata-letak-masuk"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { BERANDA_PERAN, urlSesuaiPeran } from "@/lib/peran"
import { pesanError } from "@/lib/pesan-error"
import { loginSchema } from "@/lib/validasi"
import { lupakanSesi } from "@/lib/sesi-klien"
import { loginFn } from "@/server/functions/auth"

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context }) => {
    // Sudah login → langsung ke beranda perannya.
    if (context.user) {
      throw redirect({ to: context.user.harusGantiPassword ? "/ganti-password" : BERANDA_PERAN[context.user.role] })
    }
  },
  head: () => ({ meta: [{ title: "Masuk · SIBK" }] }),
  component: Login,
})

type LoginInput = z.input<typeof loginSchema>

function Login() {
  const router = useRouter()
  const { redirect: tujuan } = Route.useSearch()
  const [galat, setGalat] = useState<string | null>(null)
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  const kirim = form.handleSubmit(async (data) => {
    setGalat(null)
    try {
      const hasil = await loginFn({ data })
      lupakanSesi()
      if (hasil.harusGantiPassword) {
        await router.navigate({ to: "/ganti-password" })
      } else if (tujuan && urlSesuaiPeran(tujuan, hasil.role)) {
        await router.navigate({ href: tujuan })
      } else {
        await router.navigate({ to: BERANDA_PERAN[hasil.role] })
      }
    } catch (e) {
      setGalat(pesanError(e))
      form.setValue("password", "")
      form.setFocus("password")
    }
  })

  return (
    <TataLetakMasuk
      varian="split"
      judul={
        <>
          <span className="lg:hidden">Masuk ke Akunmu</span>
          <span className="hidden lg:inline">Masuk</span>
        </>
      }
      deskripsi="Gunakan akun yang diberikan sekolah."
      bawah={
        <span className="inline-flex items-start gap-2 text-left">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Identitasmu bisa tetap rahasia. Guru BK hanya melihat nama samaran saat kamu memilih mode anonim.
        </span>
      }
    >
      <form onSubmit={kirim} noValidate>
        <FieldGroup>
          {galat && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{galat}</AlertDescription>
            </Alert>
          )}
          <FormInput
            control={form.control}
            name="username"
            label="NIS / NIP / Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            awalan={<UserRound />}
            className="[&_input]:h-11 md:[&_input]:h-9"
          />
          <FormPassword control={form.control} name="password" label="Password" awalan={<LockKeyhole />} />
          <FieldDescription className="-mt-3 text-right lg:text-left">
            <Link to="/lupa-password" className="font-medium text-primary underline-offset-4 hover:underline">
              Lupa password?
            </Link>
          </FieldDescription>
          <Button type="submit" size="lg" className="h-12 w-full text-base md:h-10" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
            Masuk
          </Button>
        </FieldGroup>
      </form>
    </TataLetakMasuk>
  )
}
