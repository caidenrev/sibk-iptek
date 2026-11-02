import { createFileRoute } from "@tanstack/react-router"
import { timingSafeEqual } from "node:crypto"
import { env } from "@/server/env"
import { buatPengingat, kirimAntrean } from "@/server/services/notifikasi"
import { simpanPengaturan } from "@/server/services/pengaturan"

// Dipanggil cron-job.org tiap menit (lihat docs/CRON.md):
//   1. buat pengingat H-1 & 1 jam untuk sesi yang disetujui (aman dipanggil berulang, BB-21)
//   2. kirim notifikasi yang menunggu, termasuk percobaan ulang yang sudah tiba waktunya (BB-22)
// Wajib menyertakan header "Authorization: Bearer <CRON_SECRET>".

function sah(request: Request) {
  if (!env.CRON_SECRET) return false
  const kiriman = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const a = Buffer.from(kiriman)
  const b = Buffer.from(env.CRON_SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function jalankan(request: Request) {
  if (!env.CRON_SECRET) return Response.json({ ok: false, error: "CRON_SECRET belum diisi." }, { status: 503 })
  if (!sah(request)) return Response.json({ ok: false, error: "Tidak diizinkan." }, { status: 401 })
  const mulai = Date.now()
  const pengingat = await buatPengingat()
  const kirim = await kirimAntrean({ batas: 100 })
  // Ditampilkan di halaman admin, supaya terlihat apakah cron-job.org benar-benar memanggil endpoint ini.
  await simpanPengaturan("cron.terakhir", new Date().toISOString(), false)
  return Response.json(
    { ok: true, pengingatDibuat: pengingat, ...kirim, ms: Date.now() - mulai },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export const Route = createFileRoute("/api/cron")({
  server: {
    handlers: {
      GET: ({ request }) => jalankan(request),
      POST: ({ request }) => jalankan(request),
    },
  },
})
