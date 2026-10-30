import { describe, expect, it } from "vitest"
import { samarkanEmail, samarkanWa } from "@/lib/samarkan"
import { kodeOtpSchema, lupaPasswordResetSchema } from "@/lib/validasi"

describe("penyamaran kontak", () => {
  it("email hanya menampilkan 2 huruf awal nama & 1 huruf domain", () => {
    expect(samarkanEmail("rina.aulia@gmail.com")).toBe("ri******@g****.com")
    expect(samarkanEmail("rina.aulia@siswa.smkiptek.sch.id")).toBe("ri******@s*****.id")
  })
  it("email pendek tetap tersamar", () => {
    expect(samarkanEmail("ab@x.id")).toBe("ab***@x***.id")
  })
  it("nomor WA hanya menampilkan awal & 4 digit akhir", () => {
    expect(samarkanWa("6281234567890")).toBe("0812-****-7890")
  })
})

describe("validasi OTP", () => {
  it("kode harus 6 digit angka", () => {
    expect(kodeOtpSchema.safeParse("123456").success).toBe(true)
    expect(kodeOtpSchema.safeParse("12345").success).toBe(false)
    expect(kodeOtpSchema.safeParse("12a456").success).toBe(false)
  })
  it("password baru tidak boleh sama dengan NIS", () => {
    const r = lupaPasswordResetSchema.safeParse({ username: "23241000123", kode: "123456", passwordBaru: "23241000123", konfirmasi: "23241000123" })
    expect(r.success).toBe(false)
  })
})
