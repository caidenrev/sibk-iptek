import { createFileRoute, useRouter } from "@tanstack/react-router"
import { CheckCircle2, CircleAlert, Clock, Copy, Send, Trash2, Wifi } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { IkonEmail, IkonWhatsApp } from "@/components/app/ikon-kontak"
import { Konfirmasi } from "@/components/app/konfirmasi"
import type { KonfirmasiState } from "@/components/app/konfirmasi"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatJam, formatTanggal } from "@/lib/format"
import { pesanError } from "@/lib/pesan-error"
import { cn } from "@/lib/utils"
import { kirimTesAdminFn, simpanTokenFonnteFn, statusNotifikasiFn, ujiFonnteFn } from "@/server/functions/notifikasi"

export const Route = createFileRoute("/admin/pengaturan")({
  loader: () => statusNotifikasiFn(),
  head: () => ({ meta: [{ title: "Pengaturan Notifikasi · SIBK" }] }),
  component: HalamanPengaturan,
})

function Status({ aktif, children }: { aktif: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", aktif ? "text-success" : "text-muted-foreground")}>
      {aktif ? <CheckCircle2 className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
      {children}
    </span>
  )
}

function HalamanPengaturan() {
  const s = Route.useLoaderData()
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Pengaturan notifikasi" description="WhatsApp dan email yang dipakai SIBK untuk memberi tahu siswa dan Guru BK." className="mb-0" />
      <KartuWhatsapp s={s} />
      <KartuEmail s={s} />
      <KartuUji />
      <KartuCron s={s} />
    </div>
  )
}

type S = Awaited<ReturnType<typeof statusNotifikasiFn>>

function KartuWhatsapp({ s }: { s: S }) {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [jalan, setJalan] = useState<"simpan" | "uji" | null>(null)
  const [hasilUji, setHasilUji] = useState<string | null>(null)
  const [konfirmasi, setKonfirmasi] = useState<KonfirmasiState | null>(null)

  async function simpan() {
    setJalan("simpan")
    try {
      await simpanTokenFonnteFn({ data: { token } })
      toast.success("Token Fonnte tersimpan dan sudah dicek ke Fonnte.")
      setToken("")
      setHasilUji(null)
      await router.invalidate()
    } catch (e) {
      toast.error(pesanError(e))
    } finally {
      setJalan(null)
    }
  }

  async function uji() {
    setJalan("uji")
    try {
      const r = await ujiFonnteFn()
      setHasilUji(
        r.ok
          ? `Terhubung. Perangkat ${r.perangkat ?? "-"}, status ${r.statusPerangkat ?? "-"}, kuota ${r.kuota ?? "-"}.`
          : `Gagal: ${r.pesan}`
      )
    } catch (e) {
      setHasilUji(pesanError(e))
    } finally {
      setJalan(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IkonWhatsApp className="size-5" /> WhatsApp (Fonnte)
        </CardTitle>
        <CardDescription>
          Pesan WhatsApp dikirim lewat nomor sekolah yang terhubung di fonnte.com. Token ada di menu Device di dashboard Fonnte.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {s.wa.aktif ? (
            <Status aktif>
              Token terisi · berakhiran <span className="font-mono">{s.wa.ujung}</span> {s.wa.sumber === "env" && "(dari pengaturan server)"}
            </Status>
          ) : (
            <Status aktif={false}>Belum diatur{!s.produksi && " · mode pengembangan: pesan WA dicetak ke log server"}</Status>
          )}
          {s.wa.aktif && (
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 md:h-9" disabled={jalan !== null} onClick={uji}>
                {jalan === "uji" ? <Spinner data-icon="inline-start" /> : <Wifi data-icon="inline-start" />} Uji koneksi
              </Button>
              {s.wa.sumber === "admin" && (
                <Button
                  variant="ghost"
                  className="h-11 text-destructive md:h-9"
                  onClick={() =>
                    setKonfirmasi({
                      judul: "Hapus token Fonnte?",
                      deskripsi: "Notifikasi WhatsApp berhenti dikirim sampai token baru diisi. Email tetap berjalan.",
                      aksi: "Hapus token",
                      bahaya: true,
                      jalankan: async () => {
                        await simpanTokenFonnteFn({ data: { token: null } })
                        await router.invalidate()
                      },
                    })
                  }
                >
                  <Trash2 data-icon="inline-start" /> Hapus
                </Button>
              )}
            </div>
          )}
        </div>
        {hasilUji && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{hasilUji}</p>}
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            void simpan()
          }}
        >
          <Field>
            <FieldLabel htmlFor="token-fonnte">{s.wa.aktif ? "Ganti token" : "Token Fonnte"}</FieldLabel>
            <Input
              id="token-fonnte"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Tempel token dari dashboard Fonnte"
              className="h-11 font-mono md:h-9"
            />
          </Field>
          <Button type="submit" className="h-11 md:h-9" disabled={jalan !== null || token.trim().length < 10}>
            {jalan === "simpan" && <Spinner data-icon="inline-start" />} Simpan token
          </Button>
        </form>
        <FieldDescription>Token dicek ke Fonnte sebelum disimpan, lalu disimpan terenkripsi. Token lengkap tidak pernah ditampilkan lagi.</FieldDescription>
      </CardContent>
      <Konfirmasi state={konfirmasi} onClose={() => setKonfirmasi(null)} />
    </Card>
  )
}

