# Catatan Revisi Proposal — Pergantian MySQL ke PostgreSQL

> 30 Oktober 2026 · Disarankan dikonsultasikan ke dosen pembimbing sebelum naskah diubah.

## Alasan perubahan (bisa dipakai untuk menjelaskan ke dosen)

1. **Integritas penjadwalan.** PostgreSQL mendukung *partial unique index*. Aturan "satu slot konseling hanya boleh memiliki satu pengajuan aktif" dijaga langsung oleh basis data, bukan hanya oleh kode aplikasi, sehingga pemesanan ganda (BB-18) tidak mungkin terjadi walau ada dua permintaan bersamaan.
2. **Ketepatan waktu pengingat.** Tipe `timestamptz` menyimpan waktu beserta zona waktunya. Pengingat H-1 dan 1 jam (KF-10) dihitung tanpa risiko selisih 7 jam antara server dan WIB.
3. **Keamanan data anonim.** PostgreSQL mendukung Row Level Security, lapisan pengaman tambahan agar tabel pengaduan tidak dapat dibaca dari luar aplikasi.
4. **Hosting.** Basis data di-hosting di Supabase (PostgreSQL terkelola, tersedia paket gratis dan backup otomatis) dan dapat dipindahkan ke VPS dengan `pg_dump` tanpa mengubah kode.

Fungsi sistem, rancangan tabel, relasi, dan metode penelitian **tidak berubah**. Yang berubah hanya perangkat lunak basis datanya.

## Bagian naskah yang perlu diubah

| Bagian | Sekarang | Usulan |
|---|---|---|
| Abstrak | "…dibangun menggunakan framework TanStack Start berbasis React dan basis data MySQL." | "…dibangun menggunakan framework TanStack Start berbasis React dan basis data PostgreSQL." |
| 1.1 Latar Belakang (paragraf metode) | "…serta basis data MySQL." | "…serta basis data PostgreSQL." |
| 1.4 Batasan, poin 2 | "…runtime Node.js dan basis data MySQL…" | "…runtime Node.js dan basis data PostgreSQL…" |
| 2.2.7 judul subbab | "Website, React, TanStack Start, dan MySQL" | "Website, React, TanStack Start, dan PostgreSQL" |
| 2.2.7 butir "MySQL dan Drizzle ORM" | Definisi MySQL | Ganti dengan definisi PostgreSQL: RDBMS open source yang mendukung SQL standar, transaksi ACID, *partial index*, tipe waktu berzona (`timestamptz`), dan Row Level Security. Drizzle ORM mendukung PostgreSQL. Tambahkan rujukan dokumentasi resmi PostgreSQL. |
| 3.2.3 Arsitektur Sistem + Gambar 3.3 | "…basis data MySQL melalui Drizzle ORM…" | "…basis data PostgreSQL (Supabase) melalui Drizzle ORM…" |
| 3.4.3 Tabel 3.9–3.19 (tipe data) | `ENUM`, `TIMESTAMP`, `DATETIME` | `ENUM` → tipe enum PostgreSQL (mis. `peran`), `TIMESTAMP`/`DATETIME` → `TIMESTAMPTZ`. `BIGINT`, `VARCHAR`, `TEXT`, `BOOLEAN` tetap. |
| Tabel 2.1 / 2.2 (research gap) | Penelitian lain memakai PHP/Laravel + MySQL | Tidak wajib diubah. Bisa ditambah satu kalimat bahwa penelitian ini memakai PostgreSQL. |
| Daftar Pustaka | — | Tambah: PostgreSQL Global Development Group. (2026). *PostgreSQL Documentation*. https://www.postgresql.org/docs/ (dan Supabase Docs bila disebut). |

## Yang tidak perlu diubah

- Use case, activity diagram, product backlog, rencana sprint.
- Nama tabel & kolom ERD (tetap sama, ditambah kolom revisi di PRD §8).
- Black Box & UAT.


---

# Catatan Revisi 2 — Kebutuhan fungsional tambahan (verifikasi kontak & lupa password)

| Bagian | Usulan |
|---|---|
| Tabel 3.2 Kebutuhan fungsional | Tambah **KF-15**: "Sistem memverifikasi email/nomor WhatsApp pengguna dengan kode OTP" (Siswa, Guru BK) dan **KF-16**: "Pengguna dapat mereset password mandiri dengan kode OTP melalui email atau WhatsApp yang terverifikasi" (Semua). |
| Tabel 3.3 KNF-01 Keamanan | Tambahkan: "kode OTP 6 digit berlaku 10 menit, disimpan dalam bentuk hash, dibatasi 5 kali percobaan". |
| Tabel 3.5 Product backlog | Tambah PB-16 "Sebagai pengguna, saya ingin mereset password sendiri jika lupa" (Sedang, Sprint 1). |
| Tabel 3.8 Use case | Tambah use case "Reset Password" (Siswa, Guru BK) dan "Verifikasi Kontak" (Siswa, Guru BK). |
| 3.4.3 ERD & tabel | Tambah tabel `kode_otp` dan kolom `email_terverifikasi_pada`, `wa_terverifikasi_pada` pada `users`. |
| Tabel 3.20 Halaman | Tambah "Lupa Password" (semua pengguna). |
| Tabel 3.21 Black Box | Tambah BB-26 s.d. BB-30 (lihat SPRINTS.md). |
| 2.2.6 Email (SMTP) | Bisa ditambah: layanan email transaksional (mis. Resend) yang diakses lewat SMTP dengan Nodemailer. |
