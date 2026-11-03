# Panduan Deploy & UAT

Cara memasang SIBK dari nol: database Supabase, aplikasi di Vercel, email, WhatsApp, cron, lalu data demo untuk UAT.

## 1. Kebutuhan

- Node.js 22 atau lebih baru dan pnpm.
- Akun **Supabase** (database + penyimpanan lampiran), **Vercel** (hosting), **Resend** (email), **cron-job.org** (pengingat), dan opsional **Fonnte** (WhatsApp).
- Domain untuk pengirim email (diverifikasi di Resend).

## 2. Database & penyimpanan (Supabase)

1. Buat project. Pilih region **Singapore (ap-southeast-1)**: paling dekat dengan Indonesia dan jauh lebih cepat dibanding Eropa (setiap query sekitar 20–40 ms, bukan ±200 ms).
2. **Connect** → salin dua connection string:
   - *Session pooler* (port **5432**) untuk menjalankan migrasi dari laptop.
   - *Transaction pooler* (port **6543**) untuk Vercel.
3. **Storage** → buat bucket **`lampiran`**, **Private** (jangan public).
4. **Settings → API Keys**: salin URL project dan **secret key** (`sb_secret_…`) untuk `SUPABASE_URL` dan `SUPABASE_SECRET_KEY`.
5. Dari laptop (dengan `.env` berisi `DATABASE_URL` session pooler):

```bash
pnpm install
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

Migrasi membuat semua tabel (RLS aktif tanpa policy, jadi tabel tidak bisa dibaca lewat API publik Supabase). Seed membuat akun admin, 2 Guru BK, 3 kelas, 10 siswa, dan 4 kategori; daftar akunnya ada di komentar atas `src/server/db/seed.ts`.

## 3. Environment variables

| Variabel | Wajib | Isi |
|---|---|---|
| `DATABASE_URL` | ✅ | Laptop: session pooler (5432). **Vercel: transaction pooler (6543)** |
| `APP_URL` | ✅ | Alamat aplikasi, mis. `https://sibk.sekolah.sch.id` (dipakai di tautan email) |
| `APP_ENC_KEY` | ✅ | 32 byte base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `APP_HMAC_KEY` | ✅ | 32 byte base64 (cara sama, nilai berbeda) |
| `SESSION_SECRET` | ✅ | 32 byte base64 (cara sama, nilai berbeda) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | ✅ di Vercel | Penyimpanan lampiran. Tanpa ini lampiran disimpan di disk lokal (hanya untuk laptop) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | ✅ | Resend: `smtp.resend.com`, `465`, `resend`, API key `re_…` |
| `MAIL_FROM` | ✅ | Mis. `SIBK SMK IPTEK <noreply@domain-terverifikasi>` |
| `MAIL_REPLY_TO` | – | Alamat balasan (opsional) |
| `CRON_SECRET` | ✅ | Minimal 24 karakter, untuk `/api/cron` ([CRON.md](CRON.md)) |
| `FONNTE_TOKEN` | – | Lebih disarankan diisi lewat halaman admin → Pengaturan Notifikasi |
| `DB_POOL_MAX` | – | Ukuran pool koneksi (bawaan 2 di Vercel, 10 di laptop) |
| `NOTIF_KIRIM_NYATA` | – | Hanya untuk laptop: `true` agar notifikasi otomatis benar-benar dikirim saat pengembangan |

> ⚠️ **`APP_ENC_KEY` dan `APP_HMAC_KEY` tidak boleh diganti setelah aplikasi dipakai.** Keduanya dipakai untuk mengenali pemilik aduan anonim; bila diganti, riwayat aduan anonim tidak bisa lagi dicocokkan dengan siswanya. Simpan salinannya di tempat aman.

## 4. Aplikasi (Vercel)

1. **Add New → Project** → impor repository GitHub.
2. Framework preset boleh dibiarkan (build memakai preset Nitro `vercel` otomatis saat `VERCEL=1`).
3. Isi semua environment variable di atas (Production).
4. **Settings → Functions → Region**: samakan dengan region Supabase (Singapore → `sin1`).
5. Deploy. Setiap push ke `main` otomatis membuat deploy baru.
6. (Opsional) **Settings → Domains**: pasang domain sekolah.

## 5. Email (Resend)

1. Tambahkan domain/subdomain pengirim di Resend, lalu pasang record DNS (SPF, DKIM, MX) yang diminta di pengelola DNS.
2. Tunggu status **Verified**, buat API key, isi `SMTP_PASS` dan `MAIL_FROM` dengan domain itu.

## 6. Pengingat otomatis & WhatsApp

- Pengingat H-1 / 1 jam dan pengiriman ulang: ikuti [CRON.md](CRON.md) (cron-job.org tiap menit).
- WhatsApp: daftar di fonnte.com dengan **nomor khusus sekolah**, tautkan perangkat, lalu tempel token di admin → **Pengaturan Notifikasi** → **Uji koneksi**.

## 7. Periksa setelah deploy

- [ ] Halaman `/` dan `/login` terbuka; login admin berhasil.
- [ ] Admin → Pengaturan Notifikasi: email **Aktif**, cron "Terakhir berjalan kurang dari semenit lalu".
- [ ] Kirim pesan uji email (dan WA bila token sudah diisi) ke alamat sendiri.
- [ ] Siswa uji mengirim pengaduan dengan foto → Guru BK bisa membuka lampirannya.
- [ ] Guru BK → Laporan → **Unduh PDF** berhasil.
- [ ] Aplikasi bisa dipasang dari HP (tombol "Pasang aplikasi").

## 8. Data demo untuk UAT

Supaya responden UAT langsung melihat aplikasi yang "hidup" (ada aduan, percakapan, jadwal, catatan, grafik):

```bash
pnpm db:seed-demo
```

Isinya: 10 pengaduan (anonim & beridentitas, tersebar 3 bulan), 12 pesan percakapan, slot Senin–Jumat minggu depan untuk kedua Guru BK, 6 jadwal (menunggu, disetujui, ditolak, selesai, tidak hadir), dan 2 catatan konseling. Data dimasukkan langsung ke database, jadi **tidak ada notifikasi yang terkirim**. Perintah ini menolak berjalan bila sudah ada pengaduan (pakai `--paksa` untuk tetap mengisi).

Saran alur UAT:
1. Responden siswa memakai akun 232410002–232410010 (password awal = NIS, diminta ganti saat login pertama).
2. Responden Guru BK memakai akun Dewi / Ahmad.
3. Setiap responden mencoba skenario utama (kirim aduan, membalas, mengajukan dan menyetujui jadwal, mengisi catatan, mengunduh laporan), lalu mengisi kuesioner UAT.

Setelah UAT selesai, kosongkan semua aktivitas sebelum dipakai sungguhan:

```bash
pnpm db:reset-aktivitas --yakin
```

Lanjutkan dengan langkah rapikan akun di [SERAH-TERIMA.md](SERAH-TERIMA.md).
