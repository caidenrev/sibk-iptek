import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/app/app-shell"
import { Terlarang } from "@/components/app/terlarang"
import { wajibPeran } from "@/lib/guard"

export const Route = createFileRoute("/siswa")({
  beforeLoad: ({ context, location }) => wajibPeran(context, location, "siswa"),
  component: Layout,
})

function Layout() {
  const { user, terlarang } = Route.useRouteContext()
  if (terlarang) return <Terlarang peran={user.role} />
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}
