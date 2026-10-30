import { createFileRoute } from "@tanstack/react-router"
import { sql } from "drizzle-orm"
import { db } from "@/server/db/client"

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const r = await db.execute<{ versi: string; waktu: Date }>(
            sql`select split_part(version(), ' on ', 1) as versi, now() as waktu`
          )
          return Response.json({ ok: true, db: r.rows[0].versi, waktu: r.rows[0].waktu })
        } catch (err) {
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 503 }
          )
        }
      },
    },
  },
})
