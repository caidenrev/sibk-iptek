# PRD — Sistem Informasi Bimbingan Konseling (SIBK) SMK IPTEK Tangerang Selatan

> Versi 0.2 · 30 Oktober 2026 · basis data diganti ke PostgreSQL (lihat [revisi-proposal.md](revisi-proposal.md)) · Sumber: Proposal Skripsi Eka Revandi (231011403212)
>
> Dokumen terkait: [DESIGN.md](DESIGN.md) (tampilan) · [SPRINTS.md](SPRINTS.md) (pembagian kerja & pengujian)

Bagian bertanda **[REVISI]** adalah perubahan atau tambahan dari rancangan di proposal. Semuanya sudah disepakati atau masih berupa usulan default. Kalau disetujui, BAB III proposal perlu disesuaikan (ERD, Tabel 3.9–3.19, use case).

---

## 1. Ringkasan

SIBK adalah aplikasi web untuk layanan BK di SMK IPTEK Tangerang Selatan. Masalah yang diselesaikan:

| Masalah (Identifikasi 1.2) | Solusi di sistem |
|---|---|
| Siswa takut identitasnya terekspos | Pengaduan mode **anonim** atau **beridentitas**; Guru BK hanya melihat alias + kode tiket |
| Jadwal konseling lisan, tanpa pengingat | Pengajuan jadwal berbasis **slot** + notifikasi konfirmasi, pengingat **H-1** dan **1 jam** via WhatsApp (Fonnte) & email (Gmail SMTP) |
| Pencatatan manual, sulit direkap | Tanggapan, catatan konseling, dashboard, laporan per kategori/periode (PDF) |
| Belum ada saluran siswa ↔ Guru BK | Percakapan tanggapan asinkron per pengaduan |

**Pengguna:** Siswa, Guru BK, Admin.
**Bukan cakupan:** aplikasi mobile native, chat real-time, panggilan suara/video, diagnosis psikologis (Batasan 1.4).

## 2. Target keberhasilan

