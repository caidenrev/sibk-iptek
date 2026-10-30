import { createFileRoute } from "@tanstack/react-router"
import { SegeraHadir } from "@/components/app/page-header"

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Notifikasi · SIBK" }] }),
  component: () => (
    <SegeraHadir title="Pengaturan Notifikasi" sprint={3}>
      Konfigurasi WhatsApp (Fonnte) dan email (SMTP).
    </SegeraHadir>
  ),
})
