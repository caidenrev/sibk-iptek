import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"

export type KonfirmasiState = {
  judul: string
  deskripsi: React.ReactNode
  /** Label tombol berupa aksinya, mis. "Hapus kelas" — bukan "OK" (DESIGN §6). */
  aksi: string
  bahaya?: boolean
  jalankan: () => Promise<unknown>
}

/** Dialog konfirmasi terkontrol: set state untuk membuka, null untuk menutup. */
export function Konfirmasi({ state, onClose }: { state: KonfirmasiState | null; onClose: () => void }) {
  const [jalan, setJalan] = useState(false)
  return (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && !jalan && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.judul}</AlertDialogTitle>
          <AlertDialogDescription>{state?.deskripsi}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={jalan}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant={state?.bahaya ? "destructive" : "default"}
            disabled={jalan}
            onClick={async (e) => {
              e.preventDefault()
              if (!state) return
              setJalan(true)
              try {
                await state.jalankan()
              } finally {
                setJalan(false)
                onClose()
              }
            }}
          >
            {jalan && <Spinner data-icon="inline-start" />}
            {state?.aksi}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
