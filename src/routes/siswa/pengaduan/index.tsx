import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/siswa/pengaduan/")({
  head: () => ({ meta: [{ title: "Pengaduan Saya · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Pengaduan Saya" sprint={2}>
      Riwayat pengaduan, pencarian kode tiket, dan percakapan dengan Guru BK.
    </SegeraHadir>
  ),
})
