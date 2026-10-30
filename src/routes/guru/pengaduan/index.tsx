import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/guru/pengaduan/")({
  head: () => ({ meta: [{ title: "Pengaduan Masuk · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Pengaduan Masuk" sprint={2}>
      Antrean anonim, pengaduan milik saya, dan tanggapan.
    </SegeraHadir>
  ),
})
