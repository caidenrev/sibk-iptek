import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { userDariSesi } from "@/server/auth/session"
import { db } from "@/server/db/client"
import { guruBk, kategoriMasalah, users } from "@/server/db/schema"
import { buatPdfLaporan } from "@/server/laporan/pdf"
import { hitungLaporan } from "@/server/services/laporan"
import { filterLaporanSchema } from "@/lib/validasi"

// GET /api/laporan.pdf?dari=YYYY-MM-DD&sampai=YYYY-MM-DD[&kategoriId=..][&guruBkId=..]
// Guru BK dan admin. Isinya hanya angka agregat (BB-10, BB-25).
export const Route = createFileRoute("/api/laporan.pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await userDariSesi()
        if (!user) return new Response("Silakan masuk terlebih dahulu.", { status: 401 })
        if (user.role !== "guru_bk" && user.role !== "admin") return new Response("Akses ditolak.", { status: 403 })

        const q = new URL(request.url).searchParams
        const angka = (k: string) => (q.get(k) ? Number(q.get(k)) : undefined)
        const f = filterLaporanSchema.safeParse({ dari: q.get("dari"), sampai: q.get("sampai"), kategoriId: angka("kategoriId"), guruBkId: angka("guruBkId") })
        if (!f.success) return new Response("Periode laporan tidak valid.", { status: 400 })

        const [isi, kategori, guru] = await Promise.all([
          hitungLaporan(f.data),
          f.data.kategoriId ? db.select({ nama: kategoriMasalah.namaKategori }).from(kategoriMasalah).where(eq(kategoriMasalah.id, f.data.kategoriId)) : [],
          f.data.guruBkId
            ? db.select({ nama: users.nama }).from(guruBk).innerJoin(users, eq(users.id, guruBk.userId)).where(eq(guruBk.id, f.data.guruBkId))
            : [],
        ])
        const pdf = await buatPdfLaporan(isi, {
          namaKategori: kategori[0]?.nama ?? null,
          namaGuru: guru[0]?.nama ?? null,
          penandatangan: user.role === "guru_bk" ? user.nama : (guru[0]?.nama ?? null),
          dicetakOleh: user.nama,
        })
        return new Response(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="laporan-bk-${f.data.dari}-sd-${f.data.sampai}.pdf"`,
            "Cache-Control": "private, no-store",
          },
        })
      },
    },
  },
})
