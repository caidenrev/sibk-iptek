import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/siswa/pengaduan/baru")({
  head: () => ({ meta: [{ title: "Kirim Pengaduan · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Kirim Pengaduan" sprint={2}>
      Formulir pengaduan dengan pilihan mode anonim atau beridentitas.
    </SegeraHadir>
  ),
})
