import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"
import { db } from "../db/client"
import { users } from "../db/schema"
import { bolehAkses } from "../auth/rate-limit"
import { ipKlien } from "../auth/session"
import { emailAktif, waAktif } from "../notif/kirim"
import { PesanError } from "@/lib/errors"

type AkunReset = { id: number; nama: string; email: string | null; wa: string | null }

/** Cari akun aktif + kontak terverifikasi yang bisa menerima kode. */
export async function akunUntukReset(username: string): Promise<AkunReset | null> {
  const [u] = await db
    .select({
      id: users.id,
      nama: users.nama,
      isActive: users.isActive,
      email: users.email,
      emailOk: users.emailTerverifikasiPada,
      wa: users.noWhatsapp,
      waOk: users.waTerverifikasiPada,
    })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username.trim()})`)
    .limit(1)
  if (!u?.isActive) return null
  return {
    id: u.id,
    nama: u.nama,
    // Email bisa dipakai bila terverifikasi; di mode pengembangan email dicetak ke log.
    email: u.email && u.emailOk && (emailAktif() || process.env.NODE_ENV !== "production") ? u.email : null,
    wa: u.wa && u.waOk && (await waAktif()) ? u.wa : null,
  }
}

export function batasiIp(langkah: string) {
  if (!bolehAkses(`lupa:${langkah}:${ipKlien()}`, 20, 15 * 60 * 1000)) {
    throw new PesanError("Terlalu banyak permintaan. Coba lagi dalam 15 menit.")
  }
}

