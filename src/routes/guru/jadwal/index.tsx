import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/guru/jadwal/")({
  head: () => ({ meta: [{ title: "Pengajuan & Sesi · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Pengajuan & Sesi" sprint={3}>
      Persetujuan pengajuan jadwal dan catatan konseling.
    </SegeraHadir>
  ),
})
