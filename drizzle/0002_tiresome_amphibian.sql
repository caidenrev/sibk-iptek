CREATE TYPE "public"."pengirim_tanggapan" AS ENUM('siswa', 'guru_bk');--> statement-breakpoint
CREATE TYPE "public"."status_pengaduan" AS ENUM('baru', 'diproses', 'selesai');--> statement-breakpoint
CREATE TYPE "public"."tingkat_urgensi" AS ENUM('rendah', 'sedang', 'tinggi');--> statement-breakpoint
CREATE TABLE "pengaduan" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pengaduan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"kode_tiket" varchar(12) NOT NULL,
	"siswa_id" bigint,
	"pengirim_hash" char(64) NOT NULL,
	"pengirim_terenkripsi" text NOT NULL,
	"is_anonim" boolean NOT NULL,
	"alias" varchar(40),
	"kategori_id" bigint NOT NULL,
	"guru_bk_id" bigint,
	"judul" varchar(150) NOT NULL,
	"isi" text NOT NULL,
	"lampiran" varchar(255),
	"lampiran_tipe" varchar(50),
	"tingkat_urgensi" "tingkat_urgensi" NOT NULL,
	"status" "status_pengaduan" DEFAULT 'baru' NOT NULL,
	"identitas_dibuka_pada" timestamp with time zone,
	"dibaca_siswa_pada" timestamp with time zone,
	"dibaca_guru_pada" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pengaduan_kode_tiket_unique" UNIQUE("kode_tiket")
);
--> statement-breakpoint
ALTER TABLE "pengaduan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tanggapan" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tanggapan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pengaduan_id" bigint NOT NULL,
	"pengirim" "pengirim_tanggapan" NOT NULL,
	"user_id" bigint,
	"isi" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tanggapan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pengaduan" ADD CONSTRAINT "pengaduan_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaduan" ADD CONSTRAINT "pengaduan_kategori_id_kategori_masalah_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_masalah"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaduan" ADD CONSTRAINT "pengaduan_guru_bk_id_guru_bk_id_fk" FOREIGN KEY ("guru_bk_id") REFERENCES "public"."guru_bk"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tanggapan" ADD CONSTRAINT "tanggapan_pengaduan_id_pengaduan_id_fk" FOREIGN KEY ("pengaduan_id") REFERENCES "public"."pengaduan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tanggapan" ADD CONSTRAINT "tanggapan_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pengaduan_pengirim_idx" ON "pengaduan" USING btree ("pengirim_hash");--> statement-breakpoint
CREATE INDEX "pengaduan_guru_idx" ON "pengaduan" USING btree ("guru_bk_id","status");--> statement-breakpoint
CREATE INDEX "pengaduan_dibuat_idx" ON "pengaduan" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tanggapan_pengaduan_idx" ON "tanggapan" USING btree ("pengaduan_id","created_at");