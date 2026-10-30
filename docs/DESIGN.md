# Design — SIBK SMK IPTEK

> Versi 0.1 · Arah visual: **bersih & tenang** · Dibangun dari komponen shadcn/ui (semua komponen terpasang)

## 0. Logo

Logo "Bertemu" (dua gelembung percakapan siswa & Guru BK). File master, warna, dan aturan pemakaian: [brand/PANDUAN-LOGO.md](brand/PANDUAN-LOGO.md). Komponen aplikasi: `src/components/app/logo.tsx` (`Logo`, `LogoMark`).

## 1. Prinsip

1. **Terasa aman, bukan seperti kantor.** Siswa datang ke sistem ini dalam keadaan cemas. Bahasanya hangat dan langsung ("Ceritakan apa yang kamu alami"), bukan birokratis ("Input data pengaduan").
2. **Status anonim selalu terlihat.** Di setiap layar yang menyangkut aduan anonim, ada penanda yang jelas: badge "Anonim" + ikon perisai. Siswa tidak perlu menebak apakah identitasnya terlihat.
3. **Mobile-first untuk siswa, desktop-first untuk Guru BK & admin.** Siswa kemungkinan besar membuka dari HP; Guru BK bekerja dengan tabel dan kalender di laptop.
4. **Satu aksi utama per layar.** Tombol primer hanya satu; aksi lain berupa tombol sekunder/ghost.
5. **Jangan hanya mengandalkan warna.** Status selalu berupa teks + warna (+ ikon bila perlu).

## 2. Token warna

Ditaruh di `src/styles/app.css` (format OKLCH, mengikuti konvensi variabel shadcn + Tailwind v4). Aksen utama **teal**: memberi kesan tenang dan dipercaya, sekaligus berbeda dari biru generik.

```css
:root {
  --radius: 0.75rem;
  --background: oklch(0.99 0.004 200);
  --foreground: oklch(0.22 0.02 220);
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.5 0.09 195);          /* teal tua — tombol, link */
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.95 0.02 195);       /* teal sangat muda */
  --secondary-foreground: oklch(0.3 0.05 200);
  --muted: oklch(0.96 0.006 210);
  --muted-foreground: oklch(0.48 0.02 220);
  --accent: oklch(0.94 0.03 180);
  --accent-foreground: oklch(0.28 0.05 200);
  --destructive: oklch(0.55 0.19 25);
  --border: oklch(0.91 0.01 210);
  --input: oklch(0.89 0.012 210);
  --ring: oklch(0.6 0.09 195);
  /* semantik tambahan */
  --success: oklch(0.55 0.12 155);
  --warning: oklch(0.75 0.14 75);
  --info: oklch(0.55 0.1 240);
  --anon: oklch(0.45 0.1 285);             /* ungu lembut khusus penanda Anonim */
  /* chart (kategori: pribadi, sosial, belajar, karier, lain) */
  --chart-1: oklch(0.55 0.09 195);
  --chart-2: oklch(0.65 0.12 75);
  --chart-3: oklch(0.55 0.12 285);
  --chart-4: oklch(0.6 0.13 25);
  --chart-5: oklch(0.6 0.1 145);
}
.dark {
  --background: oklch(0.17 0.015 220);
  --foreground: oklch(0.95 0.008 200);
  --card: oklch(0.21 0.015 220);
  --popover: oklch(0.21 0.015 220);
  --primary: oklch(0.72 0.1 190);
  --primary-foreground: oklch(0.18 0.02 220);
  --secondary: oklch(0.27 0.03 200);
  --secondary-foreground: oklch(0.92 0.02 195);
  --muted: oklch(0.25 0.015 220);
  --muted-foreground: oklch(0.7 0.02 210);
  --accent: oklch(0.29 0.04 190);
  --border: oklch(0.3 0.015 220);
  --input: oklch(0.32 0.015 220);
  --ring: oklch(0.65 0.09 190);
  --anon: oklch(0.75 0.1 285);
}
```

Nilai di atas akan dicek kontrasnya (≥ 4.5:1 untuk teks) saat implementasi Sprint 0 dan disesuaikan bila ada yang kurang.

### Warna status

| Status | Varian Badge | Contoh |
|---|---|---|
| Baru / Menunggu | `info` (biru) | ● Baru |
| Diproses / Disetujui | `primary` (teal) | ● Diproses |
| Selesai | `success` (hijau) | ✓ Selesai |
| Ditolak / Batal / Gagal | `destructive` (merah) | ✕ Ditolak |
| Tidak hadir | `muted` | Tidak hadir |
| Urgensi tinggi | `warning` + ikon `AlertTriangle` | ▲ Tinggi |
| Anonim | `anon` + ikon `ShieldCheck` | 🛡 Anonim |

## 3. Tipografi

