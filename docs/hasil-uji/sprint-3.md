# Hasil Uji — Sprint 3 (bagian 1: Slot & Jadwal Konseling)

> Tanggal uji: 2 November 2026 · Lingkungan: laptop pengembang, Chrome (panel browser), PostgreSQL 17 di Supabase (eu-west-1) · Penguji: pengembang
>
> Teknik: Black Box (Equivalence Partitioning). Skenario mengacu ke [SPRINTS.md](../SPRINTS.md#pengujian).
> Bagian notifikasi WhatsApp & email (BB-08, BB-09, BB-21, BB-22) diuji setelah tugas 3.7–3.11 selesai.

Akun uji: Guru BK Dewi Lestari (pembina XI RPL 1) dan Ahmad Fauzi, siswa `232410001` (XI RPL 1).

## Black Box Testing

| ID | Skenario | Masukan | Hasil yang diharapkan | Hasil pengujian | Status |
|---|---|---|---|---|---|
| BB-07 | Ajukan jadwal (bagian penyimpanan) | Siswa memilih Guru BK, tanggal, slot, topik | Status Menunggu, slot terkunci, Guru BK melihat pengajuan | Toast "Pengajuan terkirim", status Menunggu, slot berubah "dipesan" dan hilang dari pilihan siswa lain. Guru BK melihat angka 2 di menu Pengajuan & Sesi dan di dashboard. Notifikasi WA/email menyusul (3.8) | Sesuai |
| BB-18 | Double booking | Dua pengajuan untuk slot yang sama dikirim bersamaan | Hanya satu berhasil, yang lain mendapat pesan slot sudah dipesan | Satu berhasil, satu ditolak: "Slot ini baru saja dipesan siswa lain. Pilih slot lain." Dijaga dua lapis: row lock saat memesan dan indeks unik `jadwal_satu_aktif_per_slot` di database (diuji terpisah, insert kedua ditolak) | Sesuai |
| BB-19 | Tolak tanpa alasan | Alasan kosong | Pesan validasi | Form: "Tulis alasan minimal 5 karakter. Siswa akan membacanya." Server juga menolak bila form dilewati | Sesuai |
| BB-20 | Tolak / batal jadwal (bagian penyimpanan) | Guru BK menolak; siswa membatalkan | Slot kembali Tersedia | Setelah ditolak dan setelah dibatalkan siswa, slot kembali "tersedia" dan bisa dipesan lagi. Alasan penolakan tampil di riwayat siswa. Notifikasi menyusul (3.8) | Sesuai |

## Uji tambahan (aturan penjadwalan)

| Skenario | Hasil |
|---|---|
| Slot berulang Selasa & Kamis, 2 minggu | Pratinjau dan hasil sama: 4 slot (3, 5, 10, 12 Nov) |
| Slot 10.30–11.30 di atas slot 10.00–11.00 yang sama | "Bentrok dengan slot yang sudah ada: 3 Nov 2026 10.00–11.00." Constraint EXCLUDE di database juga menolak |
| Slot 11.00–12.00 tepat setelah slot 10.00–11.00 | Diterima (bersambung, tidak beririsan) |
| Jam selesai sebelum jam mulai / slot di tanggal yang sudah lewat | Ditolak dengan pesan |
| Pengajuan ke-3 saat sudah ada 2 pengajuan aktif | "Kamu sudah punya 2 pengajuan aktif…"; halaman pengajuan menampilkan peringatan dan pilihan Guru BK dinonaktifkan |
| Topik kurang dari 5 karakter | Pesan validasi di bawah kolom topik |
| Menutup slot yang sedang dipesan | "Slot ini sedang dipesan siswa. Tolak pengajuannya dulu…" |
| Menghapus slot yang punya riwayat pengajuan | "Slot ini punya riwayat pengajuan, jadi hanya bisa ditutup." (foreign key juga menolak) |
| Menghapus slot tanpa riwayat / tutup lalu buka lagi | Berhasil |
| Menandai sesi Selesai sebelum waktunya | "Sesi belum dimulai." |
| Siswa memanggil fungsi Guru BK (setujui, lihat slot) | "Akses ditolak." |
| Guru BK lain (Ahmad) membatalkan / menandai sesi milik Dewi | "Pengajuan tidak ditemukan." / "Sesi tidak ditemukan." |
| Pembina kelas | Guru BK pembina kelas siswa tampil paling atas dengan label "Pembina kelasmu" |
| Guru BK membatalkan sesi saat siswa membuka halaman Jadwal | Halaman siswa berubah sendiri dalam ≤ 15 detik tanpa refresh |
| Dashboard Guru BK | Kartu "Pengajuan jadwal" dan "Agenda hari ini" memakai data asli |
| Tampilan HP 375 px (Jadwal, Ajukan, Beranda siswa) | Tidak ada scroll horizontal |

## Bug yang ditemukan dan diperbaiki saat pengujian

1. Daftar tanggal dikirim ke `unnest(...::date[])` sebagai beberapa parameter terpisah sehingga query gagal. Diperbaiki dengan mengirim satu literal array Postgres.
2. `tanggal + $n` ambigu bagi Postgres (tipe parameter tidak diketahui). Diperbaiki dengan cast `::int`.
3. Pemeriksaan "slot punya riwayat" salah membaca kolom `id` di subquery (kebiasaan Drizzle menulis kolom tanpa nama tabel pada query tanpa join). Diperbaiki dengan menulis `"slot_jadwal"."id"` secara eksplisit; foreign key `restrict` sudah mencegah data terhapus sebelum perbaikan.

## Uji otomatis

- Unit test (Vitest): **46 lulus** (bertambah 6: format tanggal slot dan perhitungan tanggal slot berulang).
- Data uji (slot dan pengajuan) dihapus setelah pengujian.
