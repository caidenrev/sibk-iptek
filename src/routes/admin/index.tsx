import { Link, createFileRoute } from "@tanstack/react-router"
import { BellRing, GraduationCap, School, Users } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ringkasanAdminFn } from "@/server/functions/master"

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard Admin · SIBK" }] }),
  loader: () => ringkasanAdminFn(),
  component: DashboardAdmin,
})

// Kesehatan notifikasi masih contoh — diisi dari tabel notifikasi di Sprint 3.
const NOTIF = { terkirim: 184, gagal: 3 }

function DashboardAdmin() {
  const r = Route.useLoaderData()
  const STAT = [
    { label: "Siswa aktif", nilai: r.siswa, icon: GraduationCap, to: "/admin/siswa" as const },
    { label: "Kelas", nilai: r.kelas, icon: School, to: "/admin/kelas" as const },
    { label: "Guru BK aktif", nilai: r.guru, icon: Users, to: "/admin/guru" as const },
  ]
  const total = NOTIF.terkirim + NOTIF.gagal
  const persen = Math.round((NOTIF.terkirim / total) * 100)
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" description="Ringkasan sistem" />

      <div className="grid gap-3 sm:grid-cols-3">
        {STAT.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <Card className="gap-2 py-4 transition-colors hover:bg-muted/40">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-2">
                  <s.icon className="size-4" aria-hidden />
                  {s.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <p className="tabular text-3xl font-bold">{s.nilai}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" aria-hidden /> Kesehatan notifikasi
          </CardTitle>
          <CardDescription>Contoh tampilan · aktif setelah Sprint 3</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/notifikasi">Buka log</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Berhasil terkirim</span>
            <span className="tabular font-semibold">{persen}%</span>
          </div>
          <Progress value={persen} aria-label="Persentase notifikasi terkirim" />
          <div className="flex flex-wrap gap-2 text-sm">
            <StatusBadge status="terkirim" />
            <span className="tabular">{NOTIF.terkirim}</span>
            <span className="text-muted-foreground">·</span>
            <StatusBadge status="gagal" />
            <span className="tabular">{NOTIF.gagal}</span>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        Admin hanya melihat angka agregat. Isi pengaduan dan catatan konseling tidak bisa dibuka dari akun admin.
      </p>
    </div>
  )
}