- **Font:** *Plus Jakarta Sans* (Google Fonts), karya foundry Indonesia, cocok untuk konteks sekolah di Jakarta–Tangsel. Berat yang dipakai: 400, 500, 600, 700.
- Angka di tabel & statistik: `tabular-nums`.
- Skala: `text-sm` (14) untuk tabel & label, `text-base` (16) untuk isi, `text-xl`/`text-2xl` untuk judul halaman, `text-3xl` untuk angka kartu dashboard.
- Kode tiket memakai `font-mono tracking-wider` (mis. `BK-7F3K9Q`) supaya mudah dibaca dan disalin.

## 4. Layout

### Shell aplikasi (setelah login)
- **Desktop (≥ 1024 px):** komponen `Sidebar` shadcn (bisa diciutkan ke ikon) + header berisi breadcrumb, toggle tema, lonceng notifikasi in-app, menu avatar.
- **Mobile:** sidebar berubah menjadi `Sheet`. **Untuk siswa**, ditambah **bottom navigation** 4 item: Beranda · Pengaduan · Jadwal · Profil, dengan tombol "+" di tengah untuk kirim pengaduan.
- Konten: `max-w-6xl` untuk Guru BK/admin, `max-w-2xl` untuk form siswa. Gutter 16 px (mobile) / 24–32 px (desktop).

### Menu per peran
- **Siswa:** Beranda, Kirim Pengaduan, Pengaduan Saya, Jadwal Konseling, Profil
- **Guru BK:** Dashboard, Pengaduan Masuk (badge jumlah baru), Slot Jadwal, Pengajuan & Sesi, Laporan, Profil
- **Admin:** Dashboard, Siswa, Kelas, Guru BK, Kategori, Pengaturan Notifikasi, Log Notifikasi, Laporan

## 5. Spesifikasi halaman

Nomor mengikuti Tabel 3.20 proposal.

### 1. Login
Dua kolom di desktop: kiri berisi panel ilustratif teal dengan kalimat singkat ("Ruang aman untuk bercerita. Identitasmu bisa tetap rahasia."), kanan berisi `Card` form. Di mobile hanya form.
Komponen: `Card`, `Input` (NIS / NIP / Username), `Input type=password` + tombol tampilkan, `Button`, `Alert` untuk error. Tanpa link daftar (akun dibuat admin), dengan teks bantuan "Lupa password? Hubungi Guru BK atau admin sekolah."

### 2. Dashboard Siswa
- Sapaan + kalimat pendek.
- Dua kartu aksi besar: **Kirim Pengaduan** (ikon `MessageSquareHeart`) · **Ajukan Konseling** (ikon `CalendarPlus`).
- "Jadwal berikutnya" (`Card`): tanggal, jam, Guru BK, lokasi, status.
- "Pengaduan aktif" (list): kode tiket, judul, status, titik "balasan baru".

### 3. Formulir Pengaduan (komponen paling penting)
Bertahap dalam satu halaman:
1. **Pilih mode:** `RadioGroup` berbentuk dua kartu besar:
   - 🛡 **Anonim**: "Guru BK hanya melihat nama samaran & kode tiket. Nama, NIS, dan kelasmu tidak ditampilkan."
   - 👤 **Dengan identitas**: "Guru BK pembina kelasmu bisa langsung mengenali dan menghubungimu."
   Di bawahnya ada `Collapsible` "Apa yang dilihat Guru BK?" berisi pratinjau mini kartu aduan dari sisi Guru BK, berubah sesuai mode yang dipilih. Pratinjau ini menjawab langsung butir UAT #5.
2. **Kategori:** `ToggleGroup`/chip (Pribadi, Sosial, Belajar, Karier, ...).
3. **Urgensi:** `RadioGroup` horizontal (Rendah · Sedang · Tinggi). Bila memilih Tinggi, muncul `Alert` dengan info bantuan darurat.
4. **Judul** (`Input`) + **Ceritakan** (`Textarea`, penghitung karakter). Mode anonim menampilkan petunjuk di bawah textarea agar tidak menulis nama/kelas.
5. **Lampiran:** dropzone (JPG/PNG/PDF ≤ 5 MB), dengan catatan "Metadata foto akan dihapus otomatis".
6. Tombol **Kirim pengaduan** → `AlertDialog` ringkasan mode → kirim.

**Halaman sukses:** ikon centang, kode tiket besar (mono) + tombol salin, penjelasan langkah berikutnya, tombol "Lihat pengaduan".

### 4. Riwayat & Percakapan Pengaduan
- Daftar: `Tabs` (Aktif / Selesai), kolom pencarian kode tiket, item berupa kartu di mobile dan tabel di desktop.
- Detail: header (kode, judul, kategori, urgensi, status, badge mode) + **thread** percakapan bergaya bubble (Guru BK di kiri, siswa di kanan), `Textarea` balasan di bawah (sticky di mobile).
- Aduan anonim yang belum dibuka: `Card` sekunder "Ingin bertemu langsung?" → tombol **Buka identitas & ajukan konseling** → `AlertDialog` peringatan (lihat PRD §5.6).

