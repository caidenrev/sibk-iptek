import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { getSesiFn } from "@/server/functions/auth"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  // User yang sedang login tersedia di context semua rute (null bila belum login).
  beforeLoad: async () => ({ user: await getSesiFn() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SIBK · SMK IPTEK Tangerang Selatan" },
      {
        name: "description",
        content: "Sistem Informasi Bimbingan Konseling SMK IPTEK Tangerang Selatan.",
      },
      { name: "theme-color", content: "#007373" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Alamat yang kamu buka tidak ada atau sudah dipindahkan.
      </p>
      <Button asChild className="mt-2">
        <Link to="/">Kembali ke beranda</Link>
      </Button>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
