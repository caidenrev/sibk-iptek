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

---

# Bagian 2: Perbaikan akhir (4.7) & persiapan UAT (4.8)

> 3 November 2026.

## Audit tampilan HP & aksesibilitas (layar 375 px, 22 halaman, semua peran)

Pemeriksaan otomatis di setiap halaman: halaman bergeser ke samping, tombol/tautan tanpa nama yang bisa dibaca pembaca layar, kolom isian tanpa label, `id` ganda, dan target sentuh terlalu kecil.

| Temuan | Perbaikan |
|---|---|
| Form "Kirim pengaduan" bergeser ke samping di HP (lebar 414 px pada layar 375 px) | Input file tersembunyi ikut dipaksa selebar penuh oleh komponen Field → diganti `hidden` (tetap dipicu tombol "Pilih foto") |
| Tab Aktif/Selesai dan Mendatang/Riwayat siswa setinggi 25 px | 40 px di HP |
| Tombol "Lihat semua", "Buka log", menu ☰ Guru BK/admin, tombol tampilkan password (24–28 px) | 36–44 px di HP |

Setelah perbaikan: tidak ada halaman yang bergeser, tidak ada tombol tanpa nama, tidak ada kolom tanpa label, tidak ada `id` ganda.

## Kinerja (target < 3 detik)

Diukur dari server hasil build produksi di laptop, database Supabase di Irlandia (±200 ms per query).

| Halaman | Sebelum | Sesudah (kunjungan berikutnya) |
|---|---|---|
| Beranda siswa | 0,95 dtk | 0,52 dtk |
| Ajukan konseling | 2,87 dtk | 0,51 dtk |
| Dashboard Guru BK | 2,49 dtk | 0,80 dtk |
| Pengaduan masuk | 1,25 dtk | 0,65 dtk |
| Laporan | 2,95 dtk | 0,67 dtk |
| Dashboard admin | 1,15 dtk | 0,57 dtk |
| Data siswa (admin) | 1,09 dtk | 0,95–1,44 dtk |

Perbaikan: hasil cek sesi disimpan per request (beberapa server function di satu halaman tidak lagi mengulang query sesi), hitungan lencana Guru BK dijalankan bersamaan, daftar Guru BK di halaman Ajukan dibuat dengan satu query. Kunjungan pertama setelah server baru menyala bisa 2–3 detik karena kode halaman dan koneksi database baru disiapkan. Halaman publik di Vercel: `/` 1,7 dtk, `/login` 0,9 dtk.

Saran: memindahkan Supabase dan region Vercel ke Singapura akan memangkas waktu tiap query sekitar 5–10 kali.

## Persiapan UAT

- `pnpm db:seed-demo`: 10 pengaduan, 12 pesan, 19 slot, 6 jadwal, 2 catatan; diuji berhasil dan menolak dijalankan ulang bila sudah ada data. Dashboard, grafik tren, dan laporan langsung terisi.
- Panduan deploy & alur UAT: [DEPLOY.md](../DEPLOY.md).
