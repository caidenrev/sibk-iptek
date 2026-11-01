import type { LucideIcon } from "lucide-react"
import type { FileRoutesByTo } from "@/routeTree.gen"
import {
  BarChart3,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  FolderKanban,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquareHeart,
  MessagesSquare,
  School,
  Settings2,
  Tags,
  UserRound,
  Users,
} from "lucide-react"

export type Peran = "siswa" | "guru_bk" | "admin"

export const LABEL_PERAN: Record<Peran, string> = {
  siswa: "Siswa",
  guru_bk: "Guru BK",
  admin: "Admin",
}

/** Semua path halaman yang terdaftar — salah ketik path jadi error saat compile. */
export type AppPath = Exclude<keyof FileRoutesByTo, `/api/${string}`>

/** Sub-menu: halaman yang sama dengan induknya, dibedakan lewat search param. */
export type NavChild = { title: string; search: Record<string, string> }

export type NavItem = {
  title: string
  to: AppPath
  icon: LucideIcon
  /** cocokkan path persis (untuk halaman dashboard di root peran) */
  exact?: boolean
  /** anak pertama = tampilan bawaan saat search param kosong */
  children?: Array<NavChild>
}

export type NavGroup = { label?: string; items: Array<NavItem> }

// Menu per peran — docs/DESIGN.md §4
export const NAV: Record<Peran, Array<NavGroup>> = {
  siswa: [
    { items: [{ title: "Beranda", to: "/siswa", icon: Home, exact: true }] },
    {
      label: "Pengaduan",
      items: [
        { title: "Kirim Pengaduan", to: "/siswa/pengaduan/baru", icon: MessageSquareHeart },
        { title: "Pengaduan Saya", to: "/siswa/pengaduan", icon: MessagesSquare },
      ],
    },
    {
      label: "Konseling",
      items: [{ title: "Jadwal Konseling", to: "/siswa/jadwal", icon: CalendarDays }],
    },
  ],
  guru_bk: [
    { items: [{ title: "Dashboard", to: "/guru", icon: LayoutDashboard, exact: true }] },
    {
      label: "Pengaduan",
      items: [
        {
          title: "Pengaduan Masuk",
          to: "/guru/pengaduan",
          icon: Inbox,
          children: [
            { title: "Antrean anonim", search: { tab: "antrean" } },
            { title: "Milik saya", search: { tab: "saya" } },
            { title: "Semua pengaduan", search: { tab: "semua" } },
          ],
        },
      ],
    },
    {
      label: "Konseling",
      items: [
        { title: "Slot Jadwal", to: "/guru/slot", icon: CalendarClock },
        { title: "Pengajuan & Sesi", to: "/guru/jadwal", icon: FolderKanban },
        { title: "Laporan", to: "/guru/laporan", icon: BarChart3 },
      ],
    },
  ],
  admin: [
    {
      items: [{ title: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true }],
    },
    {
      label: "Data master",
      items: [
        { title: "Siswa", to: "/admin/siswa", icon: GraduationCap },
        { title: "Kelas", to: "/admin/kelas", icon: School },
        { title: "Guru BK", to: "/admin/guru", icon: Users },
        { title: "Kategori", to: "/admin/kategori", icon: Tags },
      ],
    },
    {
      label: "Sistem",
      items: [
        { title: "Pengaturan Notifikasi", to: "/admin/pengaturan", icon: Settings2 },
        { title: "Log Notifikasi", to: "/admin/notifikasi", icon: BellRing },
        { title: "Laporan", to: "/admin/laporan", icon: BarChart3 },
      ],
    },
  ],
}

// Bottom navigation siswa di layar HP (4 item + tombol tengah)
export const SISWA_BOTTOM_NAV: Array<NavItem> = [
  { title: "Beranda", to: "/siswa", icon: Home, exact: true },
  { title: "Pengaduan", to: "/siswa/pengaduan", icon: MessagesSquare },
  { title: "Jadwal", to: "/siswa/jadwal", icon: CalendarDays },
  { title: "Profil", to: "/profil", icon: UserRound },
]

export const SISWA_AKSI_UTAMA: NavItem = {
  title: "Kirim pengaduan",
  to: "/siswa/pengaduan/baru",
  icon: CalendarPlus,
}

export function isNavActive(pathname: string, item: NavItem, all: Array<NavItem>) {
  if (item.exact) return pathname === item.to
  if (pathname !== item.to && !pathname.startsWith(item.to + "/")) return false
  // Pilih item dengan path terpanjang yang cocok (mis. /siswa/pengaduan/baru vs /siswa/pengaduan)
  const longer = all.some(
    (o) => o !== item && o.to.length > item.to.length && (pathname === o.to || pathname.startsWith(o.to + "/"))
  )
  return !longer
}
