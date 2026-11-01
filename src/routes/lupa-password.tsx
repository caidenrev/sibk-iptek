import { zodResolver } from "@hookform/resolvers/zod"
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { ArrowLeft, KeyRound } from "lucide-react"
import { IkonEmail, IkonWhatsApp } from "@/components/app/ikon-kontak"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { FormInput, FormPassword } from "@/components/app/form"
import { InputKodeOtp, KirimUlang } from "@/components/app/kode-otp"
import { Logo } from "@/components/app/logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { BERANDA_PERAN } from "@/lib/peran"
import { pesanError } from "@/lib/pesan-error"
import { loginSchema, lupaPasswordResetSchema } from "@/lib/validasi"
import { lupakanSesi } from "@/lib/sesi-klien"
import { lupaPasswordCekFn, lupaPasswordKirimFn, lupaPasswordResetFn } from "@/server/functions/akun"

export const Route = createFileRoute("/lupa-password")({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: BERANDA_PERAN[context.user.role] })
  },
  head: () => ({ meta: [{ title: "Lupa Password · SIBK" }] }),
  component: LupaPassword,
})

type Kanal = { kanal: "email" | "whatsapp"; label: string }
type Tahap =
  | { t: "akun" }
  | { t: "kanal"; username: string; pilihan: Array<Kanal> }
  | { t: "kode"; username: string; kanal: Kanal; menit: number }

