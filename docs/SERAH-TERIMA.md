# Serah Terima ke Sekolah

Langkah membersihkan data uji sebelum SIBK dipakai SMK IPTEK Tangerang Selatan.

## 1. Kosongkan aktivitas uji

Jalankan dari folder proyek, dengan `.env` yang mengarah ke database yang akan diserahkan.

Cek dulu apa yang akan dihapus (tidak menghapus apa pun):

```bash
pnpm db:reset-aktivitas
```

Kalau daftarnya sudah benar, hapus:

```bash
pnpm db:reset-aktivitas --yakin
```

| Dihapus | Tetap |
|---|---|
| Pengaduan dan semua percakapannya | Akun admin, Guru BK, siswa |
| File lampiran (Supabase Storage dan folder lokal) | Kelas dan Guru BK pembinanya |
| Kode OTP | Kategori masalah |
| Sesi login (semua orang otomatis keluar) | Token Fonnte |
| Slot jadwal, jadwal konseling, catatan konseling, log notifikasi, notifikasi lonceng | |
| Status cron terakhir (terisi lagi dalam 1 menit) | |

Kalau akun siswa uji tetap dipakai (tidak dihapus), tambahkan `--akun-siswa`:

```bash
pnpm db:reset-aktivitas --yakin --akun-siswa
```

Siswa yang sudah pernah login akan kembali ke kondisi awal: password kembali sama dengan NIS dan wajib diganti saat login, sementara nomor WA, email, dan status verifikasinya dikosongkan. Akun admin dan Guru BK tidak disentuh.

Nomor kode tiket tetap acak. Nomor urut internal (id) dimulai lagi dari 1.
Perintah ini tidak bisa dibatalkan. Kalau perlu cadangan, buat backup dulu di dashboard Supabase (Database → Backups).

## 2. Rapikan akun

Akun uji dari `pnpm db:seed` ikut tersimpan karena termasuk akun. Sebelum diserahkan:

- [ ] Ganti password `admin` lewat menu Profil, lalu isi email sekolah yang aktif.
- [ ] Ganti data Guru BK uji dengan Guru BK sebenarnya (atau ganti nama, NIP, email, dan password-nya).
- [ ] Hapus atau nonaktifkan siswa uji 232410001 sampai 232410010 di Data master → Siswa.
- [ ] Import siswa asli dari Excel. Password awal mereka sama dengan NIS dan wajib diganti saat login pertama.
- [ ] Sesuaikan daftar kelas dan Guru BK pembinanya.

## 3. Aktifkan notifikasi

- [ ] Isi `CRON_SECRET` di Vercel dan buat jadwal tiap menit di cron-job.org (langkah lengkap: [CRON.md](CRON.md)).
- [ ] Admin → Pengaturan Notifikasi: tempel token Fonnte milik nomor WhatsApp sekolah, lalu tekan **Uji koneksi**.
- [ ] Kirim pesan uji ke email dan WhatsApp milik admin, pastikan keduanya sampai.
- [ ] Pastikan kartu **Pengingat otomatis** menunjukkan "Terakhir berjalan kurang dari semenit lalu".

## 4. Periksa sekali lagi

- [ ] Login sebagai admin dan Guru BK berhasil dengan password baru.
- [ ] Menu Pengaduan Masuk kosong.
- [ ] Satu siswa asli bisa login, diminta ganti password, lalu bisa mengirim pengaduan.
