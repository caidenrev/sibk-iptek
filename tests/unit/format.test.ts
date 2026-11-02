import { describe, expect, it } from "vitest"
import { formatJam, formatRentangSesi, formatTanggal, formatHari, formatSlot, jamTitik } from "@/lib/format"

describe("format tanggal WIB", () => {
  // 2 Nov 2026 03:00 UTC = 10:00 WIB
  const mulai = new Date("2026-11-02T03:00:00Z")
  const selesai = new Date("2026-11-02T04:00:00Z")

  it("mengubah UTC ke jam WIB", () => {
    expect(formatJam(mulai)).toBe("10.00")
  })

  it("menampilkan nama hari dalam bahasa Indonesia", () => {
    expect(formatTanggal(mulai)).toBe("Senin, 2 Nov 2026")
  })

  it("tidak bergeser hari saat UTC masih tanggal sebelumnya", () => {
    // 1 Nov 2026 20:00 UTC = 2 Nov 2026 03:00 WIB
    expect(formatTanggal(new Date("2026-11-01T20:00:00Z"))).toBe("Senin, 2 Nov 2026")
  })

  it("membentuk rentang sesi", () => {
    expect(formatRentangSesi(mulai, selesai)).toBe("Senin, 2 Nov 2026 · 10.00–11.00 WIB")
  })
})

describe("format slot jadwal", () => {
  it("menulis hari dan tanggal slot tanpa geser zona waktu", () => {
    expect(formatHari("2026-11-09")).toBe("Senin, 9 Nov")
    expect(formatHari("2026-12-31")).toBe("Kamis, 31 Des")
  })
  it("memakai titik untuk jam", () => {
    expect(jamTitik("07:30:00")).toBe("07.30")
    expect(formatSlot("2026-11-09", "10:00", "11:00")).toBe("Senin, 9 Nov 2026 · 10.00–11.00 WIB")
  })
})
