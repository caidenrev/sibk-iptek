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

---

# Bagian 2: Buka Identitas & Notifikasi WhatsApp/Email

> Tanggal uji: 2 November 2026 · Mode pengembangan: notifikasi otomatis dicetak ke log server (akun uji memakai alamat domain sekolah), token Fonnte belum diisi. Pengiriman nyata diuji lewat pesan uji dan token sengaja salah ke API Fonnte.

## Black Box Testing

| ID | Skenario | Masukan | Hasil yang diharapkan | Hasil pengujian | Status |
|---|---|---|---|---|---|
| BB-06 | Guru BK menanggapi (bagian notifikasi) | Ahmad membalas aduan anonim milik siswa 232410001 | Notifikasi terkirim ke siswa | 2 notifikasi (email & WA) ke siswa pemilik aduan, dicari lewat ID terenkripsi. Pesan hanya memuat kode tiket, tanpa judul/isi aduan. Ditandai sensitif | Sesuai |
| BB-08 | Konfirmasi jadwal | Guru BK menekan Setujui | Status Disetujui, WA & email terkirim | Status Disetujui; notifikasi `konfirmasi` (email & WA) ke siswa berisi waktu, lokasi, dan nama Guru BK. Pengajuan sebelumnya juga memicu notifikasi `pengajuan_jadwal` ke Guru BK | Sesuai |
| BB-09 | Pengingat otomatis | Sesi disetujui < 24 jam lagi; sesi digeser ke 30 menit lagi | Pengingat terkirim & tercatat di log | Cron membuat `pengingat_h1` (4 pesan: siswa & Guru BK, email & WA), lalu `pengingat_1jam` (4 pesan) setelah sesi digeser. Semua tercatat di log notifikasi | Sesuai |
| BB-21 | Pengingat tidak dobel | Cron dipanggil 2× bersamaan, lalu sekali lagi | Hanya satu pengingat per kanal | Panggilan bersamaan: satu membuat 4 pengingat, satu membuat 0; panggilan ketiga 0. Dijaga indeks unik `(user_id, kanal, kunci)` | Sesuai |
| BB-22 | WA gateway gagal | Token Fonnte salah, kirim WA | Status Gagal setelah 3 percobaan, email tetap terkirim, bisa kirim ulang | Fonnte menjawab "invalid token"; percobaan 1 dan 2 dijadwalkan ulang, percobaan 3 berstatus **Gagal**; cron tidak mengulang pesan yang sudah gagal; tombol Kirim ulang mengantrekan lagi. Email dan WA adalah baris terpisah sehingga kegagalan WA tidak memengaruhi email | Sesuai |
| BB-23 | Buka identitas | Siswa membuka identitas pada satu dari dua aduan anonimnya | Guru BK melihat nama untuk aduan itu saja; aduan anonim lain tetap tersamar | Dialog peringatan "tidak bisa dibatalkan", lalu diarahkan ke pengajuan jadwal dengan aduan tertaut. Guru BK lain (bukan pembina) melihat nama, NIS, kelas + keterangan "awalnya anonim" pada aduan itu; aduan kedua tetap alias. Respons server untuk aduan kedua tidak memuat nama, NIS, atau kelas. `is_anonim` tetap true untuk statistik | Sesuai |

## Uji tambahan

| Skenario | Hasil |
|---|---|
| Endpoint `/api/cron` tanpa kunci / kunci salah / kunci benar | 401 / 401 / 200 |
| Log notifikasi admin untuk aduan anonim | "Penerima disamarkan (aduan anonim)"; `penerima` dan `tujuan` bernilai null sejak dari server |
| Isi pesan di log admin | Tidak pernah dikirim ke halaman admin |
| Kontak di log admin (notifikasi biasa) | Disamarkan: `0812-****-0002`, `ah******@s*****.id` |
| Simpan token Fonnte yang salah | Ditolak sebelum disimpan: "Token ditolak Fonnte: token invalid" |
| Uji koneksi Fonnte dengan token salah | "Gagal: token invalid" |
| Hapus token lewat admin | Dialog konfirmasi, status kembali "Belum diatur" |
| Status cron di halaman admin | "Terakhir berjalan 1 menit lalu" setelah endpoint dipanggil |
| Tombol "Kirim tes notifikasi" di profil | Muncul bila ada kontak terverifikasi dan form tidak sedang diubah. Tidak ditekan saat uji karena alamat akun uji memakai domain sekolah |

Data uji (2 aduan, 1 slot, 1 jadwal, 15 notifikasi, token uji) dihapus setelah pengujian.
