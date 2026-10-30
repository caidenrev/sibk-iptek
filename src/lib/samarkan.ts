// Menampilkan kontak secara tersamar (mis. di halaman lupa password).

/** rina.aulia@gmail.com → ri******@g****.com (jumlah bintang dibatasi agar tidak membocorkan panjang & tetap rapi) */
export function samarkanEmail(email: string) {
  const [nama, domain = ""] = email.split("@")
  const titik = domain.lastIndexOf(".")
  const host = titik > 0 ? domain.slice(0, titik) : domain
  const tld = titik > 0 ? domain.slice(titik) : ""
  return `${nama.slice(0, 2)}${"*".repeat(Math.min(6, Math.max(3, nama.length - 2)))}@${host.slice(0, 1)}${"*".repeat(Math.min(5, Math.max(3, host.length - 1)))}${tld}`
}

/** 6281234567890 → 0812-****-7890 */
export function samarkanWa(wa: string) {
  const lokal = wa.startsWith("62") ? "0" + wa.slice(2) : wa
  return `${lokal.slice(0, 4)}-****-${lokal.slice(-4)}`
}
