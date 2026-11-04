import { useId } from "react"
import { cn } from "@/lib/utils"

// Hiasan latar halaman masuk (tampilan HP): bentuk lembut, ranting daun, bunga kecil, dan
// gelembung percakapan yang mengambil bentuk logo SIBK. Warna memakai token tema, jadi
// otomatis menyesuaikan mode gelap. Murni dekorasi: disembunyikan dari pembaca layar.

/** Satu helai daun, pangkal di (0,0) dan ujung di (40,0). */
const DAUN = "M0 0C9-10 27-12 40 0C27 12 9 10 0 0Z"

type Helai = { x: number; y: number; r: number; s?: number; warna: string }

function Ranting({ id, batang, helai }: { id: string; batang: string; helai: Array<Helai> }) {
  return (
    <g>
      <path d={batang} className="fill-none stroke-logo-1/70" strokeWidth={2} strokeLinecap="round" />
      {helai.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.r}) scale(${h.s ?? 1})`}>
          <use href={`#${id}`} className={h.warna} />
          <path d="M3 0L34 0" className="fill-none stroke-background/50" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

function Bunga({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx={0} cy={-5.5} rx={3.6} ry={5} transform={`rotate(${r})`} className="fill-chart-2" />
      ))}
      <circle r={2.8} className="fill-background" />
    </g>
  )
}

/** Gelembung percakapan kecil (siluet logo) sebagai garis. */
function Gelembung({ x, y, s = 1, r = 0 }: { x: number; y: number; s?: number; r?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      d="M0 -14A14 14 0 1 1 -9.9 9.9L-15 13L-13 6.5A14 14 0 0 1 0 -14Z"
      className="fill-none stroke-logo-2/80"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  )
}

export function DekorasiDaun({ className }: { className?: string }) {
  const id = `daun-${useId().replace(/:/g, "")}`
  const dasar = "pointer-events-none absolute"
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* Bentuk lembut, gelembung & titik: memenuhi area (boleh terpotong) */}
      <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className={cn(dasar, "inset-0 size-full")}>
        <defs>
          <path id={id} d={DAUN} />
        </defs>
        <circle cx={372} cy={-6} r={120} className="fill-logo-2/15" />
        <circle cx={-10} cy={250} r={105} className="fill-logo-1/8" />
        <path d="M150 300C120 250 170 205 230 222C290 239 300 300 300 300Z" className="fill-logo-2/10" />
        <Gelembung x={336} y={70} s={0.8} r={-8} />
        <Gelembung x={58} y={196} s={0.6} r={12} />
        <circle cx={300} cy={34} r={3} className="fill-chart-2/70" />
        <circle cx={130} cy={78} r={2.5} className="fill-logo-2/70" />
        <circle cx={92} cy={238} r={3} className="fill-chart-2/60" />
        <circle cx={262} cy={110} r={2} className="fill-logo-1/40" />
        <circle cx={24} cy={140} r={2.5} className="fill-logo-2/60" />
      </svg>

      {/* Ranting kiri atas: menempel di pojok dengan proporsi tetap */}
      <svg viewBox="-8 -8 124 104" className={cn(dasar, "top-0 left-0 w-[clamp(8.5rem,30%,13rem)]")}>
        <Ranting
          id={id}
          batang="M-6 92C30 70 58 42 92 -6"
          helai={[
            { x: 6, y: 84, r: -95, warna: "fill-logo-1" },
            { x: 14, y: 79, r: 15, s: 0.9, warna: "fill-logo-2" },
            { x: 34, y: 64, r: -100, s: 0.85, warna: "fill-chart-5" },
            { x: 42, y: 57, r: 5, s: 0.95, warna: "fill-logo-1" },
            { x: 60, y: 38, r: -110, s: 0.8, warna: "fill-logo-2" },
            { x: 68, y: 28, r: -10, s: 0.8, warna: "fill-chart-5" },
          ]}
        />
        <Bunga x={104} y={30} s={0.9} />
      </svg>

      {/* Ranting kanan bawah (bagian paling bawah tertutup lembar form) */}
      <svg viewBox="292 168 116 122" className={cn(dasar, "right-0 bottom-0 w-[clamp(6.5rem,26%,12rem)] translate-y-3")}>
        <Ranting
          id={id}
          batang="M408 196C368 214 340 240 318 290"
          helai={[
            { x: 398, y: 200, r: 95, warna: "fill-logo-1" },
            { x: 390, y: 204, r: 190, s: 0.9, warna: "fill-chart-5" },
            { x: 370, y: 216, r: 100, s: 0.9, warna: "fill-logo-2" },
            { x: 362, y: 222, r: 200, s: 0.85, warna: "fill-logo-1" },
            { x: 346, y: 240, r: 110, s: 0.8, warna: "fill-chart-5" },
            { x: 338, y: 252, r: 195, s: 0.8, warna: "fill-logo-2" },
          ]}
        />
        <Bunga x={306} y={262} s={0.8} />
        <Bunga x={356} y={186} s={0.55} />
      </svg>
    </div>
  )
}
