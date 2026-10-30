# Hasil Uji — Sprint 1 (Autentikasi, Peran, Data Master)

> Tanggal uji: 30 Oktober 2026 · Lingkungan: laptop pengembang, Chrome (panel browser), MariaDB 10.4 (XAMPP) — **diuji ulang di PostgreSQL/Supabase setelah migrasi, lihat bagian akhir** · Penguji: pengembang
>
> Teknik: Black Box (Equivalence Partitioning). Skenario mengacu ke [SPRINTS.md](../SPRINTS.md#pengujian).

## Black Box Testing

| ID | Skenario | Masukan | Hasil yang diharapkan | Hasil pengujian | Status |
|---|---|---|---|---|---|
| BB-01 | Login data benar | `admin` + password benar; Guru BK + password benar | Masuk ke dashboard sesuai peran | Admin → `/admin`, Guru BK → `/guru`, siswa → `/siswa` | Sesuai |
| BB-02 | Login data salah | `admin` + password salah | Pesan kesalahan, akses ditolak | "NIS/NIP/username atau password salah.", field password dikosongkan | Sesuai |
| BB-11 | Hak akses peran | Admin membuka `/siswa`; siswa membuka `/admin/siswa`; siswa memanggil server function admin langsung | Akses ditolak (403) | Halaman "Akses ditolak" dengan status HTTP 403; `daftarGuruFn` & `resetPasswordFn` ditolak server ("Akses ditolak.") | Sesuai |
| BB-12 | Login 6× gagal | Password salah berulang untuk satu NIS | Dikunci sementara 15 menit | Percobaan ke-3/4 menampilkan sisa percobaan, ke-5 "Login dikunci sementara selama 15 menit", ke-6 dan password benar tetap ditolak | Sesuai |
| BB-13 | Login pertama akun import | NIS + password = NIS | Diarahkan ke halaman ganti password | Diarahkan ke `/ganti-password`; `/siswa` tidak bisa dibuka sebelum ganti; setelah ganti masuk ke beranda | Sesuai |
| BB-14 | Import siswa | CSV 8 baris: 3 valid, NIS terdaftar, NIS ganda di file, kelas tak dikenal, jenis kelamin salah, baris kosong | Baris invalid ditandai, hanya baris valid tersimpan | Pratinjau: 3 siap, 4 bermasalah dengan alasan tepat, baris kosong dilewati; 3 siswa tersimpan dengan WA ternormalisasi & password bcrypt | Sesuai |

## Uji tambahan (validasi & aturan data)

| Skenario | Hasil |
|---|---|
| Akun dinonaktifkan mencoba login | Ditolak: "Akun ini dinonaktifkan. Hubungi admin sekolah." |
| Username tidak terdaftar | Pesan sama dengan password salah (tidak membocorkan NIS mana yang terdaftar) |
| Ganti password: < 8 karakter / konfirmasi berbeda | Pesan validasi di bawah field |
| Tambah kelas dengan nama yang sudah ada (beda huruf besar/kecil) | "Kelas X UJI 1 sudah ada." |
| Tambah Guru BK dengan NIP terdaftar | "NIP/NIS ini sudah dipakai akun lain." |
| Tambah siswa dengan email milik akun lain | "Email ini sudah dipakai akun lain." |
| Tambah siswa dengan NIS berisi huruf | "NIS berupa 4–20 digit angka" |
| Hapus kelas yang masih berisi siswa | "Kelas masih berisi siswa. Pindahkan siswanya dulu." |
| Admin menonaktifkan akunnya sendiri | "Tidak bisa menonaktifkan akunmu sendiri." |
| Tampilan admin di layar HP 375 px | Tidak ada scroll horizontal; kolom sekunder disembunyikan |
| Bundle JavaScript browser | Tidak memuat kode database, bcrypt, maupun kunci rahasia |

## Uji otomatis

- Unit test (Vitest): **26 lulus** — format tanggal WIB, normalisasi WhatsApp, validasi siswa & password, parser CSV, pemetaan kolom import.
- Build production: berhasil.

Data uji (3 siswa import, kelas "X UJI 1") dihapus setelah pengujian; database kembali ke data seed.

## Uji ulang setelah migrasi ke PostgreSQL (Supabase)

> 30 Oktober 2026 · PostgreSQL 17.11 di Supabase (region eu-west-1, latensi ±205 ms per query dari laptop) · Session pooler

| ID | Hasil | Status |
|---|---|---|
| BB-01 | Admin → `/admin/kelas` (tujuan semula setelah login), Guru BK → `/guru` | Sesuai |
| BB-02 | Password salah ditolak dengan pesan generik | Sesuai |
| BB-11 | Siswa membuka `/admin/siswa` → HTTP 403; `daftarGuruFn` & `resetPasswordFn` ditolak server | Sesuai |
| BB-12 | Percobaan ke-5 dikunci 15 menit, ke-6 dan password benar tetap ditolak | Sesuai |
| BB-13 | Siswa hasil import (password = NIS) diarahkan ke ganti password; `/siswa` terkunci sampai diganti; setelah ganti langsung ke beranda | Sesuai |
| BB-14 | Import 32 baris: 30 valid tersimpan, 2 bermasalah ditandai (NIS terdaftar, kelas tak dikenal) | Sesuai |

Uji tambahan: kelas/kategori duplikat (beda huruf besar/kecil) ditolak, NIP terdaftar ditolak, NIS berisi huruf ditolak, kelas berisi siswa tidak bisa dihapus, admin tidak bisa menonaktifkan diri sendiri, pencarian siswa tidak membedakan huruf besar/kecil — **semua sesuai**.

Keamanan Supabase: Row Level Security aktif di 6 tabel; permintaan `GET /rest/v1/users` dengan publishable key mengembalikan `[]` (data tidak terbaca dari luar aplikasi).

Kinerja import setelah optimasi batch (1 transaksi per 25 siswa): 30 siswa tersimpan dalam 6,9 detik (±0,23 detik/siswa, sebagian besar untuk hashing bcrypt).

## Tambahan: verifikasi kontak & lupa password (KF-15, KF-16)

> 30 Oktober 2026 · PostgreSQL/Supabase · email dalam mode log (SMTP belum diisi), isi email dibaca dari log server

| ID | Hasil | Status |
|---|---|---|
| BB-26 | NIS 232410002 (tanpa kontak terverifikasi) → "Akun tidak ditemukan, atau belum punya email/WhatsApp yang terverifikasi…" | Sesuai |
| BB-27 | Kode `000000` → "Kode salah. Sisa 4 percobaan." | Sesuai |
| BB-28 | Kode benar dari email + password baru → password tersimpan, langsung masuk ke `/siswa` | Sesuai |
| BB-29 | Kode yang sama dipakai lagi → "Kode sudah tidak berlaku. Minta kode baru." | Sesuai |
| BB-30 | Email diganti di Profil → dialog verifikasi terbuka otomatis, kode terkirim, setelah kode dimasukkan status menjadi "Terverifikasi" | Sesuai |

Pilihan kanal menampilkan alamat tersamar (`ri******@s*****.id`, `0812-****-0101`). Unit test: 31 lulus.

### Uji kirim email sungguhan (Resend)

> 30 Oktober 2026 · Resend SMTP, domain `sibk.craveservices.my.id` (Verified, region Tokyo)

- Login SMTP + kirim ke `delivered@resend.dev`: berhasil (respons 250).
- Email OTP reset password ke Gmail pengembang: **masuk inbox**, tampilan sesuai template.
- **Bug ditemukan & diperbaiki:** email OTP sempat terkirim 2× dalam 19 detik. Penyebab: jeda 60 detik dihitung dengan jam laptop, sedangkan waktu pembuatan kode memakai jam database (jam laptop ±2 menit lebih cepat). Perbaikan: semua perhitungan waktu OTP (jeda, batas per jam, kedaluwarsa) memakai `now()` database. Uji ulang: permintaan kedua ditolak "Tunggu 56 detik sebelum meminta kode baru." — **sesuai**.
