import { zodResolver } from "@hookform/resolvers/zod"
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FormInput, FormPassword } from "@/components/app/form"
import { Logo, LogoMark } from "@/components/app/logo"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { BERANDA_PERAN, urlSesuaiPeran } from "@/lib/peran"
import { pesanError } from "@/lib/pesan-error"
import { loginSchema } from "@/lib/validasi"
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex dark:bg-secondary dark:text-secondary-foreground">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-current opacity-5" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-current opacity-5" aria-hidden />
        <Link to="/" className="relative w-fit">
          <span className="flex items-center gap-2.5">
            <LogoMark warna="terbalik" className="size-9" />
            <span className="font-extrabold tracking-wide">SIBK · SMK IPTEK</span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-3xl leading-snug font-bold text-balance">Ruang aman untuk bercerita.</p>
          <p className="mt-3 opacity-85">
            Identitasmu bisa tetap rahasia. Guru BK hanya melihat nama samaran saat kamu memilih mode anonim.
          </p>
        </div>
        <p className="relative text-sm opacity-75">Bimbingan & Konseling SMK IPTEK Tangerang Selatan</p>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6">
          <Link to="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-xl">Masuk</CardTitle>
              <CardDescription>Gunakan akun yang diberikan sekolah.</CardDescription>
            </CardHeader>
            <CardContent>
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
                    className="[&_input]:h-11 md:[&_input]:h-9"
                  />
                  <FormPassword control={form.control} name="password" label="Password" />
                  <FieldDescription className="-mt-3">
                    <Link to="/lupa-password" className="font-medium text-primary underline-offset-4 hover:underline">
                      Lupa password?
                    </Link>
                  </FieldDescription>
                  <Button type="submit" size="lg" className="h-11 w-full text-base md:h-10" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
                    Masuk
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