- Semua skenario Black Box (Tabel 3.21 + tambahan di [SPRINTS.md](SPRINTS.md#pengujian)) berstatus **sesuai**.
- UAT ≥ 61% (kategori baik); target internal ≥ 81%.
- Pada pengaduan anonim, tidak ada nama, NIS, maupun kelas siswa yang tampil di halaman Guru BK, baik di UI, respons API, maupun isi notifikasi.
- Pengingat H-1 dan 1 jam terkirim sekali saja (tidak dobel) dan tercatat di log.
- Halaman utama dimuat < 3 detik (KNF-05).

## 3. Tech stack

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | **TanStack Start** (React + TypeScript, Vite) | Server functions, server routes, middleware |
| UI | **shadcn/ui** (semua komponen: `npx shadcn@latest add --all`) + Tailwind CSS v4 | Ikon: lucide-react |
| Form & validasi | react-hook-form + zod | Skema zod dipakai bersama di klien & server |
| Tabel data | TanStack Table (via komponen Data Table shadcn) | Sort, filter, paginasi |
| Grafik | Recharts (komponen Chart shadcn) | Dashboard |
| Database | **PostgreSQL** (di-hosting di Supabase; nanti dapat dipindah ke VPS) + **Drizzle ORM** (`pg`) | Migrasi via drizzle-kit. Supabase hanya dipakai sebagai database: login tetap sistem sendiri (NIS/NIP + bcrypt), bukan Supabase Auth. Semua tabel memakai Row Level Security tanpa policy agar Data API publik Supabase tertutup |
| Auth | Sesi buatan sendiri: password **bcrypt** (`bcryptjs`), cookie httpOnly, tabel `sesi` | Sesuai KNF-01; tanpa library auth pihak ketiga supaya mudah dijelaskan di skripsi |
| Enkripsi | Node `crypto`: **AES-256-GCM** + HMAC-SHA256 | Lihat §6 |
| WhatsApp | **Fonnte** API (`POST https://api.fonnte.com/send`) | Token disimpan terenkripsi di tabel `pengaturan` |
| Email | **Nodemailer** + Gmail SMTP (App Password) | |
| Penjadwal | `node-cron` di proses server Node.js | Timezone **Asia/Jakarta** |
| Laporan PDF | `@react-pdf/renderer` (server route) | |
| Import siswa | `xlsx` (SheetJS) / CSV | |
| Upload lampiran | **[REVISI]** Supabase Storage (bucket privat, diakses lewat server) + `sharp` untuk hapus metadata EXIF foto. Saat pengembangan tanpa Storage, disimpan di disk di luar folder public | Vercel tidak punya disk permanen |
| Package manager | pnpm | |

> **Catatan deployment:** karena memakai cron di dalam proses server, aplikasi harus berjalan sebagai **server Node.js yang hidup terus** (VPS, server sekolah, atau hosting Node). Tidak cocok di hosting serverless murni (mis. Vercel), karena di sana cron tidak berjalan. Lihat Pertanyaan Terbuka Q1.

## 4. Peran & hak akses

| Fitur | Siswa | Guru BK | Admin |
|---|:-:|:-:|:-:|
| Login / logout / ganti password | ✓ | ✓ | ✓ |
| Kelola profil (WA, email) | ✓ | ✓ | ✓ |
| Kirim pengaduan (anonim/beridentitas) | ✓ | – | – |
| Lihat & balas tanggapan pengaduan sendiri | ✓ | – | – |
| Lihat & tanggapi pengaduan | – | ✓ | – |
| Kelola slot jadwal | – | ✓ (milik sendiri) | – |
| Ajukan / batalkan jadwal konseling | ✓ | – | – |
| Setujui / tolak / tandai selesai jadwal | – | ✓ | – |
| Tulis catatan konseling | – | ✓ | – |
| Lihat riwayat konseling sendiri | ✓ | – | – |
| Dashboard & laporan statistik | – | ✓ | ✓ (agregat saja) |
| Data master (siswa, kelas, Guru BK, kategori) | – | – | ✓ |
| Pengaturan Fonnte & SMTP, log notifikasi | – | – | ✓ |

**[REVISI] Admin tidak dapat membaca isi pengaduan maupun catatan konseling.** Admin hanya melihat angka agregat. Ini sejalan dengan asas kerahasiaan (2.2.2), karena admin biasanya bukan konselor.

Akses yang tidak sesuai peran → halaman **403** (Black Box #11). Pembatasan dilakukan di middleware server, bukan hanya dengan menyembunyikan menu.

## 5. Kebutuhan fungsional

Kode KF mengikuti Tabel 3.2. Tambahan diberi tanda **[REVISI]**.

### 5.1 Autentikasi (KF-01) — Sprint 1
- Login memakai **username**: siswa = NIS, Guru BK = NIP, admin = username bebas. Field dibuat satu, berlabel "NIS / NIP / Username" (Tabel 3.20).
- Pesan error generik: "NIS/NIP atau password salah", tanpa menyebut mana yang salah.
- **[REVISI]** Rate limit: 5 percobaan gagal per 15 menit per username+IP.
- **[REVISI]** Akun hasil import wajib **ganti password saat login pertama** (`harus_ganti_password`).
- Sesi: cookie `httpOnly`, `SameSite=Lax`, `Secure` di production; berlaku 7 hari; logout menghapus sesi di DB.
- Akun nonaktif (`is_active = false`) tidak bisa login.

### 5.1a Verifikasi kontak & lupa password (KF-15, KF-16) — Sprint 1 [REVISI]
- **KF-15 Verifikasi kontak.** Email/nomor WA yang diisi **admin** (form atau import) dianggap terverifikasi. Bila pengguna mengubah kontaknya sendiri di Profil, status verifikasi direset dan pengguna memasukkan **kode OTP 6 digit** yang dikirim ke kontak baru.
- **KF-16 Lupa password.** Di halaman login → "Lupa password?": masukkan NIS/NIP → pilih kontak terverifikasi (ditampilkan tersamar, mis. `ri******@g****.com`, `0812-****-0101`) → masukkan kode OTP + password baru → langsung masuk. Akun tanpa kontak terverifikasi diarahkan ke admin.
- **Aturan OTP:** kode 6 digit acak, berlaku 10 menit, disimpan sebagai HMAC (bukan teks asli), maksimal 5 kali salah, jeda 60 detik antar permintaan, maksimal 5 kode/jam per keperluan, kode lama batal saat kode baru dibuat, kode terikat ke alamat tujuan (batal bila kontak berubah), pembatas per IP. Reset password mengeluarkan semua perangkat yang sedang login.
- **Kanal:** email via SMTP (Resend atau Gmail; Nodemailer) dan WhatsApp via Fonnte. Tanpa konfigurasi, mode pengembangan mencetak pesan ke log server.
- Akun **tidak** dapat didaftarkan sendiri; tetap dibuat admin (§5.2) agar hanya siswa SMK IPTEK yang memakai layanan anonim.

### 5.2 Data master (KF-13) — Sprint 1
- CRUD **kelas** (nama, jurusan, Guru BK pembina).
- CRUD **Guru BK** (nama, NIP, email, WA).
- CRUD **siswa** (nama, NIS, kelas, jenis kelamin, email, WA) + **[REVISI] import Excel/CSV**:
  - Template unduhan: `nis, nama, jenis_kelamin, kelas, email, no_whatsapp`.
  - Pratinjau sebelum simpan: baris valid/invalid ditandai, NIS duplikat ditolak.
  - Password awal = NIS (di-hash), `harus_ganti_password = true`.
- CRUD **kategori masalah**; seed awal: Pribadi, Sosial, Belajar, Karier (2.2.1). **[REVISI]** Kategori yang sudah dipakai tidak bisa dihapus, hanya dinonaktifkan.
- Reset password pengguna oleh admin.

### 5.3 Profil (KF-02) — Sprint 4 (PB-15), tapi field WA/email sudah ada sejak Sprint 1
- Ubah email, nomor WA (format dinormalisasi ke `62…`), password.
- **[REVISI]** Tombol "Kirim tes notifikasi" supaya siswa bisa memastikan nomornya benar.

### 5.4 Pengaduan (KF-03, KF-04) — Sprint 2
Form: mode (Anonim / Beridentitas), kategori, urgensi (rendah/sedang/tinggi), judul (≤150), isi (wajib, ≥20 karakter), lampiran opsional (JPG/PNG/PDF, ≤5 MB). **[REVISI]** PDF hanya untuk mode beridentitas, karena metadata PDF bisa memuat nama penulis.

Saat dikirim:
- Dibuat **kode tiket** unik, format `BK-XXXXXX` (6 karakter acak tanpa huruf yang mirip seperti O/0, I/1).
- **Beridentitas** → `siswa_id` diisi, diarahkan ke **Guru BK pembina kelas** siswa.
- **Anonim** → `siswa_id = NULL`; ID siswa disimpan terenkripsi di `pengirim_terenkripsi`; dibuat `pengirim_hash` (lihat §6); dibuat **alias** acak (mis. "Siswa Teal-42"); `guru_bk_id = NULL` lalu masuk ke **antrean bersama semua Guru BK** (keputusan diskusi).
- Status awal `baru`. Notifikasi `pengaduan_baru` dikirim ke Guru BK terkait (beridentitas) atau semua Guru BK (anonim).
- **[REVISI] Urgensi tinggi**: notifikasi WA segera ke semua Guru BK, dan siswa melihat panel info bantuan darurat (lihat Q4).
- Halaman sukses menampilkan kode tiket + penjelasan singkat apa yang dilihat Guru BK.

### 5.5 Tanggapan (KF-05, KF-06) — Sprint 2
- Guru BK: daftar pengaduan (filter status/kategori/urgensi/mode, tab "Antrean anonim" & "Milik saya"), detail, kirim tanggapan, ubah status (`baru → diproses → selesai`).
- **[REVISI] Klaim aduan anonim:** Guru BK menekan "Tangani" pada aduan di antrean, lalu `guru_bk_id` terisi dan aduan pindah ke "Milik saya". Tanggapan pertama otomatis mengklaim. Guru BK lain hanya bisa membaca.
- Siswa: riwayat pengaduan (termasuk yang anonim, ditemukan lewat `pengirim_hash`), cari dengan kode tiket (**wajib login**, keputusan diskusi), lihat percakapan, balas.
- Setiap tanggapan baru memicu notifikasi `tanggapan` ke pihak lawan.
- **[REVISI]** Penanda "belum dibaca" di daftar, memakai `dibaca_siswa_pada` dan `dibaca_guru_pada` di tabel `pengaduan`: aduan ditandai belum dibaca bila pesan terakhir dari lawan bicara lebih baru dari waktu terakhir dibuka.
- Aduan berstatus `selesai` tidak bisa dibalas lagi; siswa bisa membuat aduan baru.

### 5.6 Buka identitas (KNF-02) — Sprint 3 [REVISI]
Untuk aduan anonim, siswa dapat memilih **"Buka identitas & ajukan konseling tatap muka"**:
1. Layar konfirmasi: "Nama, NIS, dan kelasmu akan terlihat oleh Guru BK untuk aduan BK-XXXX. Ini tidak bisa dibatalkan."
2. Setelah setuju: `siswa_id` diisi, `identitas_dibuka_pada` dicatat, tampilan Guru BK berubah dari alias ke nama asli, lalu siswa diarahkan ke form pengajuan jadwal dengan `pengaduan_id` terisi.
3. Statistik tetap menghitung aduan ini sebagai "anonim" (`is_anonim` tidak diubah).

Pengajuan jadwal **tanpa** menautkan aduan tetap bisa dilakukan kapan saja.

### 5.7 Slot & jadwal konseling (KF-07, KF-08, KF-09) — Sprint 3
- Guru BK: kelola slot (tanggal, jam mulai/selesai, lokasi). **[REVISI]** Bisa membuat slot berulang (mis. tiap Senin & Rabu 10.00–11.00 selama 4 minggu). Slot tidak boleh tumpang tindih untuk Guru BK yang sama. Slot yang sudah dipesan tidak bisa dihapus, hanya ditutup.
- Siswa: pilih Guru BK → tanggal (kalender, hari bertanda slot tersedia) → slot → topik (+ opsional tautkan aduan beridentitas/yang sudah dibuka) → kirim. Status `menunggu`, slot `dipesan`.
  - **[REVISI]** Pemesanan memakai transaksi + row lock agar dua siswa tidak bisa memesan slot yang sama.
  - **[REVISI]** Maksimal 2 pengajuan aktif (menunggu/disetujui) per siswa.
  - Slot < 2 jam dari sekarang tidak bisa dipesan.
- Guru BK: setujui / tolak (alasan **wajib**) → notifikasi `konfirmasi` / `penolakan`. Ditolak atau batal → slot kembali `tersedia`.
- **[REVISI]** Siswa dapat **membatalkan** jadwal (status `batal`) sampai 2 jam sebelum sesi; Guru BK diberi notifikasi.
- **[REVISI]** Setelah sesi, Guru BK menandai `selesai` atau `tidak_hadir`.

### 5.8 Notifikasi (KF-10, KF-14) — Sprint 3
Jenis notifikasi:

| Jenis | Pemicu | Penerima | Kanal |
|---|---|---|---|
| `pengaduan_baru` | Aduan dikirim | Guru BK terkait / semua | WA + email |
| `tanggapan` | Tanggapan baru | Lawan bicara | WA + email |
| `pengajuan_jadwal` | Siswa mengajukan | Guru BK | WA + email |
| `konfirmasi` / `penolakan` | Guru BK memutuskan | Siswa | WA + email |
| `pembatalan` | Siswa membatalkan | Guru BK | WA + email |
| `pengingat_h1` | 24 jam sebelum sesi | Siswa & Guru BK | WA + email |
| `pengingat_1jam` | 1 jam sebelum sesi | Siswa & Guru BK | WA + email |
| `tes` | Tombol tes | Diri sendiri | Pilihan |

Mekanisme **[REVISI]**, memakai pola *outbox*:
1. Peristiwa → baris baru di tabel `notifikasi` dengan status `menunggu` (dalam transaksi yang sama dengan aksi utama, jadi notifikasi tidak hilang meski API Fonnte sedang mati).
2. Cron tiap **1 menit**: (a) buat baris pengingat untuk jadwal `disetujui` yang masuk jendela H-1 / 1 jam; (b) kirim semua baris `menunggu` yang `dijadwalkan_pada ≤ sekarang`.
3. Gagal → `percobaan + 1`, dicoba ulang dengan jeda 1, 5, lalu 15 menit; setelah 3 kali gagal berstatus `gagal`. Admin dapat "Kirim ulang" manual (KNF-04).
4. **Unique key** `(user_id, kanal, jenis, ref_tipe, ref_id)` untuk pengingat, sehingga cron yang berjalan dua kali tidak membuat pesan dobel.
5. Pengguna tanpa nomor WA / email → kanal itu dilewati (dicatat `dilewati`).
6. Jadwal yang disetujui < 1 jam sebelum sesi hanya mendapat konfirmasi, tanpa pengingat yang sudah lewat waktunya.

**Pesan untuk siswa pada aduan anonim tidak menyebut isi aduan**, hanya contohnya: "Ada tanggapan baru dari Guru BK untuk tiket BK-7F3K9Q. Buka SIBK untuk membaca." Pesan ini muncul di HP siswa, dan HP bisa dilihat orang lain.

Pengaturan (admin):
- Fonnte: token, nomor pengirim (info), toggle aktif.
- SMTP: host, port, user, password (App Password), nama & alamat pengirim, toggle aktif.
- Tombol "Uji koneksi" untuk masing-masing.
- Secret disimpan **terenkripsi** (AES-256-GCM) di tabel `pengaturan` dan tidak pernah dikirim balik ke browser (ditampilkan `••••`).
- Halaman **Log notifikasi**: filter kanal/jenis/status, kirim ulang. **[REVISI]** Untuk notifikasi terkait aduan anonim, admin hanya melihat jenis & status, sedangkan penerima disamarkan. Tanpa ini, admin bisa mencocokkan waktu tanggapan dengan nama penerima lalu mengetahui pengirim aduan anonim.

### 5.9 Catatan & riwayat konseling (KF-11) — Sprint 4
- Guru BK mengisi catatan pada jadwal `selesai`: ringkasan masalah, tindak lanjut, **[REVISI]** opsional "perlu sesi lanjutan" (shortcut ke pembuatan slot).
- Catatan hanya bisa dilihat Guru BK. **[REVISI]** Siswa melihat riwayat jadwal & status, plus *tindak lanjut* bila Guru BK mencentang "tampilkan ke siswa". Ringkasan masalah tetap internal.

### 5.10 Dashboard & laporan (KF-12) — Sprint 4
- **Dashboard Guru BK:** kartu (aduan baru, diproses, jadwal hari ini, menunggu persetujuan), grafik aduan per kategori, tren per bulan, daftar aduan terbaru, agenda hari ini.
- **Dashboard Siswa:** aduan aktif + status, jadwal mendatang, tombol cepat "Kirim pengaduan" & "Ajukan jadwal".
- **Dashboard Admin:** jumlah pengguna, statistik agregat, kesehatan notifikasi (terkirim/gagal 7 hari terakhir).
- **Laporan:** filter periode (tanggal awal–akhir) + kategori + (Guru BK). Isi: jumlah aduan per kategori, per urgensi, per status, proporsi anonim vs beridentitas, jumlah sesi konseling per status, rata-rata waktu tanggapan pertama. Ekspor **PDF** (kop sekolah) — **[REVISI]** opsional juga Excel.

## 6. Desain kerahasiaan (inti penelitian)

Ancaman dan mitigasinya:

| Kebocoran | Mitigasi |
|---|---|
| UI/API Guru BK menampilkan identitas | Query untuk Guru BK **tidak pernah** melakukan join ke `siswa` bila `is_anonim = true AND identitas_dibuka_pada IS NULL`. Dibuat satu fungsi DTO `toGuruView()` yang menjadi satu-satunya jalur data aduan ke Guru BK, dan diuji otomatis. |
| Kelas tersirat lewat rute Guru BK pembina | Aduan anonim masuk ke antrean bersama (§5.4) |
| Riwayat siswa butuh mencari aduan anonimnya | `pengirim_hash = HMAC-SHA256(KUNCI_HMAC, siswa_id)`, deterministik dan bisa dicari, tapi tidak bisa dibalik tanpa kunci. `pengirim_terenkripsi` (AES-GCM, IV acak) dipakai untuk mengambil kontak saat mengirim notifikasi. |
| Metadata foto lampiran (EXIF: nama perangkat, lokasi GPS) | Foto diproses ulang dengan `sharp` (metadata dibuang), nama file diganti acak, file disajikan lewat route yang memeriksa hak akses |
| Admin mencocokkan log notifikasi | Penerima disamarkan di log untuk aduan anonim (§5.8) |
| Tanggapan siswa menyimpan `user_id` | Pada aduan anonim, `tanggapan.user_id = NULL` untuk pesan dari siswa |
| Isi aduan menyebut nama sendiri | UI memberi peringatan lembut di form mode anonim: "Hindari menulis nama, kelas, atau detail yang bisa mengenalimu" |

**Batasan yang perlu ditulis jujur di skripsi (sesuai 1.4 poin 3):** anonimitas berlaku terhadap tampilan Guru BK di sistem. Pihak yang memegang akses database **dan** kunci enkripsi di server (developer/admin server) secara teknis masih bisa membuka identitas. Kunci disimpan di environment variable (`APP_ENC_KEY`, `APP_HMAC_KEY`), bukan di database.

## 7. Kebutuhan non-fungsional

| Kode | Kebutuhan | Implementasi |
|---|---|---|
| KNF-01 | Keamanan | bcrypt (cost 10), RBAC di middleware server, HTTPS di production, rate limit login, validasi zod di server untuk semua input |
| KNF-02 | Kerahasiaan | §6 |
| KNF-03 | Kemudahan & responsif | Mobile-first (siswa kemungkinan besar akses dari HP), min. lebar 360 px, target sentuh ≥ 44 px |
| KNF-04 | Keandalan | Outbox + retry + log (§5.8) |
| KNF-05 | Kinerja | SSR, paginasi server-side, indeks DB pada kolom filter |
| KNF-06 | Kompatibilitas | Chrome, Firefox, Edge versi terbaru |
| [REVISI] KNF-07 | Waktu | Semua waktu disimpan UTC, ditampilkan & dijadwalkan dalam **Asia/Jakarta (WIB)** |
| [REVISI] KNF-08 | Aksesibilitas | Kontras teks ≥ 4.5:1, navigasi keyboard, label form, status tidak hanya dibedakan dengan warna |

## 8. Skema basis data (revisi ERD)

13 tabel = 11 tabel proposal + `sesi` + `pengaturan`. Kolom bertanda ➕ adalah tambahan, ✏️ adalah perubahan.

**users**: id, ➕`username` (unik; NIS/NIP/username), nama, ✏️`email` (unik, *nullable*: tidak semua siswa punya email), no_whatsapp, password (bcrypt), role (`admin|guru_bk|siswa`), ➕`is_active`, ➕`harus_ganti_password`, created_at, ➕`updated_at`

**siswa**: id, user_id, kelas_id, nis (unik), jenis_kelamin (`L|P`)

**guru_bk**: id, user_id, nip (unik)

**kelas**: id, guru_bk_id (pembina, *nullable*), nama_kelas, jurusan

**kategori_masalah**: id, nama_kategori, deskripsi, ➕`is_active`

**pengaduan**: id, kode_tiket (unik), siswa_id (*null* jika anonim & belum dibuka), pengirim_terenkripsi, ➕`pengirim_hash` (CHAR(64), indeks), is_anonim, alias, kategori_id, ✏️`guru_bk_id` (*nullable*: null = di antrean anonim), judul, isi, lampiran, tingkat_urgensi, status (`baru|diproses|selesai`), ➕`identitas_dibuka_pada`, ➕`dibaca_siswa_pada`, ➕`dibaca_guru_pada`, created_at, ➕`updated_at`

**tanggapan**: id, pengaduan_id, pengirim (`siswa|guru_bk`), ➕`user_id` (*nullable*: penulis Guru BK; null untuk siswa anonim), isi, created_at

**slot_jadwal**: id, guru_bk_id, tanggal, jam_mulai, jam_selesai, lokasi, ✏️status (`tersedia|dipesan|ditutup`) · ➕ unik `(guru_bk_id, tanggal, jam_mulai)`

**jadwal_konseling**: id, siswa_id, slot_id, pengaduan_id (*null*), topik, ✏️status (`menunggu|disetujui|ditolak|selesai|batal|tidak_hadir`), alasan_penolakan, ➕`diputuskan_pada`, created_at, ➕`updated_at`

**catatan_konseling**: id, jadwal_id (unik), ➕`guru_bk_id`, ringkasan_masalah, tindak_lanjut, ➕`tampilkan_ke_siswa`, created_at, ➕`updated_at`

**notifikasi** (✏️ dari `notifikasi_log`): id, user_id, kanal (`whatsapp|email`), jenis, ➕`ref_tipe` (`pengaduan|jadwal|tes`), ➕`ref_id`, ➕`is_sensitif` (terkait aduan anonim), pesan, ✏️status (`menunggu|terkirim|gagal|dilewati`), ➕`percobaan`, ➕`error_terakhir`, ➕`dijadwalkan_pada`, dikirim_pada, created_at · ➕ unik `(user_id, kanal, jenis, ref_tipe, ref_id)`

➕ **kode_otp**: id, user_id, keperluan (`verifikasi_email|verifikasi_wa|reset_password`), kanal (`email|whatsapp`), tujuan, kode_hash (HMAC), percobaan, kedaluwarsa_pada, dipakai_pada, created_at

➕ **users** (tambahan Sprint 1): `email_terverifikasi_pada`, `wa_terverifikasi_pada`

➕ **sesi**: id, user_id, token_hash (SHA-256 dari token cookie), expires_at, ip, user_agent, created_at

➕ **pengaturan**: `kunci` (PK, mis. `fonnte.token`, `smtp.host`), `nilai` (teks; terenkripsi untuk secret), `is_rahasia`, updated_at

Relasi utama: users 1–1 siswa/guru_bk · kelas 1–N siswa · guru_bk 1–N kelas, slot_jadwal, pengaduan · pengaduan 1–N tanggapan · slot_jadwal 1–N jadwal_konseling (hanya satu yang aktif) · jadwal_konseling 1–1 catatan_konseling · users 1–N notifikasi, sesi.

## 9. Peta halaman (route)

| Route | Halaman | Peran |
|---|---|---|
| `/` | Landing singkat + tombol masuk | Publik |
| `/login` | Login | Publik |
| `/ganti-password` | Wajib ganti password | Semua |
| `/lupa-password` | Lupa password (OTP email/WA) | Publik |
| `/siswa` | Dashboard siswa | Siswa |
| `/siswa/pengaduan/baru` | Form pengaduan | Siswa |
| `/siswa/pengaduan` · `/siswa/pengaduan/$kode` | Riwayat & percakapan | Siswa |
| `/siswa/jadwal` · `/siswa/jadwal/ajukan` | Jadwal saya & pengajuan | Siswa |
| `/guru` | Dashboard Guru BK | Guru BK |
| `/guru/pengaduan` · `/guru/pengaduan/$kode` | Pengaduan masuk & detail | Guru BK |
| `/guru/slot` | Kalender slot | Guru BK |
| `/guru/jadwal` · `/guru/jadwal/$id` | Pengajuan & sesi (+ catatan) | Guru BK |
| `/guru/laporan` | Laporan | Guru BK |
| `/admin` | Dashboard admin | Admin |
| `/admin/siswa` · `/admin/siswa/import` | Data siswa & import | Admin |
| `/admin/kelas` · `/admin/guru` · `/admin/kategori` | Data master | Admin |
| `/admin/pengaturan` | Fonnte & SMTP | Admin |
| `/admin/notifikasi` | Log notifikasi | Admin |
| `/admin/laporan` | Laporan agregat | Admin |
| `/profil` | Profil & ganti password | Semua |
| `/api/lampiran/$id` · `/api/laporan.pdf` | Server routes | Sesuai hak |

## 10. Pertanyaan terbuka

Default yang saya pakai bila belum dijawab ditulis di kolom kanan.

| # | Pertanyaan | Default |
|---|---|---|
| Q1 | Aplikasi akan di-deploy di mana untuk Sprint Review/UAT? (VPS, server sekolah, atau cukup laptop + tunnel seperti ngrok/Cloudflare Tunnel?) | Database di Supabase (dev & demo), aplikasi dijalankan dari laptop + Cloudflare Tunnel saat Sprint Review; produksi di VPS Node (Postgres dipindah dengan `pg_dump`) |
| Q2 | Berapa jumlah Guru BK dan perkiraan jumlah siswa? (Kalau Guru BK cuma 1–2 orang, antrean anonim bersama tetap aman; kalau 1 orang, fitur klaim bisa disederhanakan.) | 2–4 Guru BK, ±600 siswa |
| Q3 | Apakah perlu peran **Wakil Kepala Sekolah / Kepala Sekolah** yang hanya melihat laporan? Di proposal, Wakasek adalah Product Owner tapi bukan pengguna sistem. | Tidak, tetap 3 peran (laporan bisa dicetak Guru BK/admin) |
| Q4 | Panel bantuan darurat pada urgensi tinggi: nomor apa yang ditampilkan? (Usulan: nomor Guru BK piket + layanan nasional seperti SEJIWA 119 ext. 8; perlu dicek ulang ke sumber resmi.) | Tampilkan nomor Guru BK + SEJIWA, teks dikonfirmasi Guru BK saat Sprint Review |
| Q5 | Logo & nama resmi sekolah untuk kop laporan PDF? | Placeholder, diganti saat ada file logo |
| Q6 | Perlu fitur Guru BK **memanggil/mengundang** siswa ke sesi (inisiatif dari Guru BK)? Proposal hanya mengatur alur dari siswa. | Tidak di versi ini; dicatat sebagai pengembangan lanjutan |
| Q7 | Data tahun ajaran / kenaikan kelas perlu dikelola? | Tidak; admin cukup mengubah kelas siswa atau import ulang |
