# Hasil Uji — Sprint 4 (bagian 1: Catatan, Riwayat, Laporan)

> Tanggal uji: 3 November 2026 · Laptop pengembang + build produksi lokal · PostgreSQL di Supabase.

## Black Box Testing

| ID | Skenario | Masukan | Hasil yang diharapkan | Hasil pengujian | Status |
|---|---|---|---|---|---|
| BB-10 | Catatan & laporan | Catatan sesi + filter periode | Catatan tersimpan; laporan tampil & bisa dicetak | Catatan tersimpan dan tampil di detail sesi; ringkasan < 10 karakter ditolak. Laporan November menghitung sesi selesai; PDF berkop sekolah terunduh (status 200, `application/pdf`) dari server dev dan build produksi | Sesuai |
| BB-24 | Admin membuka isi pengaduan | Admin mengakses URL detail aduan / catatan | Akses ditolak (403) | URL `/guru/pengaduan/...` → HTTP 403; `detailGuruFn` dan `detailJadwalGuruFn` → "Akses ditolak." Admin tetap bisa membuka laporan (angka agregat saja) | Sesuai |
| BB-25 | Laporan periode kosong | Periode tanpa data | Laporan tampil dengan angka 0, PDF tetap bisa dicetak | Semua kategori, urgensi, status, dan status sesi tampil 0; PDF 2 halaman tetap terbentuk | Sesuai |

## Uji tambahan

| Skenario | Hasil |
|---|---|
| Guru BK lain membuka / menulis catatan sesi milik Dewi | Tidak ditemukan / "Sesi tidak ditemukan." |
| Siswa membuka riwayat jadwal | Tindak lanjut tampil (karena dicentang "tampilkan ke siswa"); ringkasan masalah tidak ikut terkirim dari server |
| Catatan untuk sesi yang belum Selesai | Ditolak di server; di halaman detail form diganti keterangan |
| Laporan tanpa login | 401 |
| PDF di build produksi | Awalnya gagal (font bawaan react-pdf hilang saat di-bundle). Diperbaiki dengan `traceDeps` Nitro; build node dan build Vercel sama-sama membawa file font |

Data uji (1 slot, 1 sesi, 1 catatan) dihapus setelah pengujian.
