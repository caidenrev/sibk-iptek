# Rencana Sprint — SIBK

> Mengikuti Tabel 3.5–3.6 proposal (4 sprint × ±2 minggu), ditambah **Sprint 0** (persiapan teknis, ±2–3 hari) yang tidak menambah backlog fungsional.
>
> **Definition of Done (setiap item):** fitur berjalan di browser desktop & HP · validasi server (zod) ada · hak akses diuji · skenario Black Box terkait lulus · disetujui Product Owner di Sprint Review.

## Struktur proyek (target)

```
sistem-bk/
├─ docs/                    PRD, DESIGN, SPRINTS, hasil pengujian
├─ drizzle/                 file migrasi SQL
├─ src/
│  ├─ routes/               file-based routes TanStack (lihat PRD §9)
│  │  ├─ __root.tsx
│  │  ├─ _auth/             login, ganti-password
│  │  ├─ siswa/  guru/  admin/
│  │  └─ api/               server routes (lampiran, laporan.pdf)
│  ├─ components/
│  │  ├─ ui/                komponen shadcn (hasil add --all)
│  │  └─ app/               komponen aplikasi (StatusBadge, AnonBadge, Thread, SlotCalendar, ...)
│  ├─ server/
│  │  ├─ db/                schema.ts, client.ts, seed.ts
│  │  ├─ auth/              session, password, middleware RBAC
│  │  ├─ crypto/            aes-gcm, hmac
│  │  ├─ services/          pengaduan, jadwal, laporan, import-siswa
│  │  ├─ notif/             outbox, fonnte, mailer, templates, cron
│  │  └─ functions/         server functions per modul
│  ├─ lib/                  utils, format tanggal WIB, skema zod bersama
│  └─ styles/app.css        token tema (DESIGN §2)
├─ storage/lampiran/        file upload (di-gitignore)
├─ tests/                   vitest (unit/integrasi) + playwright (e2e)
└─ .env.example
```

---

## Sprint 0 — Persiapan teknis ✅ selesai

| # | Tugas |
|---|---|
| 0.1 | Scaffold TanStack Start (TypeScript) dengan pnpm, `git init` |
| 0.2 | Tailwind v4 + `npx shadcn@latest init` lalu `npx shadcn@latest add --all` |
| 0.3 | Terapkan token tema, font Plus Jakarta Sans, mode gelap ([DESIGN.md](DESIGN.md)); cek kontras |
| 0.4 | Drizzle + koneksi database (awalnya MySQL XAMPP; setelah Sprint 1 dipindah ke PostgreSQL/Supabase) |
| 0.5 | `.env.example`: `DATABASE_URL`, `APP_ENC_KEY`, `APP_HMAC_KEY`, `APP_URL`, `TZ=Asia/Jakarta` |
| 0.6 | Vitest + Playwright, ESLint/Prettier, script `pnpm dev / build / db:migrate / db:seed / test` |
| 0.7 | Layout shell (sidebar, header, bottom-nav siswa) dengan data dummy |

**Hasil:** aplikasi kosong yang bisa dijalankan, tema sudah sesuai, terhubung ke DB.

---

## Sprint 1 — Fondasi: autentikasi, peran, data master ✅ selesai · [hasil uji](hasil-uji/sprint-1.md)
**Backlog:** PB-01, PB-02, PB-03 · **KF:** 01, 13

| # | Tugas |
|---|---|
| 1.1 | Skema & migrasi: `users`, `sesi`, `siswa`, `guru_bk`, `kelas`, `kategori_masalah` |
| 1.2 | Seed: 1 admin, 2 Guru BK, 3 kelas, 10 siswa, 4 kategori |
| 1.3 | Login/logout, sesi cookie, rate limit, wajib ganti password |
| 1.4 | Middleware RBAC + halaman 403/404; redirect ke dashboard sesuai peran |
| 1.5 | CRUD kelas, Guru BK, kategori (Data Table + Sheet form) |
| 1.6 | CRUD siswa + **import Excel/CSV** dengan pratinjau + unduh template |
| 1.7 | Reset password oleh admin, nonaktifkan akun |
| 1.8 | Halaman profil dasar (nama, email, WA, ganti password) |

**Black Box:** BB-01, BB-02, BB-11, BB-12, BB-13, BB-14

---

## Sprint 1 (tambahan) — Verifikasi kontak & lupa password ✅ selesai
**KF:** 15, 16 (tambahan, lihat PRD §5.1a)

