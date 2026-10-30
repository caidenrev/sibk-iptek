import type { PoolConfig } from "pg"

/**
 * Opsi koneksi Postgres, dipakai aplikasi dan skrip seed.
 * Database lokal (localhost) tanpa SSL; Supabase/VPS dengan SSL.
 */
export function opsiPool(url: string): PoolConfig {
  const host = new URL(url).hostname
  const lokal = host === "localhost" || host === "127.0.0.1"
  return {
    connectionString: url,
    max: 10,
    // Supabase memakai sertifikat yang ditandatangani CA miliknya sendiri, jadi verifikasi
    // rantai sertifikat dilonggarkan; koneksi tetap terenkripsi.
    ssl: lokal ? undefined : { rejectUnauthorized: false },
    // Semua waktu bertipe timestamptz; sesi diset UTC agar konsisten.
    options: "-c timezone=UTC",
  }
}
