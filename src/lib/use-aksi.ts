import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { pesanError } from "./pesan-error"

/**
 * Jalankan aksi server lalu tampilkan toast & muat ulang data halaman.
 * Mengembalikan true bila berhasil.
 */
export function useAksi() {
  const router = useRouter()
  return async (fn: () => Promise<unknown>, pesanSukses: string) => {
    try {
      await fn()
      toast.success(pesanSukses)
      await router.invalidate()
      return true
    } catch (e) {
      toast.error(pesanError(e))
      return false
    }
  }
}
