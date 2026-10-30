/** Ambil pesan yang layak ditampilkan dari error server function. */
export function pesanError(e: unknown, cadangan = "Terjadi kesalahan. Coba lagi."): string {
  if (!(e instanceof Error) || !e.message) return cadangan
  const m = e.message.trim()
  // Error validasi zod dari server dikirim sebagai JSON array issue.
  if (m.startsWith("[")) {
    try {
      const issues = JSON.parse(m) as Array<{ message?: string }>
      if (issues[0]?.message) return issues[0].message
    } catch {
      /* bukan JSON */
    }
  }
  if (/fetch|network|Failed to/i.test(m)) return "Koneksi ke server terputus. Periksa internet lalu coba lagi."
  return m
}
