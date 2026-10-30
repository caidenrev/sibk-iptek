# SIBK — Sistem Informasi Bimbingan Konseling

Aplikasi web layanan BK SMK IPTEK Tangerang Selatan: pengaduan anonim/beridentitas, penjadwalan konseling dengan pengingat WhatsApp & email, catatan, dan laporan.

Dokumen: [PRD](docs/PRD.md) · [Design](docs/DESIGN.md) · [Rencana sprint](docs/SPRINTS.md) · [Logo](docs/brand/PANDUAN-LOGO.md)

**Stack:** TanStack Start (React 19, TypeScript, Vite) · shadcn/ui + Tailwind CSS v4 · PostgreSQL (Supabase) + Drizzle ORM · Nitro (server Node.js)

## Menjalankan di laptop

Kebutuhan: Node.js ≥ 22, pnpm, dan database PostgreSQL (project Supabase gratis, atau Postgres lokal/VPS).

1. Buat project di Supabase (region Singapore). Ambil connection string **Session pooler** dari tombol *Connect*.
2. Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` dengan connection string tadi, lalu isi tiga kunci acak (`APP_ENC_KEY`, `APP_HMAC_KEY`, `SESSION_SECRET`) dengan perintah yang tertulis di file tersebut.
3. Pasang dependensi & jalankan:
   ```bash
   pnpm install
   pnpm dev
   ```
4. Buat tabel & data awal:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```
   Akun uji (admin, Guru BK, siswa) tercantum di bagian atas `src/server/db/seed.ts`.
5. Buka http://localhost:3000. Cek koneksi database di http://localhost:3000/api/health.

## Script

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Server pengembangan (port 3000) |
| `pnpm build` · `pnpm start` | Build production & jalankan server Node (`.output/`) |
| `pnpm typecheck` | Pemeriksaan TypeScript |
| `pnpm test` · `pnpm test:e2e` | Unit test (Vitest) · uji end-to-end (Playwright) |
| `pnpm db:generate` · `pnpm db:migrate` | Buat & jalankan migrasi Drizzle |
| `pnpm db:seed` | Isi data awal |
| `pnpm db:studio` | Lihat isi database di browser |

## Struktur

```
src/routes/        halaman (file-based routing), api/ = server routes
src/components/ui  komponen shadcn (semua)
src/components/app komponen aplikasi (shell, badge status, logo)
src/server/        kode khusus server: env, db, auth, crypto, notifikasi
src/lib/           util bersama (format tanggal WIB)
tests/             unit & e2e
docs/              PRD, design, sprint
```
