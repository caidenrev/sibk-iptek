CREATE TYPE "public"."kanal_otp" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."keperluan_otp" AS ENUM('verifikasi_email', 'verifikasi_wa', 'reset_password');--> statement-breakpoint
CREATE TABLE "kode_otp" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kode_otp_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"keperluan" "keperluan_otp" NOT NULL,
	"kanal" "kanal_otp" NOT NULL,
	"tujuan" varchar(100) NOT NULL,
	"kode_hash" char(64) NOT NULL,
	"percobaan" smallint DEFAULT 0 NOT NULL,
	"kedaluwarsa_pada" timestamp with time zone NOT NULL,
	"dipakai_pada" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kode_otp" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_terverifikasi_pada" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "wa_terverifikasi_pada" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kode_otp" ADD CONSTRAINT "kode_otp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kode_otp_user_idx" ON "kode_otp" USING btree ("user_id","keperluan");--> statement-breakpoint
-- Kontak yang sudah ada diisi oleh admin/seed, jadi dianggap terverifikasi.
UPDATE "users" SET "email_terverifikasi_pada" = now() WHERE "email" IS NOT NULL;--> statement-breakpoint
UPDATE "users" SET "wa_terverifikasi_pada" = now() WHERE "no_whatsapp" IS NOT NULL;
