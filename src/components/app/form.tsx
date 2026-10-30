import { Eye, EyeOff } from "lucide-react"
import { useId, useState } from "react"
import { Controller } from "react-hook-form"
import type { Control, FieldValues, Path } from "react-hook-form"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Dasar<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  label: string
  description?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  ...input
}: Dasar<T> & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue" | "value" | "onChange">) {
  const id = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...input}
            {...field}
            value={field.value ?? ""}
            id={id}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  ...input
}: Dasar<T> & Omit<React.ComponentProps<typeof Textarea>, "name" | "defaultValue" | "value" | "onChange">) {
  const id = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Textarea
            {...input}
            {...field}
            value={field.value ?? ""}
            id={id}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function FormPassword<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  autoComplete = "current-password",
}: Dasar<T> & { autoComplete?: string }) {
  const id = useId()
  const [lihat, setLihat] = useState(false)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputGroup className="h-11 md:h-9">
            <InputGroupInput
              {...field}
              value={field.value ?? ""}
              id={id}
              type={lihat ? "text" : "password"}
              autoComplete={autoComplete}
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setLihat((v) => !v)}
                aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={lihat}
              >
                {lihat ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export type Opsi = { value: string; label: string }

/** Select yang menyimpan nilai angka/null/string. `kosong` = label opsi "tidak dipilih". */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  opsi,
  placeholder = "Pilih…",
  kosong,
  angka,
}: Dasar<T> & { opsi: Array<Opsi>; placeholder?: string; kosong?: string; angka?: boolean }) {
  const id = useId()
  const NONE = "__kosong__"
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select
            disabled={disabled}
            value={field.value == null ? (kosong ? NONE : "") : String(field.value)}
            onValueChange={(v) => field.onChange(v === NONE ? null : angka ? Number(v) : v)}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.invalid} onBlur={field.onBlur} className={cn("w-full")}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {kosong && <SelectItem value={NONE}>{kosong}</SelectItem>}
              {opsi.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
