# Pengingat Otomatis (cron-job.org)

SIBK punya satu endpoint, `/api/cron`, yang perlu dipanggil **setiap menit**. Setiap kali dipanggil, endpoint ini:

1. membuat pengingat **H-1** (24 jam) dan **1 jam** sebelum sesi konseling yang disetujui;
2. mengirim notifikasi WhatsApp/email yang masih menunggu, termasuk percobaan ulang pesan yang gagal (maksimal 3 kali).

Vercel versi gratis hanya bisa menjalankan cron sekali sehari, jadi pemanggilnya memakai **cron-job.org** (gratis).

## 1. Siapkan kunci rahasia

Buat kunci acak (minimal 24 karakter):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Isi kunci itu sebagai environment variable `CRON_SECRET`:

- **Vercel:** Project → Settings → Environment Variables → `CRON_SECRET` → Redeploy.
- **Laptop (pengembangan):** baris `CRON_SECRET=...` di file `.env`.

Tanpa `CRON_SECRET`, endpoint menjawab 503 dan pengingat tidak berjalan.

## 2. Buat jadwal di cron-job.org

1. Daftar / masuk di https://cron-job.org, lalu **Create cronjob**.
2. **URL:** `https://<alamat-vercel-sibk>/api/cron` (alamat lengkapnya juga tampil di halaman admin → Pengaturan Notifikasi).
3. **Execution schedule:** Every minute.
4. Buka tab **Advanced**:
   - **Request method:** GET
   - **Headers:** tambah `Authorization` dengan nilai `Bearer <CRON_SECRET>` (kata `Bearer`, spasi, lalu kuncinya).
   - **Timeout:** 30 detik.
5. Aktifkan **Notify me when the cronjob fails** supaya kamu tahu kalau endpoint bermasalah.
6. Simpan, lalu tekan **Test run**. Jawaban yang benar berbentuk:

   ```json
   { "ok": true, "pengingatDibuat": 0, "terkirim": 0, "gagal": 0, "diulang": 0, "dilewati": 0, "ms": 650 }
   ```

   - `401 Tidak diizinkan` → header `Authorization` salah atau kuncinya beda dengan `CRON_SECRET` di Vercel.
   - `503 CRON_SECRET belum diisi` → environment variable belum diisi / belum redeploy.

## 3. Periksa dari aplikasi

Masuk sebagai admin → **Pengaturan Notifikasi** → kartu **Pengingat otomatis**. Bila cron berjalan, tertulis "Terakhir berjalan kurang dari semenit lalu". Bila lebih dari 5 menit, periksa jadwal di cron-job.org.

## Catatan keamanan

- Endpoint menolak permintaan tanpa kunci yang benar (dibandingkan dengan `timingSafeEqual`).
- Memanggil endpoint berkali-kali aman: setiap pengingat punya kunci unik di tabel `notifikasi`, jadi tidak pernah terkirim dua kali (BB-21).
- Ganti `CRON_SECRET` bila pernah terlihat orang lain, lalu perbarui header di cron-job.org.
