import { Construction } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Penanda halaman yang dibangun pada sprint berikutnya (docs/SPRINTS.md). */
export function SegeraHadir({ title, sprint, children }: { title: string; sprint: 1 | 2 | 3 | 4; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={title} />
      <Empty className="border bg-card py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Construction />
          </EmptyMedia>
          <EmptyTitle>Dibangun di Sprint {sprint}</EmptyTitle>
          <EmptyDescription>{children ?? "Halaman ini sudah punya alamat dan menu, isinya menyusul."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
