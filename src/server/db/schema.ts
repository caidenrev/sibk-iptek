// Skema Drizzle SIBK (PostgreSQL) — mengikuti docs/PRD.md §8 (revisi ERD proposal).
//
// Semua tabel memakai .enableRLS() TANPA policy: Data API publik Supabase (anon key) tidak bisa
// membaca/menulis apa pun. Aplikasi terhubung sebagai role pemilik tabel sehingga tidak terkena RLS.
// Tabel ditambahkan bertahap per sprint:
//   Sprint 1: users, sesi, guru_bk, kelas, siswa, kategori_masalah, kode_otp   ← file ini
//   Sprint 2: pengaduan, tanggapan   ← sudah ditambahkan
//   Sprint 3: slot_jadwal, jadwal_konseling, notifikasi, pengaturan   ← sudah ditambahkan
//   Sprint 4: catatan_konseling   ← sudah ditambahkan
import { relations, sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

const id = () => bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity()
const fk = (name: string) => bigint(name, { mode: "number" })
// timestamptz: disimpan UTC, ditampilkan dalam WIB di lapisan tampilan (KNF-07).
const waktu = (name: string) => timestamp(name, { withTimezone: true, mode: "date" })
const createdAt = () => waktu("created_at").notNull().defaultNow()
const updatedAt = () =>
  waktu("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

export const PERAN = ["admin", "guru_bk", "siswa"] as const
export type Peran = (typeof PERAN)[number]
export const peranEnum = pgEnum("peran", PERAN)

export const JENIS_KELAMIN = ["L", "P"] as const
export const jenisKelaminEnum = pgEnum("jenis_kelamin", JENIS_KELAMIN)

/** Tabel 3.9 (+ username, is_active, harus_ganti_password, updated_at) */
export const users = pgTable("users", {
  id: id(),
  /** NIS untuk siswa, NIP untuk Guru BK, bebas untuk admin */
  username: varchar("username", { length: 50 }).notNull().unique(),
  nama: varchar("nama", { length: 100 }).notNull(),
  /** Selalu disimpan huruf kecil (dinormalisasi di validasi) */
  email: varchar("email", { length: 100 }).unique(),
  noWhatsapp: varchar("no_whatsapp", { length: 20 }),
  password: varchar("password", { length: 255 }).notNull(),
  role: peranEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  harusGantiPassword: boolean("harus_ganti_password").notNull().default(false),
  /** Kontak yang diisi admin dianggap terverifikasi; yang diubah pengguna sendiri wajib dikonfirmasi lewat OTP. */
  emailTerverifikasiPada: waktu("email_terverifikasi_pada"),
  waTerverifikasiPada: waktu("wa_terverifikasi_pada"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

/** Tambahan: sesi login (token disimpan sebagai hash SHA-256) */
export const sesi = pgTable(
  "sesi",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: waktu("expires_at").notNull(),
    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [index("sesi_user_idx").on(t.userId)]
).enableRLS()

/** Tabel 3.11 */
export const guruBk = pgTable("guru_bk", {
  id: id(),
  userId: fk("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  nip: varchar("nip", { length: 30 }).notNull().unique(),
}).enableRLS()

/** Tabel 3.12 — nama kelas selalu disimpan huruf kapital (dinormalisasi di validasi) */
export const kelas = pgTable("kelas", {
  id: id(),
  guruBkId: fk("guru_bk_id").references(() => guruBk.id, { onDelete: "set null" }),
  namaKelas: varchar("nama_kelas", { length: 30 }).notNull().unique(),
  jurusan: varchar("jurusan", { length: 50 }).notNull(),
}).enableRLS()

/** Tabel 3.10 */
export const siswa = pgTable(
  "siswa",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    kelasId: fk("kelas_id")
      .notNull()
      .references(() => kelas.id, { onDelete: "restrict" }),
    nis: varchar("nis", { length: 20 }).notNull().unique(),
    jenisKelamin: jenisKelaminEnum("jenis_kelamin").notNull(),
  },
  (t) => [index("siswa_kelas_idx").on(t.kelasId)]
).enableRLS()

/** Tabel 3.13 (+ is_active). Nama unik tanpa membedakan huruf besar/kecil. */
export const kategoriMasalah = pgTable(
  "kategori_masalah",
  {
    id: id(),
    namaKategori: varchar("nama_kategori", { length: 50 }).notNull(),
    deskripsi: text("deskripsi"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [uniqueIndex("kategori_masalah_nama_kategori_unique").on(sql`lower(${t.namaKategori})`)]
).enableRLS()

export const KANAL_OTP = ["email", "whatsapp"] as const
export const kanalOtpEnum = pgEnum("kanal_otp", KANAL_OTP)
export const KEPERLUAN_OTP = ["verifikasi_email", "verifikasi_wa", "reset_password"] as const
export const keperluanOtpEnum = pgEnum("keperluan_otp", KEPERLUAN_OTP)

/** Tambahan: kode OTP 6 digit (disimpan sebagai hash) untuk verifikasi kontak & lupa password. */
export const kodeOtp = pgTable(
  "kode_otp",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keperluan: keperluanOtpEnum("keperluan").notNull(),
    kanal: kanalOtpEnum("kanal").notNull(),
    /** Alamat email / nomor WA tujuan saat kode dibuat (kode batal bila kontak berubah) */
    tujuan: varchar("tujuan", { length: 100 }).notNull(),
    kodeHash: char("kode_hash", { length: 64 }).notNull(),
    percobaan: smallint("percobaan").notNull().default(0),
    kedaluwarsaPada: waktu("kedaluwarsa_pada").notNull(),
    dipakaiPada: waktu("dipakai_pada"),
    createdAt: createdAt(),
  },
  (t) => [index("kode_otp_user_idx").on(t.userId, t.keperluan)]
).enableRLS()

// ---------------------------------------------------------------- Sprint 2: pengaduan

export const URGENSI = ["rendah", "sedang", "tinggi"] as const
export const urgensiEnum = pgEnum("tingkat_urgensi", URGENSI)
export const STATUS_PENGADUAN = ["baru", "diproses", "selesai"] as const
export const statusPengaduanEnum = pgEnum("status_pengaduan", STATUS_PENGADUAN)
export const PENGIRIM_TANGGAPAN = ["siswa", "guru_bk"] as const
export const pengirimTanggapanEnum = pgEnum("pengirim_tanggapan", PENGIRIM_TANGGAPAN)

/**
 * Tabel 3.14 (+ revisi PRD §6/§8).
 * Kerahasiaan dijaga di tingkat data: pada aduan anonim `siswa_id` NULL, sehingga query apa pun
 * yang menggabungkan ke tabel siswa tidak mungkin mengembalikan identitas. Pemilik dikenali lewat
 * `pengirim_hash` (HMAC, untuk riwayat) dan `pengirim_terenkripsi` (AES-256-GCM, untuk notifikasi).
 */
export const pengaduan = pgTable(
  "pengaduan",
  {
    id: id(),
    kodeTiket: varchar("kode_tiket", { length: 12 }).notNull().unique(),
    /** Terisi untuk aduan beridentitas, atau setelah siswa memilih membuka identitas (Sprint 3) */
    siswaId: fk("siswa_id").references(() => siswa.id, { onDelete: "set null" }),
    pengirimHash: char("pengirim_hash", { length: 64 }).notNull(),
    pengirimTerenkripsi: text("pengirim_terenkripsi").notNull(),
    isAnonim: boolean("is_anonim").notNull(),
    alias: varchar("alias", { length: 40 }),
    kategoriId: fk("kategori_id")
      .notNull()
      .references(() => kategoriMasalah.id, { onDelete: "restrict" }),
    /** NULL = belum ada penanggung jawab (antrean bersama Guru BK) */
    guruBkId: fk("guru_bk_id").references(() => guruBk.id, { onDelete: "set null" }),
    judul: varchar("judul", { length: 150 }).notNull(),
    isi: text("isi").notNull(),
    /** Kunci berkas di penyimpanan (bukan nama asli berkas, demi kerahasiaan) */
    lampiran: varchar("lampiran", { length: 255 }),
    lampiranTipe: varchar("lampiran_tipe", { length: 50 }),
    tingkatUrgensi: urgensiEnum("tingkat_urgensi").notNull(),
    status: statusPengaduanEnum("status").notNull().default("baru"),
    identitasDibukaPada: waktu("identitas_dibuka_pada"),
    /** Penanda "balasan baru": dibandingkan dengan waktu tanggapan terakhir dari pihak lawan */
    dibacaSiswaPada: waktu("dibaca_siswa_pada"),
    dibacaGuruPada: waktu("dibaca_guru_pada"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("pengaduan_pengirim_idx").on(t.pengirimHash),
    index("pengaduan_guru_idx").on(t.guruBkId, t.status),
    index("pengaduan_dibuat_idx").on(t.createdAt),
  ]
).enableRLS()

/** Tabel 3.15 (+ user_id penulis Guru BK). Pesan siswa tidak menyimpan user_id. */
export const tanggapan = pgTable(
  "tanggapan",
  {
    id: id(),
    pengaduanId: fk("pengaduan_id")
      .notNull()
      .references(() => pengaduan.id, { onDelete: "cascade" }),
    pengirim: pengirimTanggapanEnum("pengirim").notNull(),
    userId: fk("user_id").references(() => users.id, { onDelete: "set null" }),
    isi: text("isi").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("tanggapan_pengaduan_idx").on(t.pengaduanId, t.createdAt)]
).enableRLS()

// ---------------------------------------------------------------- Sprint 3: jadwal konseling

export const STATUS_SLOT = ["tersedia", "dipesan", "ditutup"] as const
export const statusSlotEnum = pgEnum("status_slot", STATUS_SLOT)
export const STATUS_JADWAL = ["menunggu", "disetujui", "ditolak", "selesai", "batal", "tidak_hadir"] as const
export type StatusJadwal = (typeof STATUS_JADWAL)[number]
export const statusJadwalEnum = pgEnum("status_jadwal", STATUS_JADWAL)

/**
 * Tabel 3.12 (+ revisi PRD §5.7). Tanggal & jam disimpan sebagai waktu lokal WIB (sekolah hanya
 * di satu zona waktu). Larangan tumpang tindih dijaga constraint EXCLUDE di migrasi 0003, bukan di
 * sini, karena Drizzle belum bisa menuliskannya.
 */
export const slotJadwal = pgTable(
  "slot_jadwal",
  {
    id: id(),
    guruBkId: fk("guru_bk_id")
      .notNull()
      .references(() => guruBk.id, { onDelete: "cascade" }),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    jamMulai: time("jam_mulai").notNull(),
    jamSelesai: time("jam_selesai").notNull(),
    lokasi: varchar("lokasi", { length: 100 }).notNull(),
    status: statusSlotEnum("status").notNull().default("tersedia"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("slot_guru_tanggal_idx").on(t.guruBkId, t.tanggal),
    check("slot_jam_valid", sql`${t.jamSelesai} > ${t.jamMulai}`),
  ]
).enableRLS()

/** Tabel 3.13 (+ diputuskan_pada, updated_at). Satu slot hanya boleh punya satu pengajuan aktif. */
export const jadwalKonseling = pgTable(
  "jadwal_konseling",
  {
    id: id(),
    siswaId: fk("siswa_id")
      .notNull()
      .references(() => siswa.id, { onDelete: "cascade" }),
    slotId: fk("slot_id")
      .notNull()
      .references(() => slotJadwal.id, { onDelete: "restrict" }),
    /** Hanya aduan beridentitas atau yang identitasnya sudah dibuka siswa (PRD §5.6) */
    pengaduanId: fk("pengaduan_id").references(() => pengaduan.id, { onDelete: "set null" }),
    topik: varchar("topik", { length: 200 }).notNull(),
    status: statusJadwalEnum("status").notNull().default("menunggu"),
    alasanPenolakan: text("alasan_penolakan"),
    diputuskanPada: waktu("diputuskan_pada"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Pengaman terakhir anti double-booking (BB-18), di samping row lock saat memesan.
    uniqueIndex("jadwal_satu_aktif_per_slot")
      .on(t.slotId)
      .where(sql`${t.status} in ('menunggu', 'disetujui')`),
    index("jadwal_siswa_idx").on(t.siswaId, t.status),
  ]
).enableRLS()

/**
 * Tabel 3.17 (+ guru_bk_id, tampilkan_ke_siswa, perlu_lanjutan, updated_at). Satu catatan per sesi.
 * Ringkasan masalah hanya untuk Guru BK penulisnya; siswa hanya melihat tindak lanjut bila
 * `tampilkan_ke_siswa` dicentang (PRD §5.9). Admin tidak pernah bisa membacanya.
 */
export const catatanKonseling = pgTable(
  "catatan_konseling",
  {
    id: id(),
    jadwalId: fk("jadwal_id")
      .notNull()
      .references(() => jadwalKonseling.id, { onDelete: "cascade" }),
    guruBkId: fk("guru_bk_id")
      .notNull()
      .references(() => guruBk.id, { onDelete: "cascade" }),
    ringkasanMasalah: text("ringkasan_masalah").notNull(),
    tindakLanjut: text("tindak_lanjut"),
    tampilkanKeSiswa: boolean("tampilkan_ke_siswa").notNull().default(false),
    perluLanjutan: boolean("perlu_lanjutan").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("catatan_satu_per_jadwal").on(t.jadwalId)]
).enableRLS()

// ---------------------------------------------------------------- Sprint 3: notifikasi & pengaturan

export const KANAL = ["email", "whatsapp"] as const
export type Kanal = (typeof KANAL)[number]
export const kanalEnum = pgEnum("kanal_notifikasi", KANAL)
export const STATUS_NOTIF = ["menunggu", "terkirim", "gagal", "dilewati"] as const
export const statusNotifEnum = pgEnum("status_notifikasi", STATUS_NOTIF)

/**
 * Tabel 3.16 (revisi PRD §8: dari notifikasi_log menjadi antrean/outbox sekaligus log).
 * Satu baris = satu pesan ke satu orang lewat satu kanal. Dikirim oleh endpoint cron
 * (dan dicoba langsung saat kejadian). `kunci` mencegah pesan yang sama dibuat dua kali,
 * misalnya pengingat saat cron berjalan dua kali pada menit yang sama (BB-21).
 */
export const notifikasi = pgTable(
  "notifikasi",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kanal: kanalEnum("kanal").notNull(),
    jenis: varchar("jenis", { length: 40 }).notNull(),
    refTipe: varchar("ref_tipe", { length: 20 }),
    refId: bigint("ref_id", { mode: "number" }),
    /** Terkait aduan anonim: di log admin, penerima disamarkan (PRD §5.8) */
    isSensitif: boolean("is_sensitif").notNull().default(false),
    /** Alamat tujuan saat pesan dibuat (email / 62xxx) */
    tujuan: varchar("tujuan", { length: 255 }).notNull(),
    subjek: varchar("subjek", { length: 200 }),
    pesan: text("pesan").notNull(),
    html: text("html"),
    kunci: varchar("kunci", { length: 120 }).notNull(),
    status: statusNotifEnum("status").notNull().default("menunggu"),
    percobaan: smallint("percobaan").notNull().default(0),
    errorTerakhir: text("error_terakhir"),
    dijadwalkanPada: waktu("dijadwalkan_pada").notNull().defaultNow(),
    /** Penanda sedang dikirim oleh satu proses, agar dua proses tidak mengirim pesan yang sama */
    diklaimPada: waktu("diklaim_pada"),
    dikirimPada: waktu("dikirim_pada"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notifikasi_kunci_unik").on(t.userId, t.kanal, t.kunci),
    index("notifikasi_antrean_idx").on(t.status, t.dijadwalkanPada),
    index("notifikasi_dibuat_idx").on(t.createdAt),
  ]
).enableRLS()

/**
 * Kotak notifikasi di aplikasi (ikon lonceng). Dibuat dari kejadian yang sama dengan pesan WA/email,
 * tetapi untuk setiap penerima, termasuk yang belum mengisi kontak. Isi tidak memuat judul/isi aduan.
 */
export const pemberitahuan = pgTable(
  "pemberitahuan",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jenis: varchar("jenis", { length: 40 }).notNull(),
    judul: varchar("judul", { length: 120 }).notNull(),
    isi: varchar("isi", { length: 300 }).notNull(),
    tautan: varchar("tautan", { length: 200 }).notNull(),
    kunci: varchar("kunci", { length: 120 }).notNull(),
    dibacaPada: waktu("dibaca_pada"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("pemberitahuan_kunci_unik").on(t.userId, t.kunci), index("pemberitahuan_user_idx").on(t.userId, t.id)]
).enableRLS()

/** Pengaturan aplikasi yang bisa diubah admin (mis. token Fonnte). Nilai rahasia disimpan terenkripsi. */
export const pengaturan = pgTable("pengaturan", {
  kunci: varchar("kunci", { length: 60 }).primaryKey(),
  nilai: text("nilai").notNull(),
  isRahasia: boolean("is_rahasia").notNull().default(false),
  updatedAt: updatedAt(),
}).enableRLS()

// ---------------------------------------------------------------- relasi

export const usersRelations = relations(users, ({ one, many }) => ({
  siswa: one(siswa, { fields: [users.id], references: [siswa.userId] }),
  guruBk: one(guruBk, { fields: [users.id], references: [guruBk.userId] }),
  sesi: many(sesi),
}))

export const sesiRelations = relations(sesi, ({ one }) => ({
  user: one(users, { fields: [sesi.userId], references: [users.id] }),
}))

export const guruBkRelations = relations(guruBk, ({ one, many }) => ({
  user: one(users, { fields: [guruBk.userId], references: [users.id] }),
  kelasBinaan: many(kelas),
}))

export const kelasRelations = relations(kelas, ({ one, many }) => ({
  pembina: one(guruBk, { fields: [kelas.guruBkId], references: [guruBk.id] }),
  siswa: many(siswa),
}))

export const siswaRelations = relations(siswa, ({ one }) => ({
  user: one(users, { fields: [siswa.userId], references: [users.id] }),
  kelas: one(kelas, { fields: [siswa.kelasId], references: [kelas.id] }),
}))
