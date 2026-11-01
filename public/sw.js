// Service worker SIBK.
// Sengaja minimal: TIDAK menyimpan halaman atau data apa pun (pengaduan bersifat rahasia dan selalu
// diambil langsung dari server). Satu-satunya yang disimpan adalah halaman "sedang offline".
const CACHE = "sibk-v2"
const OFFLINE = "/offline.html"

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)))
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nama) => Promise.all(nama.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      // Simpan ulang halaman offline, berjaga-jaga kalau cache sempat dibersihkan.
      .then(() => caches.open(CACHE).then((c) => c.add(OFFLINE)))
      .catch(() => {})
      .then(() => self.clients.claim())
  )
})

// Hanya perpindahan halaman yang ditangani: coba internet dulu, kalau gagal tampilkan halaman offline.
// Permintaan lain (data, gambar, lampiran) tidak disentuh sama sekali.
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return
  e.respondWith(
    fetch(e.request).catch(async () => {
      const halaman = await caches.match(OFFLINE)
      return halaman ?? new Response("Kamu sedang offline. Periksa internet, lalu coba lagi.", { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    })
  )
})
