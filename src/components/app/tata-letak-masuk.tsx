import { Link } from "@tanstack/react-router"
import { DekorasiDaun } from "./dekorasi-daun"
import { Logo, LogoMark } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"

/**
 * Tata letak halaman sebelum masuk aplikasi (masuk, lupa password, ganti password).
 *
 * - HP/tablet: bagian atas berhias daun + logo besar, lalu form di lembar putih bersudut bulat.
 * - Desktop (lg): `split` = panel teal di kiri + kartu form (halaman masuk);
 *   `kartu` = logo di atas kartu form di tengah layar.
 */
export function TataLetakMasuk({
  varian = "kartu",
  judul,
  deskripsi,
  ikon,
  children,
  bawah,
}: {
  varian?: "split" | "kartu"
  judul: React.ReactNode
  deskripsi?: React.ReactNode
  /** Ikon kecil di atas judul (hanya desktop) */
  ikon?: React.ReactNode
  children: React.ReactNode
  /** Tautan/aksi di bawah form */
  bawah?: React.ReactNode
}) {
  const split = varian === "split"
  return (
    <div className={cn("flex min-h-svh flex-col", split && "lg:grid lg:grid-cols-2")}>
      {split && <PanelMerek />}

      <div className={cn("relative flex flex-1 flex-col", !split && "lg:items-center lg:justify-center lg:gap-6 lg:px-4 lg:py-10")}>
        {/* Bagian atas berhias (HP/tablet) */}
        <header className="relative flex h-[clamp(15rem,36svh,19rem)] shrink-0 items-center justify-center overflow-hidden bg-secondary lg:hidden">
          <DekorasiDaun />
          <div className="absolute top-3 right-3">
            <ThemeToggle />
          </div>
          <Link to="/" aria-label="Beranda SIBK" className="relative -mt-6 grid justify-items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <LogoMark className="size-16 drop-shadow-sm" />
            <span className="text-3xl leading-none font-extrabold tracking-wide text-logo-teks">SIBK</span>
            <span className="text-sm text-muted-foreground">Bimbingan & Konseling · SMK IPTEK</span>
          </Link>
        </header>

        {/* Bilah atas desktop */}
        {split ? (
          <div className="hidden items-center justify-end p-6 lg:flex">
            <ThemeToggle />
          </div>
        ) : (
          <Link to="/" aria-label="Beranda SIBK" className="hidden lg:block">
            <Logo />
          </Link>
        )}

        <div className={cn("flex flex-1 flex-col", split ? "lg:items-center lg:justify-center lg:px-4 lg:pb-16" : "lg:w-full lg:flex-none lg:items-center")}>
          <main
            className={cn(
              // HP: lembar putih yang menutupi bagian bawah hiasan
              "relative z-10 -mt-7 flex flex-1 flex-col rounded-t-[1.75rem] bg-card px-6 pt-8 pb-8 shadow-[0_-10px_30px_-12px] shadow-foreground/10",
              // Desktop: kartu biasa; ikon di dalam kolom input disembunyikan supaya sama seperti sebelumnya
              "lg:mt-0 lg:w-full lg:max-w-sm lg:flex-none lg:rounded-xl lg:border lg:px-6 lg:py-6 lg:shadow-sm lg:[&_[data-awalan]]:hidden"
            )}
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6 grid gap-1.5 text-center lg:text-left">
                {ikon && (
                  <span className="mb-1 hidden size-10 items-center justify-center rounded-xl bg-primary/10 text-primary lg:flex">{ikon}</span>
                )}
                <h1 className="text-2xl font-semibold tracking-tight lg:text-xl">{judul}</h1>
                {deskripsi && <p className="text-sm text-balance text-muted-foreground lg:text-wrap">{deskripsi}</p>}
              </div>
              {children}
              {bawah && <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground lg:hidden">{bawah}</div>}
            </div>
          </main>
          {/* Pada varian split, isi "bawah" sudah diwakili panel merek di kiri. */}
          {bawah && !split && <div className="hidden text-center text-sm text-muted-foreground lg:mt-6 lg:block">{bawah}</div>}
        </div>
      </div>
    </div>
  )
}

/** Panel teal di kiri halaman masuk (desktop). */
function PanelMerek() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex dark:bg-secondary dark:text-secondary-foreground">
      <div className="absolute -top-24 -right-24 size-96 rounded-full bg-current opacity-5" aria-hidden />
      <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-current opacity-5" aria-hidden />
      <Link to="/" className="relative w-fit">
        <span className="flex items-center gap-2.5">
          <LogoMark warna="terbalik" className="size-9" />
          <span className="font-extrabold tracking-wide">SIBK · SMK IPTEK</span>
        </span>
      </Link>
      <div className="relative max-w-md">
        <p className="text-3xl leading-snug font-bold text-balance">Ruang aman untuk bercerita.</p>
        <p className="mt-3 opacity-85">
          Identitasmu bisa tetap rahasia. Guru BK hanya melihat nama samaran saat kamu memilih mode anonim.
        </p>
      </div>
      <p className="relative text-sm opacity-75">Bimbingan & Konseling SMK IPTEK Tangerang Selatan</p>
    </aside>
  )
}
