import "@tanstack/react-start/server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { env } from "../env"
import { opsiPool } from "./pool-config"
import * as schema from "./schema"

// Satu pool per proses; disimpan di globalThis agar tidak berlipat saat HMR di mode dev.
const globalForDb = globalThis as unknown as { __sibkPool?: Pool }

const pool = globalForDb.__sibkPool ?? new Pool(opsiPool(env.DATABASE_URL))

if (env.NODE_ENV !== "production") globalForDb.__sibkPool = pool

export const db = drizzle(pool, { schema })
export type Db = typeof db
