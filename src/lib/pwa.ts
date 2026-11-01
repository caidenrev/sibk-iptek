import { useSyncExternalStore } from "react"

// Status "bisa dipasang sebagai aplikasi" (PWA).
// - "bisa"     : Chrome/Edge (Android, laptop) sudah memberi izin; tombol Pasang memunculkan dialog browser.
// - "ios"      : iPhone/iPad. Safari tidak punya dialog pasang, jadi kita tampilkan petunjuk manual.
// - "terpasang": sedang dibuka sebagai aplikasi, atau baru saja dipasang.
// - "tidak"    : browser tidak mendukung (mis. Firefox desktop) atau pengguna baru saja menolak.
export type StatusPasang = "bisa" | "ios" | "terpasang" | "tidak"

type PromptPasang = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let status: StatusPasang = "tidak"
let promptTertunda: PromptPasang | null = null
const pendengar = new Set<() => void>()

function ubah(s: StatusPasang) {
  status = s
  pendengar.forEach((f) => f())
}

// Dijalankan sekali saat modul dimuat di browser: event "beforeinstallprompt" bisa datang
// sebelum komponen mana pun sempat dipasang, jadi pendengarnya harus siap sejak awal.
if (typeof window !== "undefined") {
  const mandiri = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
  const perangkatApple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  status = mandiri ? "terpasang" : perangkatApple ? "ios" : "tidak"

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    promptTertunda = e as PromptPasang
    ubah("bisa")
  })
  window.addEventListener("appinstalled", () => {
    promptTertunda = null
    ubah("terpasang")
  })

  if ("serviceWorker" in navigator) {
    // Modul ini bisa baru jalan setelah event "load" lewat (hidrasi), jadi cek dulu.
    const daftar = () => void navigator.serviceWorker.register("/sw.js").catch(() => {})
    if (document.readyState === "complete") daftar()
    else window.addEventListener("load", daftar, { once: true })
  }
}

export function useStatusPasang(): StatusPasang {
  return useSyncExternalStore(
    (f) => {
      pendengar.add(f)
      return () => pendengar.delete(f)
    },
    () => status,
    () => "tidak"
  )
}

/** Munculkan dialog pasang dari browser. Mengembalikan true bila pengguna menyetujui. */
export async function pasangAplikasi() {
  const p = promptTertunda
  if (!p) return false
  promptTertunda = null
  await p.prompt()
  const { outcome } = await p.userChoice
  ubah(outcome === "accepted" ? "terpasang" : "tidak")
  return outcome === "accepted"
}
