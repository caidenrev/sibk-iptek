import { Inbox } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type Kolom<T> = {
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
}

/** Tabel sederhana untuk data dari server (paginasi & filter ditangani lewat URL). */
export function DataTable<T>({
  rows,
  kolom,
  rowKey,
  kosong,
  className,
}: {
  rows: Array<T>
  kolom: Array<Kolom<T>>
  rowKey: (row: T) => string | number
  kosong?: { judul: string; deskripsi?: React.ReactNode; aksi?: React.ReactNode }
  className?: string
}) {
  if (rows.length === 0) {
    return (
      <Empty className={cn("border bg-card py-14", className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>{kosong?.judul ?? "Belum ada data"}</EmptyTitle>
          {kosong?.deskripsi && <EmptyDescription>{kosong.deskripsi}</EmptyDescription>}
        </EmptyHeader>
        {kosong?.aksi}
      </Empty>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {kolom.map((k, i) => (
              <TableHead key={i} className={cn("h-10 px-4 text-xs font-semibold", k.className)}>
                {k.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {kolom.map((k, i) => (
                <TableCell key={i} className={cn("px-4 py-3", k.className)}>
                  {k.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
