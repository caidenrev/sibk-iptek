import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { lupakanSesi } from "./lib/sesi-klien"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    // Data yang sudah dimuat duluan saat kursor menyentuh menu dipakai langsung saat diklik.
    defaultPreloadStaleTime: 10_000,
    defaultStaleTime: 10_000,
  })

  // invalidate() dipakai setelah data berubah (simpan profil, verifikasi kontak, data baru dari server):
  // sesi ikut dicek ulang supaya nama/status akun di layar tidak basi.
  const invalidateAsli = router.invalidate.bind(router)
  router.invalidate = (opts) => {
    lupakanSesi()
    return invalidateAsli(opts)
  }

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

// Mengaktifkan tipe khusus TanStack Start (server routes, server functions) untuk router ini.
declare module "@tanstack/react-start" {
  interface Register {
    ssr: true
    router: ReturnType<typeof getRouter>
  }
}
