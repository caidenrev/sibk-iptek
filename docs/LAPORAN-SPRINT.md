# Laporan Pelaksanaan Sprint (bahan BAB IV)

Rekap pelaksanaan Scrum untuk penulisan BAB IV: tujuan tiap sprint, backlog yang selesai, hasil Sprint Review (uji Black Box), dan Sprint Retrospective (kendala & perbaikan). Rincian tugas ada di [SPRINTS.md](SPRINTS.md), hasil uji lengkap di folder [hasil-uji](hasil-uji).

| Sprint | Tanggal | Sprint Goal | Black Box | Status |
|---|---|---|---|---|
| 0 | Okt 2026 | Fondasi teknis siap dipakai | – | ✅ |
| 1 | 30 Okt 2026 | Pengguna bisa login sesuai peran; admin mengelola data master | BB-01, 02, 11–14, 26–30 | ✅ |
| 2 | 1 Nov 2026 | Siswa bisa mengadu (anonim/beridentitas) dan Guru BK menanggapi | BB-03–06, 15–17 | ✅ |
| 3 | 2 Nov 2026 | Konseling tatap muka bisa dijadwalkan; notifikasi WA & email | BB-06–09, 18–23 | ✅ |
| 4 | 3 Nov 2026 | Catatan konseling, riwayat, laporan PDF | BB-10, 24, 25 | ✅ 4.1–4.6 · ⏳ 4.7–4.8 |

Total: **30 skenario Black Box, semuanya sesuai**. Uji otomatis pendukung: 46 unit test (Vitest).

---

## Sprint 0 — Persiapan teknis

**Increment:** proyek TanStack Start + seluruh komponen shadcn/ui, tema & mode gelap, Drizzle ORM, kerangka layout per peran, skrip `dev / build / test / db:*`.

**Retrospektif**
- Versi paket "latest" dari CLI membuat build tidak stabil → semua versi dikunci (*pinned*).
- Kode basis data sempat terbawa ke bundel browser → aturan: fungsi yang menyentuh basis data hanya di `src/server/services`, ditandai *server-only*.

## Sprint 1 — Autentikasi, peran, data master (+ verifikasi kontak & lupa password)

**Increment:** login berbasis sesi (cookie httpOnly, token di-hash), wajib ganti password untuk akun import, kunci login setelah gagal berulang, RBAC di server, CRUD kelas/Guru BK/kategori/siswa, import siswa dari Excel/CSV dengan pratinjau. Tambahan: verifikasi email/WA dan lupa password dengan OTP (KF-15, KF-16).

**Sprint Review:** BB-01, 02, 11, 12, 13, 14, 26–30 sesuai ([hasil uji](hasil-uji/sprint-1.md)).

**Retrospektif**
- Basis data dipindah dari MySQL (XAMPP) ke **PostgreSQL di Supabase** agar bisa diakses dari hosting, mendukung indeks parsial, zona waktu, dan RLS ([revisi-proposal.md](revisi-proposal.md) Revisi 1). Uji Sprint 1 diulang di PostgreSQL.
- OTP sempat terkirim dua kali karena jam laptop lebih cepat ±2 menit dari jam server basis data → semua perhitungan waktu OTP memakai jam basis data (`now()`).
- Import 30 siswa awalnya lambat → disimpan per batch 25 siswa dalam satu transaksi.

## Sprint 2 — Pengaduan & tanggapan

**Increment:** form pengaduan (mode anonim/beridentitas, pratinjau "apa yang dilihat Guru BK", urgensi, lampiran), enkripsi AES-256-GCM & HMAC untuk identitas pengirim anonim, kode tiket & alias, antrean bersama untuk aduan anonim, klaim "Tangani", percakapan siswa–Guru BK, penanda belum dibaca, lampiran di Supabase Storage tanpa EXIF.

**Sprint Review:** BB-03, 04, 05, 06 (penyimpanan), 15, 16, 17 sesuai ([hasil uji](hasil-uji/sprint-2.md)). Respons API Guru BK untuk aduan anonim diperiksa langsung: tidak memuat nama, NIS, kelas, maupun `siswa_id`.

