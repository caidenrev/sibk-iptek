import { zodResolver } from "@hookform/resolvers/zod"
import { LockKeyhole } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { FormPassword } from "./form"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { pesanError } from "@/lib/pesan-error"
import { gantiPasswordSchema } from "@/lib/validasi"
import { gantiPasswordFn } from "@/server/functions/auth"

type Input = z.input<typeof gantiPasswordSchema>

export function GantiPasswordForm({
  onBerhasil,
  labelLama = "Password lama",
  tombol = "Simpan password",
  ikon = false,
}: {
  onBerhasil?: () => void | Promise<void>
  labelLama?: string
  tombol?: string
  /** Ikon gembok di dalam kolom (dipakai di halaman tanpa menu) */
  ikon?: boolean
}) {
  const awalan = ikon ? <LockKeyhole /> : undefined
  const form = useForm<Input>({
    resolver: zodResolver(gantiPasswordSchema),
    defaultValues: { passwordLama: "", passwordBaru: "", konfirmasi: "" },
  })

  const kirim = form.handleSubmit(async (data) => {
    try {
      await gantiPasswordFn({ data })
      toast.success("Password berhasil diganti.")
      form.reset()
      await onBerhasil?.()
    } catch (e) {
      const pesan = pesanError(e)
      if (pesan.includes("lama")) form.setError("passwordLama", { message: pesan })
      else toast.error(pesan)
    }
  })

  return (
    <form onSubmit={kirim} noValidate>
      <FieldGroup>
        <FormPassword control={form.control} name="passwordLama" label={labelLama} awalan={awalan} />
        <FormPassword
          control={form.control}
          name="passwordBaru"
          label="Password baru"
          autoComplete="new-password"
          description="Minimal 8 karakter, kombinasi huruf dan angka."
          awalan={awalan}
        />
        <FormPassword control={form.control} name="konfirmasi" label="Ulangi password baru" autoComplete="new-password" awalan={awalan} />
        <Button type="submit" size="lg" className={ikon ? "h-12 md:h-10" : "h-11 md:h-10"} disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          {tombol}
        </Button>
      </FieldGroup>
    </form>
  )
}
