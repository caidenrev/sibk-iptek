import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/siswa/jadwal/")({
  head: () => ({ meta: [{ title: "Jadwal Konseling · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Jadwal Konseling" sprint={3}>
      Jadwal mendatang, riwayat, dan pembatalan sesi.
    </SegeraHadir>
  ),
})
