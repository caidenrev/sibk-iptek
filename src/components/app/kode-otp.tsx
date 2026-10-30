import { REGEXP_ONLY_DIGITS } from "input-otp"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"

/** Kolom 6 digit untuk kode OTP. `autoComplete="one-time-code"` agar HP bisa mengisi otomatis dari SMS/notifikasi. */
export function InputKodeOtp({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  id,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  invalid?: boolean
  disabled?: boolean
  id?: string
}) {
  return (
    <InputOTP
      id={id}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      aria-invalid={invalid}
      containerClassName="justify-center sm:justify-start"
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} className="size-11" />
        <InputOTPSlot index={1} className="size-11" />
        <InputOTPSlot index={2} className="size-11" />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} className="size-11" />
        <InputOTPSlot index={4} className="size-11" />
        <InputOTPSlot index={5} className="size-11" />
      </InputOTPGroup>
    </InputOTP>
  )
}

/** Tombol "Kirim ulang" dengan hitung mundur (server juga menolak permintaan < 60 detik). */
export function KirimUlang({ onKirim, jeda = 60 }: { onKirim: () => Promise<boolean>; jeda?: number }) {
  const [sisa, setSisa] = useState(jeda)
  const [kirim, setKirim] = useState(false)

  useEffect(() => {
    if (sisa <= 0) return
    const t = setTimeout(() => setSisa((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [sisa])

  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0 text-sm"
      disabled={sisa > 0 || kirim}
      onClick={async () => {
        setKirim(true)
        const ok = await onKirim()
        setKirim(false)
        if (ok) setSisa(jeda)
      }}
    >
      {kirim && <Spinner data-icon="inline-start" />}
      {sisa > 0 ? `Kirim ulang kode (${sisa} dtk)` : "Kirim ulang kode"}
    </Button>
  )
}
