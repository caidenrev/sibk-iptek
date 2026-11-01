import { Link, createFileRoute } from "@tanstack/react-router"
import { Logo, LogoMark } from "@/components/app/logo"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Button } from "@/components/ui/button"
import { BERANDA_PERAN } from "@/lib/peran"
import { cn } from "@/lib/utils"
import { TombolPasang } from "@/components/app/pasang-aplikasi"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SIBK · Bimbingan Konseling SMK IPTEK Tangerang Selatan" },
      {
        name: "description",
        content:
          "Layanan Bimbingan dan Konseling SMK IPTEK Tangerang Selatan secara online: kirim pengaduan ke Guru BK, boleh tanpa nama, dan atur jadwal konseling dengan pengingat otomatis.",
      },
    ],
  }),
  component: Landing,
})

/** Jeda animasi (dibaca oleh kelas .anim-muncul / .anim-mengetik di styles.css). */
const tunda = (ms: number) => ({ "--tunda": `${ms}ms` }) as React.CSSProperties

// Motif identitas: dua gelembung logo. Gelembung siswa = teal tua (primary),
// gelembung Guru BK = teal muda (--logo-2). Dipakai di hero dan bagian "Cara kerjanya".

function Landing() {
  const { user } = Route.useRouteContext()
  const tujuanMasuk = user ? BERANDA_PERAN[user.role] : "/login"
  const labelMasuk = user ? "Buka beranda saya" : "Masuk dengan NIS"

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" className="flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Logo />
          </Link>
          <nav aria-label="Bagian halaman" className="hidden items-center gap-6 text-sm md:flex">
            <a href="#tujuan" className="text-muted-foreground hover:text-foreground">
              Tujuan
            </a>
            <a href="#cara-kerja" className="text-muted-foreground hover:text-foreground">
              Cara kerja
            </a>
            <a href="#kerahasiaan" className="text-muted-foreground hover:text-foreground">
              Kerahasiaan
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild size="lg" className="h-11 md:h-10">
              <Link to={tujuanMasuk}>{user ? "Beranda" : "Masuk"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------------------------------------------------------- hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-20 md:grid-cols-[1.1fr_1fr] md:items-center md:px-8 md:pt-20 md:pb-28">
          <div>
            <h1 className="anim-muncul text-4xl leading-[1.08] font-extrabold tracking-tight text-balance md:text-[3.4rem]">
              Ruang aman untuk bercerita.
            </h1>
            <p className="anim-muncul mt-5 max-w-xl text-lg text-pretty text-muted-foreground" style={tunda(90)}>
              SIBK adalah layanan Bimbingan dan Konseling SMK IPTEK Tangerang Selatan yang bisa kamu buka dari HP.
              Ceritakan masalahmu ke Guru BK, boleh tanpa menyebut nama, lalu atur jadwal kalau ingin bertemu
              langsung.
            </p>
            <div className="anim-muncul mt-8 flex flex-wrap gap-3" style={tunda(180)}>
              <Button asChild size="lg" className="h-11 px-5 text-base">
                <Link to={tujuanMasuk}>{labelMasuk}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-base">
                <a href="#cara-kerja">Lihat cara kerjanya</a>
              </Button>
              <TombolPasang variant="ghost" className="h-11 px-4 text-base text-primary" />
            </div>
            {!user && (
              <p className="anim-muncul mt-4 text-sm text-muted-foreground" style={tunda(260)}>
                Akun dibuat oleh sekolah. Belum punya? Tanyakan ke Guru BK atau wali kelasmu.
              </p>
            )}
          </div>

          <PratinjauAnonim />
        </section>

        {/* ---------------------------------------------------------- tujuan */}
        <section id="tujuan" className="scroll-mt-20 border-y bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[0.8fr_1.2fr] md:px-8 md:py-24">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">Kenapa SIBK dibuat</h2>
              <p className="mt-3 text-muted-foreground text-pretty">
                Banyak siswa memendam masalah karena takut identitasnya diketahui orang lain. Di sisi lain, jadwal
                konseling masih disepakati secara lisan, catatan Guru BK tersimpan di buku, dan keluhan baru bisa
                disampaikan kalau siswa datang ke ruang BK. Ini jawaban SIBK untuk keempatnya.
              </p>
            </div>
            <ol className="divide-y rounded-2xl border bg-card">
              {TUJUAN.map((t, i) => (
                <li key={t.dulu} className="anim-gulir grid gap-1 p-5 sm:grid-cols-[2rem_1fr] sm:gap-x-4">
                  <span className="tabular text-sm font-semibold text-primary" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.dulu}</p>
                    <p className="mt-1 font-medium">{t.kini}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- cara kerja */}
        <section id="cara-kerja" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Cara kerjanya</h2>
            <p className="mt-3 text-muted-foreground">
              Dari cerita pertama sampai bertemu langsung. Gelembung tua adalah siswa, gelembung muda adalah Guru BK,
              sama seperti logo SIBK.
            </p>
          </div>

          <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
            {LANGKAH.map((l, i) => (
              <div key={l.judul} className={cn("anim-gulir flex flex-col gap-3", l.dari === "guru" && "lg:mt-16")}>
                <Gelembung dari={l.dari}>{l.pesan}</Gelembung>
                <div className={cn("max-w-md", l.dari === "guru" && "self-end text-right")}>
                  <h3 className="font-semibold">
                    <span className="tabular mr-2 text-muted-foreground">{i + 1}.</span>
                    {l.judul}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{l.isi}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs text-muted-foreground">Isi gelembung di atas adalah contoh percakapan.</p>
        </section>

        {/* ---------------------------------------------------------- untuk siapa */}
        <section className="border-t">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl bg-primary p-7 text-primary-foreground md:p-9">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Untuk siswa</h2>
              <ul className="mt-5 grid gap-3 text-[15px] leading-relaxed opacity-95">
                <li>Kirim pengaduan kapan saja, dengan nama atau anonim, dan simpan kode tiketnya.</li>
                <li>Baca dan balas tanggapan Guru BK dari HP.</li>
                <li>Ajukan jadwal konseling tatap muka sesuai slot kosong Guru BK.</li>
                <li>Terima pengingat lewat WhatsApp dan email.</li>
                <li>Lupa password? Atur ulang sendiri dengan kode yang dikirim ke email atau WhatsApp-mu.</li>
              </ul>
            </div>
            <div className="grid gap-6">
              <div className="rounded-2xl border bg-card p-7">
                <h2 className="text-xl font-bold tracking-tight">Untuk Guru BK</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Menanggapi pengaduan, mengatur slot jadwal, menyetujui atau menolak pengajuan, mencatat hasil
                  konseling, dan mencetak laporan per kategori dan periode.
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-7">
                <h2 className="text-xl font-bold tracking-tight">Untuk admin sekolah</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Mengelola data siswa, kelas, dan Guru BK (termasuk import dari Excel) serta pengaturan notifikasi.
                  Admin hanya melihat angka rekap, bukan isi pengaduan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- kerahasiaan */}
        <section id="kerahasiaan" className="scroll-mt-20 border-t bg-muted/40">
          <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
            <LogoMark className="size-10" />
            <h2 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl">Soal kerahasiaan</h2>
            <div className="mt-6 grid gap-5 text-pretty">
              <p>
                Saat kamu memilih <strong className="font-semibold">anonim</strong>, Guru BK hanya melihat nama samaran
                dan kode tiket. Nama, NIS, dan kelasmu tidak ditampilkan. Sistem tetap tahu pengaduan itu milikmu
                (disimpan terenkripsi) supaya kamu bisa membaca balasan dan menerima notifikasi.
              </p>
              <p>
                Identitasmu baru terlihat kalau kamu sendiri memilih membukanya, misalnya saat ingin bertemu Guru BK
                secara langsung. Sebelum itu, SIBK akan menanyakannya dulu kepadamu.
              </p>
              <p className="rounded-xl border bg-card p-4 text-sm">
                SIBK bukan layanan darurat dan tidak memberi diagnosis. Kalau kamu atau temanmu dalam bahaya, temui Guru
                BK, wali kelas, atau orang dewasa yang kamu percaya sekarang juga.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- penutup */}
        <section className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-xl font-semibold text-balance md:text-2xl">
            {user ? `Halo, ${user.nama.split(" ")[0]}. Lanjutkan dari berandamu.` : "Sudah punya akun dari sekolah?"}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="h-11 px-5 text-base">
              <Link to={tujuanMasuk}>{labelMasuk}</Link>
            </Button>
            {!user && (
              <Link
                to="/lupa-password"
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Lupa password?
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:justify-between md:px-8">
          <span>Bimbingan dan Konseling · SMK IPTEK Tangerang Selatan</span>
          <span>Dikembangkan untuk penelitian skripsi Teknik Informatika, Universitas Pamulang.</span>
        </div>
      </footer>
    </div>
  )
}

// Empat masalah dari Identifikasi Masalah (proposal 1.2) dan jawaban SIBK.
const TUJUAN = [
  {
    dulu: "Siswa takut identitasnya terekspos saat menyampaikan keluhan.",
    kini: "Pengaduan bisa dikirim anonim; Guru BK hanya melihat nama samaran.",
  },
  {
    dulu: "Jadwal konseling disepakati lisan dan mudah terlupa.",
    kini: "Jadwal dipilih dari slot Guru BK, lalu ada pengingat sehari dan satu jam sebelumnya.",
  },
  {
    dulu: "Catatan layanan BK ditulis di buku dan sulit direkap.",
    kini: "Tanggapan dan catatan konseling tersimpan rapi, laporan bisa dicetak per periode.",
  },
  {
    dulu: "Keluhan hanya bisa disampaikan dengan datang ke ruang BK.",
    kini: "Siswa bisa bercerita dari HP, kapan saja, tanpa harus mengantre di depan ruang BK.",
  },
]

const LANGKAH: Array<{ dari: "siswa" | "guru"; pesan: string; judul: string; isi: string }> = [
  {
    dari: "siswa",
    pesan: "Aku mau cerita soal masalah di kelas, tapi jangan sampai namaku ketahuan.",
    judul: "Tulis pengaduan",
    isi: "Pilih kategori dan mode anonim atau dengan nama. Kamu langsung dapat kode tiket untuk melacaknya.",
  },
  {
    dari: "guru",
    pesan: "Terima kasih sudah bercerita. Kamu bisa membalas di sini kapan pun kamu siap.",
    judul: "Guru BK menanggapi",
    isi: "Balasan masuk ke riwayat pengaduanmu, dan kamu mendapat notifikasi.",
  },
  {
    dari: "siswa",
    pesan: "Boleh ketemu langsung minggu ini?",
    judul: "Atur jadwal konseling",
    isi: "Pilih tanggal dan jam dari slot yang dibuka Guru BK, lalu tunggu persetujuannya.",
  },
  {
    dari: "guru",
    pesan: "Pengingat: konseling besok pukul 10.00 di Ruang BK.",
    judul: "Pengingat otomatis",
    isi: "Konfirmasi dan pengingat sehari serta satu jam sebelum sesi dikirim lewat WhatsApp dan email.",
  },
]

/** Gelembung percakapan dengan warna logo: siswa kiri (teal tua), Guru BK kanan (teal muda). */
function Gelembung({ dari, children }: { dari: "siswa" | "guru"; children: React.ReactNode }) {
  const siswa = dari === "siswa"
  return (
    <figure className={cn("flex max-w-md items-end gap-2.5", !siswa && "flex-row-reverse self-end")}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          siswa ? "bg-primary/15 text-primary" : "bg-logo-2/25 text-foreground"
        )}
        aria-hidden
      >
        {siswa ? "S" : "BK"}
      </span>
      <blockquote
        className={cn(
          "rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          siswa ? "rounded-bl-sm bg-primary text-primary-foreground" : "rounded-br-sm bg-logo-2 text-[#0f2a2e]"
        )}
      >
        <span className="sr-only">{siswa ? "Siswa: " : "Guru BK: "}</span>
        {children}
      </blockquote>
    </figure>
  )
}

/** Indikator "Guru BK sedang mengetik": tiga titik berdenyut dua kali, lalu hilang (lihat .anim-mengetik). */
function SedangMengetik() {
  return (
    <figure className="flex max-w-md flex-row-reverse items-end gap-2.5 self-end">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-logo-2/25 text-[11px] font-bold text-foreground">
        BK
      </span>
      <span className="flex items-center gap-1 rounded-2xl rounded-br-sm bg-logo-2 px-4 py-3.5">
        {[0, 140, 280].map((ms) => (
          <span
            key={ms}
            className="titik size-1.5 rounded-full bg-[#0f2a2e]"
            style={{ "--urut": `${ms}ms` } as React.CSSProperties}
          />
        ))}
      </span>
    </figure>
  )
}

/** Kartu: yang dilihat Guru BK saat pengaduan dikirim anonim (fitur inti SIBK). */
function PratinjauAnonim() {
  return (
    <div className="anim-muncul mx-auto w-full max-w-sm" style={tunda(200)}>
      <p className="mb-3 text-sm font-medium text-muted-foreground">Yang dilihat Guru BK saat kamu memilih anonim</p>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div className="leading-tight">
            <p className="font-semibold">Siswa Teal-42</p>
            <p className="font-mono text-xs tracking-wider text-muted-foreground">BK-7F3K9Q</p>
          </div>
          <span className="ml-auto rounded-md bg-anon/10 px-2 py-0.5 text-xs font-medium text-anon dark:bg-anon/20">
            Anonim
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
          {["Nama", "NIS", "Kelas"].map((k) => (
            <div key={k} className="rounded-lg bg-muted px-2 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-medium">Disembunyikan</dd>
            </div>
          ))}
        </dl>
        {/* Obrolan berjalan: pesan siswa → "sedang mengetik" → balasan Guru BK (sekali saat halaman dibuka). */}
        <div className="mt-4 grid gap-2">
          <div className="anim-muncul flex flex-col" style={tunda(700)}>
            <Gelembung dari="siswa">Aku sering diejek di kelas dan tidak tahu harus cerita ke siapa.</Gelembung>
          </div>
          <div className="grid [grid-template-areas:'sel']">
            <div className="anim-mengetik flex flex-col [grid-area:sel]" style={tunda(1300)} aria-hidden>
              <SedangMengetik />
            </div>
            <div className="anim-muncul flex flex-col [grid-area:sel]" style={tunda(2300)}>
              <Gelembung dari="guru">Terima kasih sudah cerita. Kita cari jalan keluarnya bersama ya.</Gelembung>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Contoh tampilan. Nama samaran dan kode tiket dibuat otomatis.</p>
    </div>
  )
}
