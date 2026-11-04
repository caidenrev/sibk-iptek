CREATE TABLE "pemberitahuan" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pemberitahuan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"jenis" varchar(40) NOT NULL,
	"judul" varchar(120) NOT NULL,
	"isi" varchar(300) NOT NULL,
	"tautan" varchar(200) NOT NULL,
	"kunci" varchar(120) NOT NULL,
	"dibaca_pada" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pemberitahuan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pemberitahuan" ADD CONSTRAINT "pemberitahuan_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pemberitahuan_kunci_unik" ON "pemberitahuan" USING btree ("user_id","kunci");--> statement-breakpoint
CREATE INDEX "pemberitahuan_user_idx" ON "pemberitahuan" USING btree ("user_id","id");