function KartuEmail({ s }: { s: S }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IkonEmail className="size-5" /> Email
        </CardTitle>
        <CardDescription>Email dikirim lewat SMTP yang diatur di server oleh pengembang, karena terikat domain pengirim.</CardDescription>
      </CardHeader>
      <CardContent>
        {s.email.aktif ? (
          <Status aktif>
            Aktif · {s.email.host}
            {s.email.domain && ` · pengirim @${s.email.domain}`}
          </Status>
        ) : (
          <Status aktif={false}>Belum diatur{!s.produksi && " · mode pengembangan: email dicetak ke log server"}</Status>
        )}
      </CardContent>
    </Card>
  )
}

function KartuUji() {
  const [kanal, setKanal] = useState<"email" | "whatsapp">("email")
  const [tujuan, setTujuan] = useState("")
  const [jalan, setJalan] = useState(false)
  const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null)

  async function kirim() {
    setJalan(true)
    setHasil(null)
    try {
      const h = await kirimTesAdminFn({ data: { kanal, tujuan } })
      setHasil(
        h.status === "terkirim"
          ? { ok: true, teks: h.error ? "Mode pengembangan: pesan dicetak ke log server." : "Terkirim. Periksa kotak masuk atau WhatsApp tujuan." }
          : h.status === "dilewati"
            ? { ok: false, teks: `Tidak dikirim: ${h.error}` }
            : { ok: false, teks: `Belum terkirim (percobaan ${h.percobaan}): ${h.error}. Akan dicoba ulang otomatis.` }
      )
    } catch (e) {
      setHasil({ ok: false, teks: pesanError(e) })
    } finally {
      setJalan(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-5 text-muted-foreground" aria-hidden /> Kirim pesan uji
        </CardTitle>
        <CardDescription>Pastikan pesan benar-benar sampai sebelum dipakai siswa dan Guru BK.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void kirim()
          }}
        >
          <ToggleGroup
            type="single"
            variant="outline"
            value={kanal}
            onValueChange={(v) => {
              if (!v) return
              setKanal(v as "email")
              setTujuan("")
              setHasil(null)
            }}
            aria-label="Kanal"
            className="justify-start"
          >
            <ToggleGroupItem value="email" className="h-11 gap-2 px-4 md:h-9">
              <IkonEmail /> Email
            </ToggleGroupItem>
            <ToggleGroupItem value="whatsapp" className="h-11 gap-2 px-4 md:h-9">
              <IkonWhatsApp /> WhatsApp
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="tujuan-uji">{kanal === "email" ? "Alamat email" : "Nomor WhatsApp"}</FieldLabel>
              <Input
                id="tujuan-uji"
                type={kanal === "email" ? "email" : "tel"}
                inputMode={kanal === "email" ? "email" : "tel"}
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder={kanal === "email" ? "nama@email.com" : "0812-3456-7890"}
                className="h-11 md:h-9"
              />
            </Field>
            <Button type="submit" className="h-11 md:h-9" disabled={jalan || tujuan.trim().length < 5}>
              {jalan && <Spinner data-icon="inline-start" />} Kirim pesan uji
            </Button>
          </div>
          {hasil && (
            <p className={cn("rounded-lg px-3 py-2 text-sm", hasil.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")} role="status">
              {hasil.teks}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function KartuCron({ s }: { s: S }) {
  const terakhir = s.cron.terakhir ? new Date(s.cron.terakhir) : null
  const menit = terakhir ? Math.round((Date.now() - terakhir.getTime()) / 60000) : null
  const sehat = menit !== null && menit <= 5
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" aria-hidden /> Pengingat otomatis
        </CardTitle>
        <CardDescription>
          Pengingat H-1 dan 1 jam sebelum sesi, serta pengiriman ulang pesan yang gagal, dijalankan cron-job.org setiap menit.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {!s.cron.kunciDiisi ? (
          <Status aktif={false}>CRON_SECRET belum diisi di server. Pengingat tidak berjalan.</Status>
        ) : terakhir ? (
          <Status aktif={sehat}>
            Terakhir berjalan {menit === 0 ? "kurang dari semenit lalu" : `${menit} menit lalu`} ({formatTanggal(terakhir)}, {formatJam(terakhir)} WIB)
            {!sehat && ". Periksa jadwal di cron-job.org."}
          </Status>
        ) : (
          <Status aktif={false}>Belum pernah dipanggil. Atur jadwal di cron-job.org.</Status>
        )}
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs">{s.cron.url}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Salin alamat endpoint cron"
            onClick={() => navigator.clipboard.writeText(s.cron.url).then(() => toast.success("Alamat disalin."), () => {})}
          >
            <Copy />
          </Button>
        </div>
        <p className="text-muted-foreground">Langkah pengaturannya ada di dokumen docs/CRON.md.</p>
      </CardContent>
    </Card>
  )
}
