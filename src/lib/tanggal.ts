import { addDays, format, parseISO, startOfISOWeek } from "date-fns"

// Tanggal kalender ("YYYY-MM-DD") menurut WIB, tidak bergantung zona waktu perangkat.
const wib = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" })

export const hariIniWib = () => wib.format(new Date())
export const geserTanggal = (t: string, hari: number) => format(addDays(parseISO(t), hari), "yyyy-MM-dd")
export const seninDari = (t: string) => format(startOfISOWeek(parseISO(t)), "yyyy-MM-dd")
/** 1 = Senin … 7 = Minggu */
export const hariIso = (t: string) => ((parseISO(t).getDay() + 6) % 7) + 1

export const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const

/** Sama dengan perhitungan di server (tambahSlotFn), untuk pratinjau sebelum disimpan. */
export function tanggalSlotBerulang(mulai: string, hari: Array<number>, minggu: number) {
  if (minggu === 0) return [mulai]
  const senin = seninDari(mulai)
  const hasil: Array<string> = []
  for (let m = 0; m < minggu; m++) {
    for (const h of [...new Set(hari)].sort()) {
      const t = geserTanggal(senin, m * 7 + h - 1)
      if (t >= mulai) hasil.push(t)
    }
  }
  return hasil
}
