import "@tanstack/react-start/server-only"
import { PesanError } from "@/lib/errors"

// Kode error Postgres: https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = "23505"
const FOREIGN_KEY_VIOLATION = "23503"

type PgErr = { code?: string; constraint?: string; cause?: unknown }

function akar(e: unknown): PgErr {
  let cur = e as PgErr
  // Drizzle membungkus error driver `pg` di `cause`.
  for (let i = 0; i < 3 && cur?.cause && !cur.code; i++) cur = cur.cause as PgErr
  return cur ?? {}
}

/** Nama constraint unik yang dilanggar (mis. "users_email_unique"), atau null bila bukan error duplikat. */
export function indexDuplikat(e: unknown): string | null {
  const r = akar(e)
  if (r.code !== UNIQUE_VIOLATION) return null
  return r.constraint ?? "unknown"
}

/** Error karena baris masih direferensikan foreign key. */
export function masihDipakai(e: unknown) {
  return akar(e).code === FOREIGN_KEY_VIOLATION
}

/** Ubah error duplikat menjadi PesanError yang ramah; error lain dilempar ulang apa adanya. */
export function lemparDuplikat(e: unknown, peta: Record<string, string>): never {
  const idx = indexDuplikat(e)
  if (idx) throw new PesanError(peta[idx] ?? "Data yang sama sudah ada.")
  throw e
}

export const PESAN_DUPLIKAT_AKUN: Record<string, string> = {
  users_username_unique: "NIP/NIS ini sudah dipakai akun lain.",
  guru_bk_nip_unique: "NIP ini sudah terdaftar.",
  siswa_nis_unique: "NIS ini sudah terdaftar.",
  users_email_unique: "Email ini sudah dipakai akun lain.",
}
