import { describe, expect, it } from "vitest"
import { gantiPasswordSchema, normalisasiWa, siswaSchema, waSchema } from "@/lib/validasi"

describe("normalisasi nomor WhatsApp", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["6281234567890", "6281234567890"],
  ])("%s → %s", (input, hasil) => {
    expect(normalisasiWa(input)).toBe(hasil)
  })

  it("kosong menjadi null", () => {
    expect(waSchema.parse("")).toBeNull()
    expect(waSchema.parse("   ")).toBeNull()
  })

  it("menolak nomor terlalu pendek", () => {
    expect(waSchema.safeParse("0812").success).toBe(false)
  })
})

describe("validasi siswa", () => {
  const valid = { nama: "Rina Aulia", nis: "232410001", kelasId: 1, jenisKelamin: "P", email: "", noWhatsapp: "" }

  it("menerima data lengkap, email & WA opsional", () => {
    const r = siswaSchema.parse(valid)
    expect(r.email).toBeNull()
    expect(r.noWhatsapp).toBeNull()
  })

  it("menolak NIS berisi huruf", () => {
    expect(siswaSchema.safeParse({ ...valid, nis: "23A41" }).success).toBe(false)
  })
})

describe("ganti password", () => {
  it("mewajibkan huruf + angka, minimal 8", () => {
    const r = gantiPasswordSchema.safeParse({ passwordLama: "x", passwordBaru: "abcdefgh", konfirmasi: "abcdefgh" })
    expect(r.success).toBe(false)
  })

  it("konfirmasi harus sama", () => {
    const r = gantiPasswordSchema.safeParse({ passwordLama: "lama123", passwordBaru: "baru12345", konfirmasi: "baru12346" })
    expect(r.success).toBe(false)
  })

  it("lolos bila benar", () => {
    const r = gantiPasswordSchema.safeParse({ passwordLama: "lama123", passwordBaru: "baru12345", konfirmasi: "baru12345" })
    expect(r.success).toBe(true)
  })
})
