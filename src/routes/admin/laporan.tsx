import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/admin/laporan")({
  head: () => ({ meta: [{ title: "Laporan · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Laporan" sprint={4}>
      Statistik agregat layanan BK.
    </SegeraHadir>
  ),
})