### 5. Pengajuan Jadwal
Wizard 3 langkah (`Stepper` sederhana dari komponen `Progress`/badge):
1. Pilih Guru BK (kartu dengan foto inisial `Avatar`, jumlah slot minggu ini).
2. Pilih tanggal (`Calendar`, hari dengan slot diberi titik) → pilih slot (`ToggleGroup` jam).
3. Topik (`Input`) + tautkan aduan (`Select`, opsional) → ringkasan → **Ajukan**.
Halaman "Jadwal Saya": tab Mendatang / Riwayat, status, tombol **Batalkan** (dengan `AlertDialog`).

### 6. Dashboard Guru BK
- Baris 4 kartu statistik: Aduan baru · Diproses · Menunggu persetujuan jadwal · Sesi hari ini.
- Grafik batang aduan per kategori (bulan ini) + grafik garis tren 6 bulan (`Chart`).
- Dua kolom: "Aduan terbaru" (urgensi tinggi di atas) dan "Agenda hari ini".

### 7. Pengaduan Masuk (Guru BK)
- `Tabs`: **Antrean anonim** (badge jumlah) · **Milik saya** · **Semua**.
- `Data Table`: kode, pengirim (alias + badge Anonim **atau** nama + kelas), kategori, urgensi, status, terakhir diperbarui, titik belum dibaca. Filter kategori/urgensi/status.
- Detail: layout dua kolom di desktop. Kiri: thread & balasan. Kanan: panel info (kategori, urgensi, status `Select`, tombol **Tangani** untuk aduan di antrean, jadwal terkait). Untuk aduan anonim, panel info **tidak memuat field identitas sama sekali**, bukan sekadar disembunyikan dengan CSS.

### 8. Slot & Pengajuan Jadwal (Guru BK)
- **Slot:** tampilan minggu (grid hari × jam) di desktop, list per hari di mobile. Blok slot berwarna sesuai status. Tombol "Tambah slot" → `Dialog` (tanggal, jam, lokasi, opsi ulangi per minggu).
- **Pengajuan:** `Data Table` dengan tab Menunggu / Disetujui / Riwayat; aksi **Setujui** dan **Tolak** (`Dialog` alasan wajib).
- **Detail sesi:** info siswa & topik, aduan terkait (jika ada), tombol tandai Selesai / Tidak hadir, form catatan konseling.

### 9. Catatan & Laporan
- Filter bar: `Popover` + `Calendar` range (periode), `Select` kategori, `Select` Guru BK (admin).
- Ringkasan kartu + tabel per kategori + grafik.
- Tombol **Cetak PDF** (unduh) dan opsional **Excel**.
- **PDF (Gambar 3.15):** kop sekolah, judul "Laporan Layanan Bimbingan dan Konseling", periode, tabel rekap per kategori/urgensi/status, ringkasan jadwal konseling, tanda tangan Guru BK & mengetahui Kepala Sekolah.

### 10. Data Master & Pengaturan (Admin)
- Setiap data master: `Data Table` + `Sheet` samping untuk tambah/ubah, `AlertDialog` untuk hapus.
- **Import siswa:** unggah file → tabel pratinjau dengan baris invalid berwarna merah + alasan → **Simpan N siswa valid**.
- **Pengaturan notifikasi:** dua `Card` (WhatsApp Fonnte · Email SMTP), masing-masing dengan `Switch` aktif, field, tombol **Simpan** & **Uji koneksi** (hasil via `Sonner` toast).
- **Log notifikasi:** `Data Table`, filter kanal/jenis/status, tombol **Kirim ulang** untuk yang gagal.

## 6. Pola UI umum

| Situasi | Pola |
|---|---|
| Memuat data | `Skeleton` sesuai bentuk konten |
| Data kosong | Ilustrasi ikon + kalimat + aksi ("Belum ada pengaduan. Kirim yang pertama?") |
| Sukses / gagal aksi | `Sonner` toast; error validasi muncul di bawah field (`FormMessage`) |
| Aksi berbahaya | `AlertDialog` dengan tombol merah bertuliskan aksinya ("Hapus kelas"), bukan "OK" |
| Notifikasi in-app | Ikon lonceng + `Popover` daftar 10 terbaru |
| 403 / 404 | Halaman sederhana + tombol kembali ke dashboard |

## 7. Gaya bahasa (microcopy)

- Siswa disapa **"kamu"**; Guru BK & admin memakai bahasa netral-formal.
- Tombol memakai kata kerja: "Kirim pengaduan", "Ajukan jadwal", "Setujui", bukan "Submit"/"OK".
- Hindari label yang menghakimi seperti "siswa bermasalah" atau "kasus"; gunakan "pengaduan", "sesi konseling".
- Format tanggal: `Senin, 2 Nov 2026 · 10.00–11.00 WIB`.
