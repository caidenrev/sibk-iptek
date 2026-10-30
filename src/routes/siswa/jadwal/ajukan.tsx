import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/siswa/jadwal/ajukan")({
  head: () => ({ meta: [{ title: "Ajukan Konseling · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Ajukan Konseling" sprint={3}>
      Pilih Guru BK, tanggal, dan slot waktu yang tersedia.
    </SegeraHadir>
  ),
})
