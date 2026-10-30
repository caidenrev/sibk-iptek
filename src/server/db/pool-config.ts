import type { PoolConfig } from "pg"

/**
 * Opsi koneksi Postgres, dipakai aplikasi dan skrip seed.
 * Database lokal (localhost) tanpa SSL; Supabase/VPS dengan SSL.
 */
export function opsiPool(url: string): PoolConfig {
  const host = new URL(url).hostname
  const lokal = host === "localhost" || host === "127.0.0.1"
  // Di Vercel setiap instance serverless punya pool sendiri; pool kecil mencegah kuota koneksi
  // Supabase habis (pakai Transaction pooler, port 6543). Di laptop/VPS satu proses → pool lebih besar.
  const serverless = !!process.env.VERCEL
  return {
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? (serverless ? 2 : 10)),
    idleTimeoutMillis: serverless ? 5_000 : 30_000,
    // Supabase memakai sertifikat yang ditandatangani CA miliknya sendiri, jadi verifikasi
    // rantai sertifikat dilonggarkan; koneksi tetap terenkripsi.
    ssl: lokal ? undefined : { rejectUnauthorized: false },
    // Semua waktu bertipe timestamptz; sesi diset UTC agar konsisten.
    options: "-c timezone=UTC",
  }
}
