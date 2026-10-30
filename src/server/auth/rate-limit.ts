import "@tanstack/react-start/server-only"

// Pembatas percobaan login (PRD §5.1): 5 gagal dalam 15 menit → dikunci sampai jendela habis.
// Disimpan di memori proses; cukup untuk satu server Node. Hilang bila server restart.
const MAKS_GAGAL = 5
const JENDELA_MS = 15 * 60 * 1000

type Catatan = { gagal: number; mulai: number }
const store = new Map<string, Catatan>()

function kunci(username: string, ip: string) {
  return `${username.toLowerCase()}|${ip}`
}

/** Sisa menit penguncian, atau 0 bila boleh mencoba. */
export function cekKunci(username: string, ip: string): number {
  const c = store.get(kunci(username, ip))
  if (!c) return 0
  const lewat = Date.now() - c.mulai
  if (lewat > JENDELA_MS) {
    store.delete(kunci(username, ip))
    return 0
  }
  return c.gagal >= MAKS_GAGAL ? Math.ceil((JENDELA_MS - lewat) / 60000) : 0
}

/** Catat kegagalan; mengembalikan sisa percobaan. */
export function catatGagal(username: string, ip: string): number {
  const k = kunci(username, ip)
  const now = Date.now()
  const c = store.get(k)
  if (!c || now - c.mulai > JENDELA_MS) {
    store.set(k, { gagal: 1, mulai: now })
    return MAKS_GAGAL - 1
  }
  c.gagal++
  return Math.max(0, MAKS_GAGAL - c.gagal)
}

export function resetGagal(username: string, ip: string) {
  store.delete(kunci(username, ip))
}

// ---------------------------------------------------------------- pembatas umum

const umum = new Map<string, { n: number; mulai: number }>()

/** Pembatas sederhana: true bila masih boleh (maks `maks` kali per `jendelaMs`). Setiap panggilan dihitung. */
export function bolehAkses(kunciAkses: string, maks: number, jendelaMs: number) {
  const now = Date.now()
  const c = umum.get(kunciAkses)
  if (!c || now - c.mulai > jendelaMs) {
    umum.set(kunciAkses, { n: 1, mulai: now })
    return true
  }
  c.n++
  return c.n <= maks
}

// Bersihkan catatan kedaluwarsa tiap 30 menit agar Map tidak membengkak.
setInterval(() => {
  const now = Date.now()
  for (const [k, c] of store) if (now - c.mulai > JENDELA_MS) store.delete(k)
  for (const [k, c] of umum) if (now - c.mulai > 60 * 60 * 1000) umum.delete(k)
}, 30 * 60 * 1000).unref()
