import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/guru/slot")({
  head: () => ({ meta: [{ title: "Slot Jadwal · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Slot Jadwal" sprint={3}>
      Kalender slot ketersediaan konseling.
    </SegeraHadir>
  ),
})
