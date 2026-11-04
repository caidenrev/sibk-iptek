import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/app/app-shell"
import { Terlarang } from "@/components/app/terlarang"
import { wajibPeran } from "@/lib/guard"
import { lencanaFn } from "@/server/functions/pengaduan"

export const Route = createFileRoute("/siswa")({
  beforeLoad: ({ context, location }) => wajibPeran(context, location, "siswa"),
  // Jumlah belum dibaca untuk penanda menu. Disegarkan oleh pemantau data baru (AppShell) dan halaman detail.
  loader: async ({ context }) => (context.terlarang ? { pengaduan: 0, jadwal: 0, notif: 0 } : lencanaFn()),
  component: Layout,
})

function Layout() {
  const { user, terlarang } = Route.useRouteContext()
  const l = Route.useLoaderData()
  if (terlarang) return <Terlarang peran={user.role} />
  return (
    <AppShell user={user} lencana={{ "/siswa/pengaduan": l.pengaduan }} notif={l.notif}>
      <Outlet />
    </AppShell>
  )
}
