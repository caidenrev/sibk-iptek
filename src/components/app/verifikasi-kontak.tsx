import { useRouter } from "@tanstack/react-router"
import { BadgeCheck, CircleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { InputKodeOtp, KirimUlang } from "./kode-otp"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { pesanError } from "@/lib/pesan-error"
import { konfirmasiVerifikasiFn, kirimKodeVerifikasiFn } from "@/server/functions/akun"

type Kanal = "email" | "whatsapp"

export function StatusVerifikasi({
  terverifikasi,
  onVerifikasi,
}: {
  terverifikasi: boolean
  onVerifikasi?: () => void
}) {
  if (terverifikasi) {
    return (
      <Badge variant="secondary" className="bg-success/10 text-success dark:bg-success/20">
        <BadgeCheck data-icon="inline-start" aria-hidden /> Terverifikasi
      </Badge>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="bg-warning text-warning-foreground">
        <CircleAlert data-icon="inline-start" aria-hidden /> Belum diverifikasi
      </Badge>
      {onVerifikasi && (
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onVerifikasi}>
          Verifikasi sekarang
        </Button>
      )}
    </span>
  )
}

/** Dialog verifikasi kontak: kode dikirim otomatis saat dibuka, lalu pengguna memasukkan 6 digit. */
export function DialogVerifikasi({
  kanal,
  tujuan,
  open,
  onOpenChange,
}: {
  kanal: Kanal
  tujuan: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const [kode, setKode] = useState("")
  const [galat, setGalat] = useState<string | null>(null)
  const [status, setStatus] = useState<"mengirim" | "siap" | "memeriksa">("mengirim")
  const sudahKirim = useRef(false)

  async function kirim() {
    try {
      await kirimKodeVerifikasiFn({ data: { kanal } })
      return true
    } catch (e) {
      toast.error(pesanError(e))
      return false
    }
  }

  useEffect(() => {
    if (!open) {
      sudahKirim.current = false
      setKode("")
      setGalat(null)
      return
    }
    if (sudahKirim.current) return
    sudahKirim.current = true
    setStatus("mengirim")
    kirim().finally(() => setStatus("siap"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function periksa(nilai: string) {
    setStatus("memeriksa")
    setGalat(null)
    try {
      await konfirmasiVerifikasiFn({ data: { kanal, kode: nilai } })
      toast.success(kanal === "email" ? "Email terverifikasi." : "Nomor WhatsApp terverifikasi.")
      onOpenChange(false)
      await router.invalidate()
    } catch (e) {
      setGalat(pesanError(e))
      setKode("")
    } finally {
      setStatus("siap")
    }
  }

  const label = kanal === "email" ? "email" : "WhatsApp"

  return (
    <Dialog open={open} onOpenChange={(o) => status !== "memeriksa" && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verifikasi {label}</DialogTitle>
          <DialogDescription>
            {status === "mengirim" ? `Mengirim kode ke ${tujuan}…` : `Masukkan 6 digit kode yang dikirim ke ${tujuan}.`}
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={!!galat}>
          <InputKodeOtp
            value={kode}
            onChange={setKode}
            onComplete={periksa}
            invalid={!!galat}
            disabled={status !== "siap"}
          />
          {galat && <FieldError>{galat}</FieldError>}
          <KirimUlang onKirim={kirim} />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={status === "memeriksa"}>
            Nanti saja
          </Button>
          <Button type="button" onClick={() => periksa(kode)} disabled={kode.length !== 6 || status !== "siap"}>
            {status === "memeriksa" && <Spinner data-icon="inline-start" />}
            Verifikasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
