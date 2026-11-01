# Hasil Uji — Sprint 2 (Pengaduan Anonim/Beridentitas & Tanggapan)

> Tanggal uji: 1 November 2026 · Lingkungan: laptop pengembang, Chrome (panel browser), PostgreSQL 17 di Supabase (eu-west-1), Supabase Storage (bucket privat `lampiran`) · Penguji: pengembang
>
> Teknik: Black Box (Equivalence Partitioning). Skenario mengacu ke [SPRINTS.md](../SPRINTS.md#pengujian).

Akun uji: siswa `232410001` (kelas XI RPL 1, pembina Dewi Lestari), Guru BK Dewi Lestari dan Ahmad Fauzi, admin.

## Black Box Testing

| ID | Skenario | Masukan | Hasil yang diharapkan | Hasil pengujian | Status |
|---|---|---|---|---|---|
| BB-03 | Kirim pengaduan anonim | Form lengkap lewat antarmuka, mode Anonim, kategori Sosial, urgensi sedang | Tersimpan, kode tiket muncul, Guru BK melihat alias tanpa nama & kelas | Dialog konfirmasi "Kirim sebagai anonim?", lalu layar sukses dengan kode `BK-3K2K63`. Di database `siswa_id` NULL, `pengirim_terenkripsi` & `pengirim_hash` terisi, `guru_bk_id` NULL (antrean). Guru BK lain (Ahmad) melihatnya di tab Antrean sebagai "Siswa Ivory-14" | Sesuai |
| BB-04 | Kirim pengaduan beridentitas | Form lengkap, mode Dengan nama | Tersimpan dengan nama & kelas siswa | Tersimpan dengan `siswa_id` terisi dan langsung diarahkan ke pembina kelas (Dewi Lestari). Guru BK melihat nama, NIS, kelas | Sesuai |
| BB-05 | Pengaduan tidak lengkap | Judul < 5 karakter, cerita < 20 karakter, kategori kosong | Pesan validasi | Pesan di bawah tiap field; server juga menolak bila validasi browser dilewati | Sesuai |
| BB-06 | Guru BK menanggapi (bagian penyimpanan) | Teks tanggapan, Ctrl+Enter | Tanggapan tersimpan, siswa mendapat tanda balasan baru | Tanggapan tersimpan, aduan antrean otomatis menjadi milik Guru BK yang membalas, status `baru → diproses`. Siswa melihat "Balasan baru" dan angka di menu; hilang setelah aduan dibuka. Notifikasi WA/email menyusul di Sprint 3 | Sesuai |
| BB-15 | Lampiran tidak valid | File teks diganti nama `.jpg`; PDF pada mode anonim; file > 5 MB | Ditolak dengan pesan | Tipe dicek dari isi file (magic bytes), bukan ekstensi: "Lampiran harus berupa gambar (JPG, PNG, WEBP) atau PDF." PDF di mode anonim ditolak (metadata PDF bisa memuat nama penulis). File > 5 MB: "Ukuran lampiran maksimal 5 MB." di browser, server juga memeriksa ("Lampiran maksimal 5 MB.") | Sesuai |
| BB-16 | Siswa membuka aduan siswa lain | Kode tiket milik siswa lain | Tidak ditemukan / 403 | Halaman "Pengaduan tidak ditemukan"; `detailSiswaFn` mengembalikan null. `/api/lampiran/<kode>`: siswa lain 404, admin 404, tanpa login 401 | Sesuai |
| BB-17 | Respons API Guru BK untuk aduan anonim | Inspeksi respons `daftarGuruFn`, `detailGuruFn`, `ringkasanGuruFn` | Tidak ada field nama/NIS/kelas/siswa_id | Respons hanya berisi `pengirim: { anonim: true, alias }`. Tidak ada `siswaId`, `pengirimHash`, `pengirimTerenkripsi`, nama, NIS, maupun kelas. Semua jalur data lewat satu fungsi `keTampilanGuru()` | Sesuai |

## Uji tambahan (aturan penanganan)

| Skenario | Hasil |
|---|---|
| Dua Guru BK menekan Tangani pada aduan antrean yang sama | Klaim atomik: hanya yang pertama berhasil, yang kedua mendapat "Pengaduan ini sudah ditangani Guru BK lain." |
| Guru BK lain membalas / mengubah status aduan milik rekannya | Ditolak server; di antarmuka hanya bisa membaca |
| Siswa membalas aduan berstatus Selesai | Form balas tidak tampil; server menolak |
| Pesan siswa pada aduan anonim | `tanggapan.user_id` NULL |
| Foto berisi EXIF (lokasi GPS, merek kamera) | File di Storage sudah bersih dari EXIF, nama file diganti acak `YYYY/MM/<32 hex>` |
| Akses langsung ke URL Storage tanpa kunci | Ditolak (bucket privat) |
| Angka di menu (lencana) setelah membuka aduan | Langsung berkurang tanpa muat ulang halaman |
| Dashboard Guru BK | Angka antrean, aduan baru, sedang diproses, urgensi tinggi dan grafik per kategori bulan berjalan cocok dengan isi database |
| Tampilan HP 375 px & tema terang/gelap | Tidak ada scroll horizontal; teks terbaca di kedua tema |
| Bundle JavaScript browser | Tidak memuat kode enkripsi, kunci, bcrypt, maupun nama kolom identitas |

## Uji otomatis

- Unit test (Vitest): **40 lulus** (bertambah 9 test crypto: enkripsi/dekripsi AES-256-GCM, tamper ditolak, hash pengirim konsisten, format kode tiket & alias).
- Build production (`node-server`) dan build Vercel: berhasil.

Data uji (3 pengaduan beserta tanggapan dan 1 lampiran di Storage) dihapus setelah pengujian.
