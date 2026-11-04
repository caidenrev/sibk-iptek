// Format tanggal & jam untuk tampilan. Semua waktu disimpan UTC dan ditampilkan dalam WIB (KNF-07).
export const APP_TZ = "Asia/Jakarta"

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TZ,
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
})

const tanggalPendek = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
})

const jam = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const toDate = (d: Date | string | number) => (d instanceof Date ? d : new Date(d))

/** "Senin, 2 Nov 2026" */
export function formatTanggal(d: Date | string | number) {
  return tanggalPanjang.format(toDate(d))
}

/** "2 Nov 2026" */
export function formatTanggalPendek(d: Date | string | number) {
  return tanggalPendek.format(toDate(d))
}

/** "10.00" */
export function formatJam(d: Date | string | number) {
  return jam.format(toDate(d))
}

/** "Senin, 2 Nov 2026 · 10.00–11.00 WIB" (DESIGN.md §7) */
export function formatRentangSesi(mulai: Date | string | number, selesai: Date | string | number) {
  return `${formatTanggal(mulai)} · ${formatJam(mulai)}–${formatJam(selesai)} WIB`
}

const hariTanggal = new Intl.DateTimeFormat("id-ID", { timeZone: APP_TZ, weekday: "long", day: "numeric", month: "short" })

/** "2026-11-09" → "Senin, 9 Nov". Untuk tanggal slot (tanpa jam). */
export function formatHari(tanggal: string) {
  return hariTanggal.format(new Date(`${tanggal}T12:00:00+07:00`))
}

/** "10:00" → "10.00" (penulisan jam di Indonesia) */
export const jamTitik = (j: string) => j.slice(0, 5).replace(":", ".")

/** Slot jadwal: "Senin, 9 Nov 2026 · 10.00–11.00 WIB" */
export function formatSlot(tanggal: string, jamMulai: string, jamSelesai: string) {
  return `${formatTanggal(`${tanggal}T12:00:00+07:00`)} · ${jamTitik(jamMulai)}–${jamTitik(jamSelesai)} WIB`
}

/** "Baru saja", "5 menit lalu", "3 jam lalu", "Kemarin", lalu "2 Nov 2026". */
export function formatRelatif(d: Date | string | number, sekarang = Date.now()) {
  const detik = Math.max(0, (sekarang - toDate(d).getTime()) / 1000)
  if (detik < 60) return "Baru saja"
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  if (detik < 2 * 86400) return "Kemarin"
  if (detik < 7 * 86400) return `${Math.floor(detik / 86400)} hari lalu`
  return formatTanggalPendek(d)
}
