import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/app/app-shell"
import { Terlarang } from "@/components/app/terlarang"
import { wajibPeran } from "@/lib/guard"
import { lencanaFn } from "@/server/functions/pengaduan"

export const Route = createFileRoute("/guru")({
  beforeLoad: ({ context, location }) => wajibPeran(context, location, "guru_bk"),
  // Jumlah belum dibaca untuk penanda menu; dimuat ulang setiap navigasi.
  loader: async ({ context }) => (context.terlarang ? { pengaduan: 0 } : lencanaFn()),
  staleTime: 0,
  component: Layout,
})

function Layout() {
  const { user, terlarang } = Route.useRouteContext()
  const l = Route.useLoaderData()
  if (terlarang) return <Terlarang peran={user.role} />
  return (
    <AppShell user={user} lencana={{ "/guru/pengaduan": l.pengaduan }}>
      <Outlet />
    </AppShell>
  )
}
