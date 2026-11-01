import { Link, useLocation, useRouter } from "@tanstack/react-router"
import { ChevronDown, LogOut, MoreHorizontal, Search, UserRound, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { LogoMark } from "./logo"
import type { NavChild, NavItem, Peran } from "./nav"
import { NAV, isNavActive } from "./nav"
import type { Lencana, ShellUser } from "./app-shell"
import { logoutFn } from "@/server/functions/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

// Ukuran baris menu: 44px di HP (target sentuh), 40px di desktop, kotak 40px saat sidebar diciutkan.
const BARIS =
  "h-11 gap-3 rounded-lg px-3 md:h-10 [&_svg]:size-[18px]! group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"

export function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("")
}

export function useKeluar() {
  const router = useRouter()
  return async () => {
    try {
      await logoutFn()
    } finally {
      await router.navigate({ to: "/login" })
    }
  }
}

type HasilCari = { kunci: string; title: string; induk?: string; item: NavItem; child?: NavChild }

export function AppSidebar({ user, lencana }: { user: ShellUser; lencana?: Lencana }) {
  const { pathname, search } = useLocation()
  const router = useRouter()
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar()
  const ciut = state === "collapsed" && !isMobile
  const grup = NAV[user.role]
  const semua = grup.flatMap((g) => g.items)

  const [cari, setCari] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const q = cari.trim().toLowerCase()
  const hasil: Array<HasilCari> = q
    ? semua
        .flatMap((item): Array<HasilCari> => [
          { kunci: item.to, title: item.title, item },
          ...(item.children ?? []).map((c) => ({ kunci: item.to + c.title, title: c.title, induk: item.title, item, child: c })),
        ])
        .filter((h) => h.title.toLowerCase().includes(q) || h.induk?.toLowerCase().includes(q))
    : []

  // Setelah pindah halaman: kosongkan pencarian dan tutup sheet di HP.
  useEffect(() => {
    setCari("")
    setOpenMobile(false)
  }, [pathname, search, setOpenMobile])

  function bukaCari() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 220)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-6 px-4 pt-6 pb-0">
        <Link
          to={grup[0].items[0].to}
          className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          {/* Simbol versi terbalik di atas ubin teal, sama seperti ikon aplikasi */}
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#007373]">
            <LogoMark warna="terbalik" className="size-6" />
          </span>
          <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-extrabold tracking-wide text-logo-teks">SIBK</span>
            <span className="truncate text-xs text-muted-foreground">SMK IPTEK Tangsel</span>
          </span>
        </Link>

        {ciut ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Cari menu" className={BARIS} onClick={bukaCari}>
                <Search />
                <span className="sr-only">Cari menu</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCari("")
                if (e.key === "Enter" && hasil[0]) {
                  e.preventDefault()
                  const h = hasil[0]
                  router.navigate({ to: h.item.to, search: h.child?.search as never })
                }
              }}
              placeholder="Cari menu"
              aria-label="Cari menu"
              className="h-11 w-full rounded-lg border border-sidebar-border bg-background pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-sidebar-ring focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {cari && (
              <button
                type="button"
                onClick={() => {
                  setCari("")
                  inputRef.current?.focus()
                }}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:size-8"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-6 pt-6 pb-8">
        {q ? (
          <SidebarGroup className="px-4 py-0">
            <SidebarGroupLabel className="h-auto px-0 pb-2">Hasil pencarian</SidebarGroupLabel>
            <SidebarGroupContent>
              {hasil.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">Tidak ada menu bernama "{cari.trim()}".</p>
              ) : (
                <SidebarMenu className="gap-1">
                  {hasil.map((h) => (
                    <SidebarMenuItem key={h.kunci}>
                      <SidebarMenuButton asChild className={BARIS}>
                        <Link to={h.item.to} search={h.child?.search as never}>
                          <h.item.icon />
                          <span className="truncate">
                            {h.title}
                            {h.induk && <span className="text-muted-foreground"> · {h.induk}</span>}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          grup.map((g, gi) => (
            <SidebarGroup key={gi} className="px-4 py-0">
              {g.label && <SidebarGroupLabel className="h-auto px-0 pb-2 text-muted-foreground">{g.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {g.items.map((item) => (
                    <ItemMenu
                      key={item.to}
                      item={item}
                      aktif={isNavActive(pathname, item, semua)}
                      tabAktif={(search as Record<string, unknown>).tab as string | undefined}
                      jumlah={lencana?.[item.to] ?? 0}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}

        <SidebarGroup className="mt-auto px-4 py-0">
          <SidebarGroupLabel className="h-auto px-0 pb-2 text-muted-foreground">Akun</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/profil"} tooltip="Profil" className={BARIS}>
                  <Link to="/profil">
                    <UserRound />
                    <span className="group-data-[collapsible=icon]:hidden">Profil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-0">
        <KartuPengguna user={user} ciut={ciut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function ItemMenu({ item, aktif, tabAktif, jumlah }: { item: NavItem; aktif: boolean; tabAktif?: string; jumlah: number }) {
  const [buka, setBuka] = useState(aktif)
  useEffect(() => {
    if (aktif) setBuka(true)
  }, [aktif])

  const tombol = (
    <SidebarMenuButton asChild isActive={aktif} tooltip={item.title} className={cn(BARIS, item.children && "pr-16")}>
      <Link to={item.to}>
        <span className="relative flex">
          <item.icon />
          {jumlah > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 hidden size-2.5 rounded-full bg-primary ring-2 ring-sidebar group-data-[collapsible=icon]:block"
            />
          )}
        </span>
        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
        {jumlah > 0 && <span className="sr-only">, {jumlah} belum dibaca</span>}
      </Link>
    </SidebarMenuButton>
  )

  const lencana = jumlah > 0 && (
    <SidebarMenuBadge
      aria-hidden
      className={cn(
        "top-3! rounded-md bg-primary md:top-2.5! px-1.5 text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground",
        item.children ? "right-10" : "right-2"
      )}
    >
      {jumlah > 99 ? "99+" : jumlah}
    </SidebarMenuBadge>
  )

  if (!item.children) {
    return (
      <SidebarMenuItem>
        {tombol}
        {lencana}
      </SidebarMenuItem>
    )
  }

  const tabTerpilih = tabAktif ?? item.children[0].search.tab
  return (
    <Collapsible asChild open={buka} onOpenChange={setBuka}>
      <SidebarMenuItem>
        {tombol}
        {lencana}
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            className="top-1! right-1 size-9 rounded-md opacity-100! after:hidden md:size-8 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180"
            aria-label={buka ? `Tutup sub-menu ${item.title}` : `Buka sub-menu ${item.title}`}
          >
            <ChevronDown />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-0 mt-1 ml-[21px] gap-1 border-sidebar-border px-0 py-0 pl-3">
            {item.children.map((c) => (
              <SidebarMenuSubItem key={c.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={aktif && c.search.tab === tabTerpilih}
                  className="h-11 rounded-lg px-3 text-sidebar-foreground/80 data-active:font-medium data-active:text-sidebar-accent-foreground md:h-9"
                >
                  <Link to={item.to} search={c.search as never}>
                    <span>{c.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

const LABEL_SUB: Record<Peran, (u: ShellUser) => string> = {
  siswa: (u) => u.keterangan ?? "Siswa",
  guru_bk: (u) => u.email ?? "Guru BK",
  admin: (u) => u.email ?? "Admin",
}

function KartuPengguna({ user, ciut }: { user: ShellUser; ciut: boolean }) {
  const keluar = useKeluar()
  const sub = LABEL_SUB[user.role](user)
  const avatar = (
    <Avatar className="size-10 shrink-0">
      <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">{inisial(user.nama)}</AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      <div className={cn("flex h-20 items-center gap-3 px-4", ciut && "justify-center px-0")}>
        {ciut ? (
          <DropdownMenuTrigger
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label={`Menu akun ${user.nama}`}
          >
            {avatar}
          </DropdownMenuTrigger>
        ) : (
          <>
            {avatar}
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-semibold">{user.nama}</span>
              <span className="truncate text-xs text-muted-foreground">{sub}</span>
            </div>
            <DropdownMenuTrigger
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:size-9"
              aria-label="Menu akun"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
          </>
        )}
      </div>
      <DropdownMenuContent side={ciut ? "right" : "top"} align="end" className="w-56">
        <DropdownMenuLabel className="grid">
          <span className="truncate">{user.nama}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{sub}</span>
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
