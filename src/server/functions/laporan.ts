// Laporan layanan BK (Sprint 4 · KF-12). Guru BK dan admin; isinya hanya angka agregat.
import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"
import { db } from "../db/client"
import { guruBk, kategoriMasalah, users } from "../db/schema"
import { hitungLaporan } from "../services/laporan"
import { guruAtauAdminMw } from "./middleware"
import { filterLaporanSchema } from "@/lib/validasi"

export const laporanFn = createServerFn({ method: "GET" })
  .middleware([guruAtauAdminMw])
  .validator(filterLaporanSchema)
  .handler(({ data }) => hitungLaporan(data))

export const opsiLaporanFn = createServerFn({ method: "GET" })
  .middleware([guruAtauAdminMw])
  .handler(async ({ context }) => {
    const [kategori, guru] = await Promise.all([
      db.select({ id: kategoriMasalah.id, nama: kategoriMasalah.namaKategori }).from(kategoriMasalah).orderBy(asc(kategoriMasalah.id)),
      db.select({ id: guruBk.id, nama: users.nama }).from(guruBk).innerJoin(users, eq(users.id, guruBk.userId)).orderBy(asc(users.nama)),
    ])
    return { kategori, guru, guruSaya: context.user.guruBkId }
  })
