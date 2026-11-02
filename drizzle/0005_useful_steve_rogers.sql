CREATE TABLE "catatan_konseling" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catatan_konseling_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"jadwal_id" bigint NOT NULL,
	"guru_bk_id" bigint NOT NULL,
	"ringkasan_masalah" text NOT NULL,
	"tindak_lanjut" text,
	"tampilkan_ke_siswa" boolean DEFAULT false NOT NULL,
	"perlu_lanjutan" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catatan_konseling" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "catatan_konseling" ADD CONSTRAINT "catatan_konseling_jadwal_id_jadwal_konseling_id_fk" FOREIGN KEY ("jadwal_id") REFERENCES "public"."jadwal_konseling"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catatan_konseling" ADD CONSTRAINT "catatan_konseling_guru_bk_id_guru_bk_id_fk" FOREIGN KEY ("guru_bk_id") REFERENCES "public"."guru_bk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catatan_satu_per_jadwal" ON "catatan_konseling" USING btree ("jadwal_id");