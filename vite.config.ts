import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

// Nitro = adapter server yang dipakai TanStack Start saat build.
// - Di Vercel (env VERCEL=1)  → preset "vercel"  (serverless functions)
// - Di laptop / VPS           → preset "node-server" (server Node yang hidup terus, cocok untuk cron)
// Bisa dipaksa lewat env NITRO_PRESET.
const preset = process.env.NITRO_PRESET ?? (process.env.VERCEL ? "vercel" : "node-server")

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro({ preset }), viteReact()],
})

export default config
