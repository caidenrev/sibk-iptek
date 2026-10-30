import "dotenv/config"
import { defineConfig } from "drizzle-kit"

const url = process.env.DATABASE_URL!
const lokal = /@(localhost|127\.0\.0\.1)[:/]/.test(url)

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: lokal ? url : `${url}${url.includes("?") ? "&" : "?"}sslmode=no-verify` },
  strict: true,
  verbose: true,
})
