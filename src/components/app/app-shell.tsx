import { Link, useLocation } from "@tanstack/react-router"
import { Bell, LogOut, Plus, UserRound } from "lucide-react"
import { AppSidebar, inisial, useKeluar } from "./app-sidebar"
import { usePantauDataBaru } from "./pantau-data-baru"
import { AjakanPasang } from "./pasang-aplikasi"
import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import type { NavItem, Peran } from "./nav"
import { LABEL_PERAN, NAV, SISWA_AKSI_UTAMA, SISWA_BOTTOM_NAV, isNavActive } from "./nav"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type ShellUser = { nama: string; role: Peran; keterangan?: string; email?: string | null }

function flatNav(peran: Peran) {
  return NAV[peran].flatMap((g) => g.items)
}

/** Jumlah item belum dibaca per menu (mis. { "/siswa/pengaduan": 2 }). */
export type Lencana = Partial<Record<NavItem["to"], number>>

export function AppShell({ user, children, lencana }: { user: ShellUser; children: React.ReactNode; lencana?: Lencana }) {
  const { pathname } = useLocation()
  const all = flatNav(user.role)
  const current = all.find((i) => isNavActive(pathname, i, all))
  const isSiswa = user.role === "siswa"

  // Halaman percakapan dicek lebih sering supaya balasan terasa langsung muncul.
  const diChat = /\/pengaduan\/BK-/i.test(pathname)
  usePantauDataBaru(user.role !== "admin", diChat ? 5_000 : 15_000)

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4.5rem" } as React.CSSProperties}>
      <AppSidebar user={user} lencana={lencana} />

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-6">
          <SidebarTrigger className={cn("-ml-1", isSiswa && "max-md:hidden")} aria-label="Buka/tutup menu" />
          <span aria-hidden className={cn("mr-1 h-5 w-px bg-border", isSiswa && "max-md:hidden")} />
          <Logo subtitle={false} className={cn("md:hidden", !isSiswa && "hidden")} />
          <span className={cn("truncate text-sm font-medium", isSiswa && "max-md:hidden")}>
            {current?.title ?? (pathname === "/profil" ? "Profil" : LABEL_PERAN[user.role])}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotifikasiPopover />
            {/* Di desktop menu akun ada di kartu bawah sidebar */}
            <div className="md:hidden">
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        <main className={cn("flex-1 px-4 py-6 md:px-8 md:py-8", isSiswa && "pb-28 md:pb-8")}>
          {(pathname === "/siswa" || pathname === "/guru") && <AjakanPasang />}
          {children}
        </main>
      </SidebarInset>

      {isSiswa && <SiswaBottomNav pathname={pathname} lencana={lencana} />}
    </SidebarProvider>
  )
}

function NotifikasiPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifikasi">
          <Bell />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifikasi</div>
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>Belum ada notifikasi</EmptyTitle>
            <EmptyDescription>Tanggapan dan pengingat jadwal akan muncul di sini.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PopoverContent>
    </Popover>
  )
}

function UserMenu({ user }: { user: ShellUser }) {
  const keluar = useKeluar()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 md:px-2" aria-label="Menu akun">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {inisial(user.nama)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight lg:grid">
            <span className="text-sm font-medium">{user.nama}</span>
            <span className="text-xs text-muted-foreground">{user.keterangan ?? LABEL_PERAN[user.role]}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid">
          <span>{user.nama}</span>
          <span className="text-xs font-normal text-muted-foreground">{LABEL_PERAN[user.role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profil">
            <UserRound /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={keluar}>
          <LogOut /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SiswaBottomNav({ pathname, lencana }: { pathname: string; lencana?: Lencana }) {
  const [a, b, c, d] = SISWA_BOTTOM_NAV
  const all = SISWA_BOTTOM_NAV
  const item = (it: NavItem) => {
    const active = isNavActive(pathname, it, all) && pathname !== SISWA_AKSI_UTAMA.to
    const n = lencana?.[it.to] ?? 0
    return (
      <Link
        key={it.to}
        to={it.to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active && "text-primary"
        )}
      >
        <span className="relative">
          <it.icon className="size-5" aria-hidden />
          {n > 0 && <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-background" aria-hidden />}
        </span>
        {it.title}
        {n > 0 && <span className="sr-only">, {n} balasan baru</span>}
      </Link>
    )
  }
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center px-2">
        {item(a)}
        {item(b)}
        <div className="flex flex-1 justify-center">
          <Link
            to={SISWA_AKSI_UTAMA.to}
            aria-label={SISWA_AKSI_UTAMA.title}
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform outline-none focus-visible:ring-ring active:scale-95"
          >
            <Plus className="size-6" aria-hidden />
          </Link>
        </div>
        {item(c)}
        {item(d)}
      </div>
    </nav>
  )
}
