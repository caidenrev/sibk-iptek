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


---

# Catatan Revisi 3 — Hasil implementasi Sprint 2 s.d. 4

> 3 November 2026 · Perubahan yang muncul saat implementasi. Konsultasikan ke dosen pembimbing; sebagian besar cukup ditambahkan di BAB IV sebagai hasil Sprint Review.

## Arsitektur & teknologi (BAB II 2.2, BAB III 3.2.3 + Gambar 3.3)

| Bagian | Usulan |
|---|---|
| Hosting | Aplikasi di **Vercel** (serverless), basis data **PostgreSQL di Supabase** |
| Penyimpanan lampiran | **Supabase Storage** (bucket privat, hanya diakses lewat server) karena Vercel tidak punya disk permanen. Foto diproses ulang dengan `sharp` untuk menghapus EXIF |
| Notifikasi | Email lewat **Resend** (SMTP + Nodemailer), WhatsApp lewat **Fonnte**. Pesan disimpan dulu di tabel `notifikasi` (pola *outbox*), dikirim langsung lalu dicoba ulang maksimal 3 kali |
| Penjadwal (cron) | **cron-job.org** memanggil endpoint `/api/cron` tiap menit, karena cron Vercel versi gratis hanya sekali sehari. Endpoint dilindungi kunci rahasia `CRON_SECRET` |
| Laporan PDF | `@react-pdf/renderer` di server (kop sekolah, tanda tangan Kepala Sekolah & Guru BK) |
| PWA | Aplikasi bisa dipasang di HP/laptop (manifest + service worker). Service worker sengaja tidak menyimpan data pengaduan |
| Pembaruan data | Tanpa refresh: browser mengecek "ada perubahan?" setiap 5 detik (halaman percakapan) atau 15 detik (halaman lain) |

## Kebutuhan & aturan (BAB III Tabel 3.2, 3.3)

- **Pengaduan:** lampiran PDF hanya untuk mode beridentitas (metadata PDF bisa memuat nama penulis). Tanda "belum dibaca" memakai `dibaca_siswa_pada` / `dibaca_guru_pada` di tabel `pengaduan`.
- **Buka identitas (KNF-02):** hanya untuk satu aduan yang dipilih, tidak bisa dibatalkan; `is_anonim` tetap tercatat agar statistik tidak berubah.
- **Jadwal:** slot yang sedang dipesan tidak bisa ditutup; slot yang pernah punya pengajuan tidak bisa dihapus; Guru BK bisa membatalkan sesi yang sudah disetujui (alasan wajib); batas 2 pengajuan aktif hanya menghitung sesi yang belum dimulai.
- **Notifikasi:** hanya ke kontak yang sudah diverifikasi; pesan untuk aduan anonim tidak memuat isi/judul aduan; notifikasi balasan maksimal sekali per 30 menit per aduan; di log admin isi pesan tidak ditampilkan dan penerima aduan anonim disamarkan.
- **Pengaturan admin:** hanya token Fonnte yang diubah lewat halaman admin (terenkripsi). SMTP tetap di konfigurasi server karena terikat domain pengirim.
- **Catatan konseling:** ringkasan masalah hanya untuk Guru BK penulisnya; siswa hanya melihat tindak lanjut bila dicentang; admin tidak bisa membuka catatan.
- **Laporan:** ekspor Excel (opsional di PRD) belum dibuat; PDF sudah.

## ERD & kamus data (BAB III 3.4.3, Tabel 3.9–3.19)

| Tabel | Perubahan |
|---|---|
| `pengaduan` | + `dibaca_siswa_pada`, `dibaca_guru_pada`, `updated_at` |
| `tanggapan` | Tanpa `dibaca_pada` (dipindah ke `pengaduan`); `user_id` NULL untuk pesan siswa |
| `slot_jadwal` | + `created_at`, `updated_at`; aturan "tidak tumpang tindih" dijaga constraint **EXCLUDE** PostgreSQL (lebih ketat dari unik `(guru_bk_id, tanggal, jam_mulai)`) |
| `jadwal_konseling` | Indeks unik parsial: satu pengajuan aktif per slot (anti *double booking*) |
| `notifikasi` | + `tujuan`, `subjek`, `html`, `kunci`, `diklaim_pada`; unik `(user_id, kanal, kunci)` |
| `pengaturan` | Tabel baru: `kunci`, `nilai` (terenkripsi bila rahasia), `is_rahasia`, `updated_at` |
| `catatan_konseling` | + `guru_bk_id`, `tampilkan_ke_siswa`, `perlu_lanjutan`, `updated_at` |

Migrasi: `drizzle/0000` s.d. `0005`.

## Halaman (Tabel 3.20)

Tambah: **Detail Sesi** (Guru BK, `/guru/jadwal/$id`), **Pengaturan Notifikasi** & **Log Notifikasi** (Admin), **Laporan** + unduh PDF (Guru BK & Admin), halaman **offline** (PWA).

## Pengujian (Tabel 3.21)

BB-01 s.d. BB-30 seluruhnya sudah diuji dan sesuai. Rinciannya di `docs/hasil-uji/sprint-1.md` s.d. `sprint-4.md`.
