import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/guru/laporan")({
  head: () => ({ meta: [{ title: "Laporan · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Laporan" sprint={4}>
      Rekap per kategori dan periode, cetak PDF.
    </SegeraHadir>
  ),
})
