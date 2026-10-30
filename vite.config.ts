import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

// Nitro preset "node-server": hasil build berupa server Node.js yang hidup terus,
// dibutuhkan oleh penjadwal pengingat (cron) — lihat docs/PRD.md §3.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: "node-server" }),
    viteReact(),
  ],
})

export default config
