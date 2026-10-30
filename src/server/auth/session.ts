import "@tanstack/react-start/server-only"
import { createHash, randomBytes } from "node:crypto"
import { deleteCookie, getCookie, getRequestHeader, getRequestIP, setCookie } from "@tanstack/react-start/server"
import { and, eq, gt, lt } from "drizzle-orm"
import { db } from "../db/client"
import { guruBk, kelas, sesi, siswa, users } from "../db/schema"
import type { Peran } from "../db/schema"
import { env } from "../env"

const COOKIE = "sibk_sesi"
const UMUR_DETIK = 7 * 24 * 60 * 60

/** Data pengguna yang aman dikirim ke browser (tanpa hash password). */
export type SessionUser = {
  id: number
  username: string
  nama: string
  role: Peran
  email: string | null
  noWhatsapp: string | null
  harusGantiPassword: boolean
  emailTerverifikasi: boolean
  waTerverifikasi: boolean
  /** Teks di bawah nama: kelas (siswa) atau "Guru BK" */
  keterangan: string
  siswaId: number | null
  guruBkId: number | null
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex")

export function ipKlien() {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? "unknown"
  } catch {
    return "unknown"
  }
}

export async function buatSesi(userId: number) {
  const token = randomBytes(32).toString("base64url")
  await db.insert(sesi).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + UMUR_DETIK * 1000),
    ip: ipKlien().slice(0, 45),
    userAgent: (getRequestHeader("user-agent") ?? "").slice(0, 255),
  })
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: UMUR_DETIK,
  })
  // Bersihkan sesi kedaluwarsa milik user ini (murah, tidak perlu cron terpisah).
  await db.delete(sesi).where(and(eq(sesi.userId, userId), lt(sesi.expiresAt, new Date())))
}

export async function hapusSesiSaatIni() {
  const token = getCookie(COOKIE)
  if (token) await db.delete(sesi).where(eq(sesi.tokenHash, hashToken(token)))
  deleteCookie(COOKIE, { path: "/" })
}

/** Hapus semua sesi user, kecuali sesi yang sedang dipakai (bila `kecualiSaatIni`). */
export async function hapusSemuaSesi(userId: number, kecualiSaatIni = false) {
  const token = kecualiSaatIni ? getCookie(COOKIE) : undefined
  const rows = await db.select({ id: sesi.id, tokenHash: sesi.tokenHash }).from(sesi).where(eq(sesi.userId, userId))
  const keep = token ? hashToken(token) : null
  for (const r of rows) if (r.tokenHash !== keep) await db.delete(sesi).where(eq(sesi.id, r.id))
}

/** Ambil user dari cookie sesi. null bila tidak login / sesi habis / akun nonaktif. */
export async function userDariSesi(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE)
  if (!token) return null

  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      nama: users.nama,
      role: users.role,
      email: users.email,
      noWhatsapp: users.noWhatsapp,
      harusGantiPassword: users.harusGantiPassword,
      isActive: users.isActive,
      emailTerverifikasiPada: users.emailTerverifikasiPada,
      waTerverifikasiPada: users.waTerverifikasiPada,
      siswaId: siswa.id,
      namaKelas: kelas.namaKelas,
      guruBkId: guruBk.id,
    })
    .from(sesi)
    .innerJoin(users, eq(users.id, sesi.userId))
    .leftJoin(siswa, eq(siswa.userId, users.id))
    .leftJoin(kelas, eq(kelas.id, siswa.kelasId))
    .leftJoin(guruBk, eq(guruBk.userId, users.id))
    .where(and(eq(sesi.tokenHash, hashToken(token)), gt(sesi.expiresAt, new Date())))
    .limit(1)

  if (!row || !row.isActive) return null

  return {
    id: row.id,
    username: row.username,
    nama: row.nama,
    role: row.role,
    email: row.email,
    noWhatsapp: row.noWhatsapp,
    harusGantiPassword: row.harusGantiPassword,
    emailTerverifikasi: !!row.email && !!row.emailTerverifikasiPada,
    waTerverifikasi: !!row.noWhatsapp && !!row.waTerverifikasiPada,
    keterangan: row.role === "siswa" ? (row.namaKelas ?? "Siswa") : row.role === "guru_bk" ? "Guru BK" : "Admin",
    siswaId: row.siswaId,
    guruBkId: row.guruBkId,
  }
}
