import { Link, useLocation, useRouter } from "@tanstack/react-router"
import { logoutFn } from "@/server/functions/auth"
import { Bell, LogOut, Plus, UserRound } from "lucide-react"
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type ShellUser = { nama: string; role: Peran; keterangan?: string }

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")
}

function flatNav(peran: Peran) {
  return NAV[peran].flatMap((g) => g.items)
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const all = flatNav(user.role)
  const current = all.find((i) => isNavActive(pathname, i, all))
  const isSiswa = user.role === "siswa"

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
          <Link to={NAV[user.role][0].items[0].to} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <Logo className="group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {NAV[user.role].map((group, gi) => (
            <SidebarGroup key={gi}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isNavActive(pathname, item, all)} tooltip={item.title}>
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/profil"} tooltip="Profil">
                <Link to="/profil">
                  <UserRound />
                  <span>Profil</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

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
            <UserMenu user={user} />
          </div>
        </header>

        <main className={cn("flex-1 px-4 py-6 md:px-8 md:py-8", isSiswa && "pb-28 md:pb-8")}>
          {children}
        </main>
      </SidebarInset>

      {isSiswa && <SiswaBottomNav pathname={pathname} />}
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

function useKeluar() {
  const router = useRouter()
  return async () => {
    try {
      await logoutFn()
    } finally {
      await router.navigate({ to: "/login" })
    }
  }
}

function SiswaBottomNav({ pathname }: { pathname: string }) {
  const [a, b, c, d] = SISWA_BOTTOM_NAV
  const all = SISWA_BOTTOM_NAV
  const item = (it: NavItem) => {
    const active = isNavActive(pathname, it, all) && pathname !== SISWA_AKSI_UTAMA.to
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
        <it.icon className="size-5" aria-hidden />
        {it.title}
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