| # | Tugas |
|---|---|
| 1b.1 | Skema: `kode_otp`, kolom `email/wa_terverifikasi_pada` |
| 1b.2 | Pengirim email (Nodemailer SMTP: Resend/Gmail) & WhatsApp (Fonnte), mode log saat pengembangan |
| 1b.3 | Layanan OTP (HMAC, kedaluwarsa, batas percobaan & permintaan) |
| 1b.4 | Halaman lupa password 3 langkah + tautan di halaman login |
| 1b.5 | Profil: status & dialog verifikasi kontak |

**Black Box:** BB-26 s.d. BB-30

---

## Sprint 2 — Pengaduan anonim/beridentitas & tanggapan ✅ selesai · [hasil uji](hasil-uji/sprint-2.md)
**Backlog:** PB-04, PB-05, PB-06 · **KF:** 03, 04, 05, 06

| # | Tugas |
|---|---|
| 2.1 | Skema: `pengaduan`, `tanggapan` |
| 2.2 | Modul crypto: AES-256-GCM (enkripsi ID pengirim), HMAC (`pengirim_hash`) + unit test |
| 2.3 | Generator kode tiket & alias |
| 2.4 | Form pengaduan (mode, pratinjau "Apa yang dilihat Guru BK", urgensi, lampiran) |
| 2.5 | Upload lampiran: validasi tipe/ukuran, hapus EXIF (`sharp`), route unduh dengan cek hak akses |
| 2.6 | Routing: beridentitas → pembina kelas; anonim → antrean bersama |
| 2.7 | Halaman Guru BK: tab antrean/milik saya/semua, detail, klaim "Tangani", tanggapan, ubah status |
| 2.8 | `toGuruView()`, satu-satunya jalur data aduan ke Guru BK, + test bahwa identitas tidak bocor di respons |
| 2.9 | Siswa: riwayat (termasuk anonim via hash), cari kode tiket, thread & balas, tanda belum dibaca |
| 2.10 | Notifikasi **in-app** saja (WA/email menyusul di Sprint 3, dengan antrean outbox yang sudah disiapkan) |

**Black Box:** BB-03, BB-04, BB-05, BB-06 (bagian penyimpanan), BB-15, BB-16, BB-17

**Catatan pelaksanaan:** lampiran disimpan di Supabase Storage (bucket privat), bukan disk server, karena Vercel tidak punya disk permanen. PDF hanya diterima pada mode beridentitas. Penanda belum dibaca memakai `dibaca_siswa_pada` / `dibaca_guru_pada` di tabel `pengaduan`. Dashboard siswa & Guru BK sudah memakai data asli; kartu jadwal menunggu Sprint 3.

---

## Sprint 3 — Penjadwalan, buka identitas, notifikasi WA & email ✅ selesai · [hasil uji](hasil-uji/sprint-3.md)
**Backlog:** PB-07 s.d. PB-11 · **KF:** 07, 08, 09, 10, 14

| # | Tugas |
|---|---|
| 3.0 ✅ | **Performa & pembaruan otomatis.** Sesi disimpan 60 detik di browser (server tetap memeriksa sesi di setiap server function), data halaman di-cache 10 detik, query yang tidak saling bergantung dijalankan paralel, garis loading saat pindah halaman. Data baru muncul tanpa refresh lewat polling ringan `jejakFn` (jumlah aduan + `max(updated_at)`): 5 detik di halaman percakapan, 15 detik di halaman lain, berhenti saat tab tidak dilihat. Hasil ukur: pindah menu ±110 ms (sebelumnya menunggu cek sesi + lencana + data, ±0,5–1 detik); pengaduan baru tampil di dashboard Guru BK ≤ 15 detik, balasan tampil di percakapan ≤ 5 detik |
| 3.0b ✅ | **Bisa dipasang sebagai aplikasi (PWA).** Manifest (`start_url` /login, ikon maskable), tombol "Pasang aplikasi" di landing dan ajakan yang bisa ditutup di dashboard siswa & Guru BK (Chrome/Edge memakai dialog browser; iPhone diberi petunjuk Bagikan → Tambah ke Layar Utama). Service worker sengaja minimal: tidak menyimpan data pengaduan, hanya halaman "sedang offline" |
| 3.0c ✅ | Tambahan antarmuka: sidebar baru (cari menu, sub-menu Pengaduan Masuk, kartu pengguna, mode ikon), logo resmi WhatsApp & Gmail, perintah `pnpm db:reset-aktivitas` + [panduan serah terima](SERAH-TERIMA.md) |
| 3.1 ✅ | Skema: `slot_jadwal`, `jadwal_konseling` (migrasi 0003; constraint EXCLUDE anti tumpang tindih + indeks unik satu pengajuan aktif per slot). `notifikasi` & `pengaturan` menyusul di 3.7–3.8 |
| 3.2 ✅ | Guru BK: kalender slot, tambah/ubah/tutup, slot berulang, cegah tumpang tindih |
| 3.3 ✅ | Siswa: wizard pengajuan; transaksi + row lock anti double-booking; batas 2 pengajuan aktif |
| 3.4 ✅ | Guru BK: setujui/tolak (alasan wajib); slot kembali tersedia saat ditolak/batal |
| 3.5 ✅ | Siswa: batalkan jadwal (≥ 2 jam sebelum sesi). Hasil uji: [sprint-3.md](hasil-uji/sprint-3.md) |
| 3.6 ✅ | Alur **buka identitas** dari aduan anonim (PRD §5.6) |
| 3.7 ✅ | Admin: token Fonnte (terenkripsi, dicek ke Fonnte sebelum disimpan) + uji koneksi + kirim pesan uji. **[REVISI]** SMTP tetap di env server karena terikat domain pengirim Resend; admin melihat statusnya |
| 3.8 ✅ | Layanan notifikasi: outbox, adapter Fonnte & Nodemailer, template pesan (versi aman untuk aduan anonim) |
| 3.9 ✅ | Cron 1 menit (endpoint `/api/cron`, dipanggil **cron-job.org**, lihat [CRON.md](CRON.md)): buat pengingat H-1 & 1 jam (unique key anti-dobel), kirim antrean, retry 3× |
| 3.10 ✅ | Admin: log notifikasi + kirim ulang; penerima disamarkan untuk notifikasi sensitif |
| 3.11 ✅ | Tombol "Kirim tes notifikasi" di profil |

