CREATE TYPE "public"."status_jadwal" AS ENUM('menunggu', 'disetujui', 'ditolak', 'selesai', 'batal', 'tidak_hadir');--> statement-breakpoint
CREATE TYPE "public"."status_slot" AS ENUM('tersedia', 'dipesan', 'ditutup');--> statement-breakpoint
CREATE TABLE "jadwal_konseling" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "jadwal_konseling_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"siswa_id" bigint NOT NULL,
	"slot_id" bigint NOT NULL,
	"pengaduan_id" bigint,
	"topik" varchar(200) NOT NULL,
	"status" "status_jadwal" DEFAULT 'menunggu' NOT NULL,
	"alasan_penolakan" text,
	"diputuskan_pada" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jadwal_konseling" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "slot_jadwal" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "slot_jadwal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"guru_bk_id" bigint NOT NULL,
	"tanggal" date NOT NULL,
	"jam_mulai" time NOT NULL,
	"jam_selesai" time NOT NULL,
	"lokasi" varchar(100) NOT NULL,
	"status" "status_slot" DEFAULT 'tersedia' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_jam_valid" CHECK ("slot_jadwal"."jam_selesai" > "slot_jadwal"."jam_mulai")
);
--> statement-breakpoint
ALTER TABLE "slot_jadwal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jadwal_konseling" ADD CONSTRAINT "jadwal_konseling_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_konseling" ADD CONSTRAINT "jadwal_konseling_slot_id_slot_jadwal_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slot_jadwal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_konseling" ADD CONSTRAINT "jadwal_konseling_pengaduan_id_pengaduan_id_fk" FOREIGN KEY ("pengaduan_id") REFERENCES "public"."pengaduan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_jadwal" ADD CONSTRAINT "slot_jadwal_guru_bk_id_guru_bk_id_fk" FOREIGN KEY ("guru_bk_id") REFERENCES "public"."guru_bk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jadwal_satu_aktif_per_slot" ON "jadwal_konseling" USING btree ("slot_id") WHERE "jadwal_konseling"."status" in ('menunggu', 'disetujui');--> statement-breakpoint
CREATE INDEX "jadwal_siswa_idx" ON "jadwal_konseling" USING btree ("siswa_id","status");--> statement-breakpoint
CREATE INDEX "slot_guru_tanggal_idx" ON "slot_jadwal" USING btree ("guru_bk_id","tanggal");--> statement-breakpoint
-- Ditulis manual (Drizzle belum mendukung EXCLUDE): slot milik Guru BK yang sama tidak boleh
-- tumpang tindih waktunya. Slot yang ditutup tidak dihitung, jadi waktunya bisa dipakai slot baru.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "slot_jadwal" ADD CONSTRAINT "slot_tidak_tumpang_tindih" EXCLUDE USING gist (
	"guru_bk_id" WITH =,
	tsrange("tanggal" + "jam_mulai", "tanggal" + "jam_selesai") WITH &&
) WHERE ("status" <> 'ditutup');
