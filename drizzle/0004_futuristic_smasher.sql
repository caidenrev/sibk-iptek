CREATE TYPE "public"."kanal_notifikasi" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."status_notifikasi" AS ENUM('menunggu', 'terkirim', 'gagal', 'dilewati');--> statement-breakpoint
CREATE TABLE "notifikasi" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifikasi_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"kanal" "kanal_notifikasi" NOT NULL,
	"jenis" varchar(40) NOT NULL,
	"ref_tipe" varchar(20),
	"ref_id" bigint,
	"is_sensitif" boolean DEFAULT false NOT NULL,
	"tujuan" varchar(255) NOT NULL,
	"subjek" varchar(200),
	"pesan" text NOT NULL,
	"html" text,
	"kunci" varchar(120) NOT NULL,
	"status" "status_notifikasi" DEFAULT 'menunggu' NOT NULL,
	"percobaan" smallint DEFAULT 0 NOT NULL,
	"error_terakhir" text,
	"dijadwalkan_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diklaim_pada" timestamp with time zone,
	"dikirim_pada" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifikasi" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pengaturan" (
	"kunci" varchar(60) PRIMARY KEY NOT NULL,
	"nilai" text NOT NULL,
	"is_rahasia" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pengaturan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notifikasi_kunci_unik" ON "notifikasi" USING btree ("user_id","kanal","kunci");--> statement-breakpoint
CREATE INDEX "notifikasi_antrean_idx" ON "notifikasi" USING btree ("status","dijadwalkan_pada");--> statement-breakpoint
CREATE INDEX "notifikasi_dibuat_idx" ON "notifikasi" USING btree ("created_at");