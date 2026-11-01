import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { AppShell } from "@/components/app/app-shell"
import { FormInput } from "@/components/app/form"
import { GantiPasswordForm } from "@/components/app/ganti-password-form"
import { PageHeader } from "@/components/app/page-header"
import { DialogVerifikasi, StatusVerifikasi } from "@/components/app/verifikasi-kontak"
import { formatWa } from "@/components/app/status-akun"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { wajibLogin } from "@/lib/guard"
import { pesanError } from "@/lib/pesan-error"
import { profilSchema } from "@/lib/validasi"
import { updateProfilFn } from "@/server/functions/auth"
import { IkonEmail, IkonWhatsApp } from "@/components/app/ikon-kontak"

export const Route = createFileRoute("/profil")({
  beforeLoad: ({ context, location }) => wajibLogin(context, location),
  head: () => ({ meta: [{ title: "Profil · SIBK" }] }),
  component: Profil,
})

const LABEL_USERNAME = { siswa: "NIS", guru_bk: "NIP", admin: "Username" } as const

function Profil() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  const [verifikasi, setVerifikasi] = useState<"email" | "whatsapp" | null>(null)
  const form = useForm<z.input<typeof profilSchema>>({
    resolver: zodResolver(profilSchema),
    values: { email: user.email ?? "", noWhatsapp: formatWa(user.noWhatsapp) },
  })

  const simpan = form.handleSubmit(async (data) => {
    try {
      const r = await updateProfilFn({ data })
      await router.invalidate()
      if (r?.emailBerubah || r?.waBerubah) {
        toast.success("Kontak tersimpan. Verifikasi dulu agar bisa menerima notifikasi.")
        setVerifikasi(r.waBerubah ? "whatsapp" : "email")
      } else {
        toast.success("Kontak tersimpan.")
      }
    } catch (e) {
      toast.error(pesanError(e))
    }
  })

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Profil" description="Data akun dan kontak untuk notifikasi." />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Data diri</CardTitle>
              <CardDescription>Hubungi admin sekolah bila nama atau {LABEL_USERNAME[user.role]} salah.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Nama</dt>
                  <dd className="mt-0.5 font-medium">{user.nama}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{LABEL_USERNAME[user.role]}</dt>
                  <dd className="tabular mt-0.5 font-medium">{user.username}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{user.role === "siswa" ? "Kelas" : "Peran"}</dt>
                  <dd className="mt-0.5 font-medium">{user.keterangan}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kontak notifikasi</CardTitle>
              <CardDescription>
                Dipakai untuk mengirim konfirmasi dan pengingat jadwal konseling lewat WhatsApp dan email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={simpan} noValidate>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <FormInput
                        control={form.control}
                        name="noWhatsapp"
                        label="Nomor WhatsApp"
                        ikon={<IkonWhatsApp />}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0812-3456-7890"
                      />
                      {user.noWhatsapp && !form.formState.dirtyFields.noWhatsapp && (
                        <StatusVerifikasi terverifikasi={user.waTerverifikasi} onVerifikasi={() => setVerifikasi("whatsapp")} />
                      )}
                    </div>
                    <div className="grid gap-2">
                      <FormInput
                        control={form.control}
                        name="email"
                        label="Email"
                        ikon={<IkonEmail alamat={String(form.watch("email") ?? "")} />}
                        type="email"
                        autoComplete="email"
                        placeholder="nama@email.com"
                      />
                      {user.email && !form.formState.dirtyFields.email && (
                        <StatusVerifikasi terverifikasi={user.emailTerverifikasi} onVerifikasi={() => setVerifikasi("email")} />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Kontak yang terverifikasi juga bisa dipakai untuk mereset password kalau kamu lupa.
                  </p>
                  <div>
                    <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                      {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
                      Simpan kontak
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          {verifikasi && (
            <DialogVerifikasi
              kanal={verifikasi}
              tujuan={verifikasi === "email" ? (user.email ?? "") : formatWa(user.noWhatsapp)}
              open={!!verifikasi}
              onOpenChange={(o) => !o && setVerifikasi(null)}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ganti password</CardTitle>
              <CardDescription>Perangkat lain yang sedang login akan dikeluarkan.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <GantiPasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
