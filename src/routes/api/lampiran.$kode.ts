import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { userDariSesi } from "@/server/auth/session"
import { hashPengirim } from "@/server/crypto"
import { db } from "@/server/db/client"
import { pengaduan } from "@/server/db/schema"
import { bacaLampiran } from "@/server/services/lampiran"

// Lampiran pengaduan disajikan lewat route ini (tidak ada URL publik ke penyimpanan).
// Siswa: hanya lampiran aduannya sendiri. Guru BK: semua aduan. Admin: ditolak (tidak boleh membaca isi aduan).
export const Route = createFileRoute("/api/lampiran/$kode")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await userDariSesi()
        if (!user) return new Response("Silakan masuk terlebih dahulu.", { status: 401 })

        const kode = params.kode.toUpperCase()
        const [p] = await db
          .select({ lampiran: pengaduan.lampiran, tipe: pengaduan.lampiranTipe, hash: pengaduan.pengirimHash })
          .from(pengaduan)
          .where(eq(pengaduan.kodeTiket, kode))
        const boleh =
          !!p &&
          (user.role === "guru_bk" || (user.role === "siswa" && !!user.siswaId && p.hash === hashPengirim(user.siswaId)))
        // Bukan pemilik → jawab "tidak ditemukan" agar keberadaan aduan orang lain tidak terungkap.
        if (!p?.lampiran || !p.tipe || !boleh) return new Response("Lampiran tidak ditemukan.", { status: 404 })

        const isi = await bacaLampiran(p.lampiran)
        if (!isi) return new Response("Lampiran tidak ditemukan.", { status: 404 })

        const ekstensi = p.tipe === "application/pdf" ? "pdf" : p.tipe.split("/")[1]
        return new Response(new Uint8Array(isi), {
          headers: {
            "Content-Type": p.tipe,
            "Content-Disposition": `inline; filename="lampiran-${kode}.${ekstensi}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
          },
        })
      },
    },
  },
})