**Status di Vercel (2 Nov 2026):**
- ✅ cron-job.org memanggil `/api/cron` tiap menit (uji coba: 200 `ok: true`).
- ✅ Email notifikasi teruji lewat alur asli (aduan baru, tanggapan, pengajuan, konfirmasi, pengingat H-1 dari cron produksi), semua terkirim tanpa error ke alamat uji Gmail.
- ⏳ WhatsApp menunggu token Fonnte (nomor pengirim khusus). Sebelum token diisi, kosongkan nomor WA contoh di akun uji agar pesan tidak terkirim ke nomor orang lain.

**Black Box:** BB-06 (notifikasi), BB-07, BB-08, BB-09, BB-18 s.d. BB-23

---

## Sprint 4 — Catatan, riwayat, dashboard, laporan, perbaikan ✅ selesai · [hasil uji](hasil-uji/sprint-4.md)
**Backlog:** PB-12 s.d. PB-15 · **KF:** 02, 11, 12

| # | Tugas |
|---|---|
| 4.1 ✅ | Skema: `catatan_konseling` (migrasi 0005, + `perlu_lanjutan`) |
| 4.2 ✅ | Halaman detail sesi Guru BK: tandai selesai/tidak hadir, form catatan (+ tampilkan tindak lanjut ke siswa, penanda perlu sesi lanjutan), riwayat sesi siswa dengan Guru BK yang sama |
| 4.3 ✅ | Siswa: riwayat konseling dengan tindak lanjut dari Guru BK |
| 4.4 ✅ | Dashboard siswa, Guru BK, admin memakai data asli: grafik per kategori + tren 6 bulan (Guru BK), jadwal terdekat (siswa), kesehatan notifikasi (admin) |
| 4.5 ✅ | Laporan: filter periode/kategori/Guru BK, ringkasan, **PDF** (kop sekolah, `@react-pdf/renderer`). Excel belum dibuat (opsional) |
| 4.6 ✅ | Profil lengkap (PB-15): email & WA + verifikasi, ganti password, kirim tes notifikasi (dibangun bertahap sejak Sprint 1) |
| 4.7 ✅ | Audit 22 halaman di layar HP (bergeser, label, target sentuh) + perbaikan; kinerja < 3 detik (sesi per request, query paralel) |
| 4.8 ✅ | [Panduan deploy & UAT](DEPLOY.md) + `pnpm db:seed-demo` |

**Black Box:** BB-10, BB-24, BB-25 · [hasil uji](hasil-uji/sprint-4.md)

---

## Pengujian

### Black Box Testing

BB-01 s.d. BB-11 = Tabel 3.21 proposal (tidak diubah). BB-12 dan seterusnya = **[REVISI] tambahan** untuk fitur/aturan baru. Teknik: Equivalence Partitioning.