function LupaPassword() {
  const [tahap, setTahap] = useState<Tahap>({ t: "akun" })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <Link to="/" aria-label="Beranda SIBK">
        <Logo />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <CardTitle className="text-xl">Lupa password</CardTitle>
          <CardDescription>
            {tahap.t === "akun" && "Masukkan NIS/NIP. Kami kirim kode untuk membuat password baru."}
            {tahap.t === "kanal" && "Kirim kode ke mana?"}
            {tahap.t === "kode" &&
              `Kode dikirim ke ${tahap.kanal.kanal === "email" ? "email" : "WhatsApp"} ${tahap.kanal.label}. Berlaku ${tahap.menit} menit.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tahap.t === "akun" && <LangkahAkun onLanjut={(username, pilihan) => setTahap({ t: "kanal", username, pilihan })} />}
          {tahap.t === "kanal" && (
            <LangkahKanal
              username={tahap.username}
              pilihan={tahap.pilihan}
              onKembali={() => setTahap({ t: "akun" })}
              onTerkirim={(kanal, menit) => setTahap({ t: "kode", username: tahap.username, kanal, menit })}
            />
          )}
          {tahap.t === "kode" && (
            <LangkahKode username={tahap.username} kanal={tahap.kanal} onGanti={() => setTahap({ t: "akun" })} />
          )}
        </CardContent>
      </Card>
      <Button asChild variant="link" className="text-muted-foreground">
        <Link to="/login">
          <ArrowLeft data-icon="inline-start" /> Kembali ke halaman masuk
        </Link>
      </Button>
    </div>
  )
}

function LangkahAkun({ onLanjut }: { onLanjut: (username: string, pilihan: Array<Kanal>) => void }) {
  const [kosong, setKosong] = useState(false)
  const form = useForm<{ username: string }>({
    resolver: zodResolver(loginSchema.pick({ username: true })),
    defaultValues: { username: "" },
  })

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async ({ username }) => {
        setKosong(false)
        try {
          const r = await lupaPasswordCekFn({ data: { username } })
          if (r.kanal.length === 0) setKosong(true)
          else onLanjut(username, r.kanal)
        } catch (e) {
          toast.error(pesanError(e))
        }
      })}
    >
      <FieldGroup>
        {kosong && (
          <Alert>
            <AlertDescription>
              Akun tidak ditemukan, atau belum punya email/WhatsApp yang terverifikasi. Minta reset password ke Guru BK atau
              admin sekolah.
            </AlertDescription>
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
        <Button type="submit" size="lg" className="h-11 md:h-10" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Lanjut
        </Button>
      </FieldGroup>
    </form>
  )
}

function LangkahKanal({
  username,
  pilihan,
  onKembali,
  onTerkirim,
}: {
  username: string
  pilihan: Array<Kanal>
  onKembali: () => void
  onTerkirim: (k: Kanal, menit: number) => void
}) {
  const [nilai, setNilai] = useState(pilihan[0].kanal)
  const [kirim, setKirim] = useState(false)

  return (
    <FieldGroup>
      <RadioGroup value={nilai} onValueChange={(v) => setNilai(v as "email")} className="gap-2">
        {pilihan.map((p) => {
          return (
            <FieldLabel key={p.kanal} htmlFor={`kanal-${p.kanal}`} className="cursor-pointer">
              <Field orientation="horizontal" className="rounded-xl border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5">
                <RadioGroupItem value={p.kanal} id={`kanal-${p.kanal}`} />
                {/* Alamat email di sini disamarkan (domain ikut tersamar), jadi email selalu memakai ikon amplop. */}
                {p.kanal === "email" ? <IkonEmail className="size-5" /> : <IkonWhatsApp className="size-5" />}
                <span className="grid leading-tight">
                  <span className="font-medium">{p.kanal === "email" ? "Email" : "WhatsApp"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.label}</span>
                </span>
              </Field>
            </FieldLabel>
          )
        })}
      </RadioGroup>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onKembali} disabled={kirim}>
          Kembali
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={kirim}
          onClick={async () => {
            setKirim(true)
            try {
              const r = await lupaPasswordKirimFn({ data: { username, kanal: nilai } })
              onTerkirim(pilihan.find((p) => p.kanal === nilai)!, r.menit)
            } catch (e) {
              toast.error(pesanError(e))
            } finally {
              setKirim(false)
            }
          }}
        >
          {kirim && <Spinner data-icon="inline-start" />}
          Kirim kode
        </Button>
      </div>
    </FieldGroup>
  )
}

type ResetInput = z.input<typeof lupaPasswordResetSchema>

function LangkahKode({ username, kanal, onGanti }: { username: string; kanal: Kanal; onGanti: () => void }) {
  const router = useRouter()
  const form = useForm<ResetInput>({
    resolver: zodResolver(lupaPasswordResetSchema),
    defaultValues: { username, kode: "", passwordBaru: "", konfirmasi: "" },
  })

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async (data) => {
        try {
          const r = await lupaPasswordResetFn({ data })
          lupakanSesi()
          toast.success("Password baru tersimpan. Kamu sudah masuk.")
          await router.navigate({ to: BERANDA_PERAN[r.role] })
        } catch (e) {
          const pesan = pesanError(e)
          if (/kode/i.test(pesan)) form.setError("kode", { message: pesan })
          else toast.error(pesan)
        }
      })}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="kode"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="kode-otp">Kode 6 digit</FieldLabel>
              <InputKodeOtp id="kode-otp" value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <KirimUlang
                  onKirim={async () => {
                    try {
                      await lupaPasswordKirimFn({ data: { username, kanal: kanal.kanal } })
                      toast.success("Kode baru dikirim.")
                      form.setValue("kode", "")
                      return true
                    } catch (e) {
                      toast.error(pesanError(e))
                      return false
                    }
                  }}
                />
                <Button type="button" variant="link" className="h-auto p-0 text-sm text-muted-foreground" onClick={onGanti}>
                  Ganti akun / tujuan
                </Button>
              </div>
            </Field>
          )}
        />
        <FormPassword
          control={form.control}
          name="passwordBaru"
          label="Password baru"
          autoComplete="new-password"
          description="Minimal 8 karakter, kombinasi huruf dan angka."
        />
        <FormPassword control={form.control} name="konfirmasi" label="Ulangi password baru" autoComplete="new-password" />
        <Button type="submit" size="lg" className="h-11 md:h-10" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Simpan password & masuk
        </Button>
      </FieldGroup>
    </form>
  )
}
