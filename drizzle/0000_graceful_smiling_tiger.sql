CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');--> statement-breakpoint
CREATE TYPE "public"."peran" AS ENUM('admin', 'guru_bk', 'siswa');--> statement-breakpoint
CREATE TABLE "guru_bk" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guru_bk_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"nip" varchar(30) NOT NULL,
	CONSTRAINT "guru_bk_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "guru_bk_nip_unique" UNIQUE("nip")
);
--> statement-breakpoint
ALTER TABLE "guru_bk" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kategori_masalah" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kategori_masalah_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"nama_kategori" varchar(50) NOT NULL,
	"deskripsi" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kategori_masalah" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kelas" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kelas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"guru_bk_id" bigint,
	"nama_kelas" varchar(30) NOT NULL,
	"jurusan" varchar(50) NOT NULL,
	CONSTRAINT "kelas_nama_kelas_unique" UNIQUE("nama_kelas")
);
--> statement-breakpoint
ALTER TABLE "kelas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sesi" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sesi_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" varchar(45),
	"user_agent" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesi_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "sesi" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "siswa" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "siswa_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"kelas_id" bigint NOT NULL,
	"nis" varchar(20) NOT NULL,
	"jenis_kelamin" "jenis_kelamin" NOT NULL,
	CONSTRAINT "siswa_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "siswa_nis_unique" UNIQUE("nis")
);
--> statement-breakpoint
ALTER TABLE "siswa" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"username" varchar(50) NOT NULL,
	"nama" varchar(100) NOT NULL,
	"email" varchar(100),
	"no_whatsapp" varchar(20),
	"password" varchar(255) NOT NULL,
	"role" "peran" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"harus_ganti_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guru_bk" ADD CONSTRAINT "guru_bk_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_guru_bk_id_guru_bk_id_fk" FOREIGN KEY ("guru_bk_id") REFERENCES "public"."guru_bk"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kategori_masalah_nama_kategori_unique" ON "kategori_masalah" USING btree (lower("nama_kategori"));--> statement-breakpoint
CREATE INDEX "sesi_user_idx" ON "sesi" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "siswa_kelas_idx" ON "siswa" USING btree ("kelas_id");