**Retrospektif**
- Lencana "belum dibaca" sempat terhitung ganda: subquery di Drizzle menulis kolom tanpa nama tabel → nama tabel ditulis eksplisit.
- Lencana menu tidak berkurang setelah aduan dibuka → layout dimuat ulang setelah halaman detail menandai "dibaca".
- Pilihan filter tampil kosong sebelum dibuka → label diisi langsung.

## Sprint 3 — Penjadwalan, buka identitas, notifikasi

**Increment:**
- Slot jadwal Guru BK (termasuk slot berulang), pengajuan siswa 3 langkah, setujui/tolak dengan alasan, pembatalan, tandai selesai/tidak hadir.
- Anti *double booking* dua lapis: row lock + indeks unik parsial; slot tidak tumpang tindih dijaga constraint EXCLUDE.
- Buka identitas untuk satu aduan anonim.
- Notifikasi email & WhatsApp dengan antrean (*outbox*), percobaan ulang 3×, pengingat H-1 & 1 jam via cron-job.org, halaman pengaturan & log notifikasi admin.
- Di luar backlog, atas permintaan pengguna: pembaruan data tanpa refresh, navigasi lebih cepat, PWA (bisa dipasang), sidebar baru, perintah reset aktivitas + panduan serah terima.

**Sprint Review:** BB-06 (notifikasi), 07, 08, 09, 18, 19, 20, 21, 22, 23 sesuai ([hasil uji](hasil-uji/sprint-3.md)). Email notifikasi juga diuji lewat alur asli di server produksi: aduan baru, tanggapan, pengajuan, konfirmasi, dan pengingat H-1 dari cron produksi terkirim tanpa error.

**Retrospektif**
- Tiga bug ditemukan saat uji: parameter array terpecah di `unnest`, tipe parameter `tanggal + n` ambigu, dan subquery "slot punya riwayat" salah membaca kolom → semuanya diperbaiki; foreign key sudah mencegah data terhapus sebelum perbaikan.
- Akun uji memakai domain email sekolah → saat pengembangan notifikasi otomatis hanya dicetak ke log (`NOTIF_KIRIM_NYATA`).
- Cron Vercel versi gratis hanya sekali sehari → pemicu dipindah ke cron-job.org.
- WhatsApp menunggu token Fonnte (nomor pengirim khusus sekolah).

## Sprint 4 — Catatan, riwayat, laporan

**Increment:** halaman detail sesi + catatan konseling (ringkasan internal, tindak lanjut untuk siswa, penanda sesi lanjutan), riwayat konseling siswa, laporan dengan filter periode/kategori/Guru BK dan unduh PDF berkop sekolah, grafik tren 6 bulan.

**Sprint Review:** BB-10, 24, 25 sesuai ([hasil uji](hasil-uji/sprint-4.md)). Guru BK lain dan admin tidak bisa membaca catatan; siswa tidak menerima ringkasan masalah.

**Retrospektif**
- PDF gagal dibuat di build produksi karena font bawaan react-pdf hilang saat kode dibundel → paket react-pdf dan pdfkit disalin utuh ke hasil build (`traceDeps` Nitro), dicek di build node dan Vercel.
- Nomor halaman PDF tidak tampil di react-pdf 4.3 → dihapus; tidak memengaruhi isi laporan.
- Sisa: 4.7 (polishing tampilan, aksesibilitas, kinerja) dan 4.8 (panduan deploy, data demo UAT).

---

## Prinsip yang konsisten di semua sprint (bisa dibahas di BAB IV / V)

1. **Kerahasiaan dijaga di tingkat data**, bukan hanya tampilan: aduan anonim tidak menyimpan `siswa_id`; satu fungsi (`keTampilanGuru`) menjadi satu-satunya jalur data aduan ke Guru BK; isi pesan tidak pernah ditampilkan di log admin.
2. **Aturan penting dijaga basis data**: indeks unik parsial, constraint EXCLUDE, foreign key, transaksi + row lock.
3. **Waktu selalu dihitung dari jam basis data dalam WIB.**
4. **Setiap sprint diakhiri uji Black Box tertulis**, dan bug yang ditemukan dicatat beserta perbaikannya.
