import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"

/** Panel samping berisi form tambah/ubah data (DESIGN §5.10). */
export function FormSheet({
  open,
  onOpenChange,
  judul,
  deskripsi,
  onSubmit,
  menyimpan,
  labelSimpan = "Simpan",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  judul: string
  deskripsi?: string
  onSubmit: (e: React.FormEvent) => void
  menyimpan?: boolean
  labelSimpan?: string
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !menyimpan && onOpenChange(o)}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{judul}</SheetTitle>
            {deskripsi && <SheetDescription>{deskripsi}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup>{children}</FieldGroup>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={menyimpan}>
              Batal
            </Button>
            <Button type="submit" disabled={menyimpan}>
              {menyimpan && <Spinner data-icon="inline-start" />}
              {labelSimpan}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
