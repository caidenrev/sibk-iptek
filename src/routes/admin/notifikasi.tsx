import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/admin/notifikasi")({
  head: () => ({ meta: [{ title: "Log Notifikasi · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Log Notifikasi" sprint={3}>
      Riwayat pengiriman dan kirim ulang pesan yang gagal.
    </SegeraHadir>
  ),
})