| ID | Skenario | Masukan | Hasil yang diharapkan |
|---|---|---|---|
| BB-01 | Login data benar | Username & password valid | Masuk ke dashboard sesuai peran |
| BB-02 | Login data salah | Password tidak valid | Pesan kesalahan, akses ditolak |
| BB-03 | Kirim pengaduan anonim | Form lengkap, mode Anonim | Tersimpan, kode tiket muncul, Guru BK melihat alias tanpa nama & kelas |
| BB-04 | Kirim pengaduan beridentitas | Form lengkap, mode Beridentitas | Tersimpan dengan nama & kelas siswa |
| BB-05 | Pengaduan tidak lengkap | Isi kosong | Pesan validasi |
| BB-06 | Guru BK menanggapi | Teks tanggapan | Tanggapan tersimpan, notifikasi terkirim ke siswa |
| BB-07 | Ajukan jadwal | Pilih slot tersedia | Status Menunggu, slot terkunci, Guru BK dapat notifikasi |
| BB-08 | Konfirmasi jadwal | Guru BK menekan Setujui | Status Disetujui, WA & email terkirim |
| BB-09 | Pengingat otomatis | Waktu H-1 & 1 jam sebelum sesi | Pengingat terkirim & tercatat di log |
| BB-10 | Catatan & laporan | Catatan + filter periode | Catatan tersimpan; laporan tampil & bisa dicetak |
| BB-11 | Hak akses peran | Siswa membuka URL admin | Akses ditolak (403) |
| BB-12 | Login 6× gagal | Password salah berulang | Akun dikunci sementara 15 menit |
| BB-13 | Login pertama akun import | Password = NIS | Diarahkan ke halaman ganti password |
| BB-14 | Import siswa | File berisi NIS duplikat & baris kosong | Baris invalid ditandai, hanya baris valid tersimpan |
| BB-15 | Lampiran tidak valid | File .exe / > 5 MB | Ditolak dengan pesan |
| BB-16 | Siswa membuka aduan siswa lain | Kode tiket milik siswa lain | Tidak ditemukan / 403 |
| BB-17 | Respons API Guru BK untuk aduan anonim | Inspeksi network di browser | Tidak ada field nama/NIS/kelas/siswa_id |
| BB-18 | Double booking | Dua siswa memesan slot yang sama bersamaan | Hanya satu berhasil, yang lain mendapat pesan slot sudah dipesan |
| BB-19 | Tolak tanpa alasan | Alasan kosong | Pesan validasi |
| BB-20 | Tolak / batal jadwal | Guru BK menolak atau siswa membatalkan | Slot kembali Tersedia, notifikasi terkirim |
| BB-21 | Pengingat tidak dobel | Cron dijalankan 2× pada menit yang sama | Hanya satu pengingat per kanal |
| BB-22 | WA gateway gagal | Token Fonnte salah | Status Gagal setelah 3 percobaan, email tetap terkirim, bisa kirim ulang |
| BB-23 | Buka identitas | Siswa menyetujui buka identitas | Guru BK melihat nama untuk aduan itu saja; aduan anonim lain tetap tersamar |
| BB-24 | Admin membuka isi pengaduan | Admin mengakses URL detail aduan | Akses ditolak (403) |
| BB-25 | Laporan periode kosong | Periode tanpa data | Laporan tampil dengan angka 0, PDF tetap bisa dicetak |
| BB-26 | Lupa password tanpa kontak terverifikasi | NIS siswa tanpa email/WA terverifikasi | Diarahkan menghubungi admin, tidak ada kode dikirim |
| BB-27 | Lupa password dengan kode salah | Kode 6 digit salah | "Kode salah. Sisa N percobaan."; setelah 5 kali kode dibatalkan |
| BB-28 | Lupa password dengan kode benar | Kode dari email + password baru | Password tersimpan, langsung masuk ke beranda |
| BB-29 | Kode dipakai ulang | Kode yang sudah dipakai | "Kode sudah tidak berlaku" |
| BB-30 | Ganti email di profil | Email baru + kode verifikasi | Status "Belum diverifikasi" → setelah kode benar menjadi "Terverifikasi" |

### Uji otomatis (pendukung, bukan pengganti Black Box)
- **Unit (Vitest):** crypto (enkripsi/dekripsi, hash konsisten), generator tiket, aturan slot (tumpang tindih, jendela pengingat), `toGuruView()`.
- **Integrasi:** pemesanan slot paralel (BB-18), idempotensi cron (BB-21).
- **E2E (Playwright):** alur BB-01, BB-03, BB-07, BB-08, BB-11. Bisa dijadikan bukti tambahan di BAB IV.

### UAT
Tetap memakai 9 butir Tabel 3.22, skala Likert 1–5, ambang ≥ 61%. Usulan: buat juga versi Google Form/halaman kuesioner terpisah untuk siswa dan Guru BK, karena butir #4 dan #8 lebih relevan untuk Guru BK.
