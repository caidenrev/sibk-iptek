import { describe, expect, it } from "vitest"
import { hariIso, seninDari, tanggalSlotBerulang } from "@/lib/tanggal"

describe("tanggal slot berulang", () => {
  it("tanpa ulangan hanya satu tanggal", () => {
    expect(tanggalSlotBerulang("2026-11-04", [], 0)).toEqual(["2026-11-04"])
  })
  it("Senin & Rabu selama 2 minggu, mulai Rabu: Senin minggu pertama dilewati", () => {
    expect(tanggalSlotBerulang("2026-11-04", [3, 1], 2)).toEqual(["2026-11-04", "2026-11-09", "2026-11-11"])
  })
  it("hari ganda tidak membuat tanggal ganda", () => {
    expect(tanggalSlotBerulang("2026-11-02", [1, 1], 1)).toEqual(["2026-11-02"])
  })
  it("Senin dari tanggal mana pun di minggu itu, dan nomor hari ISO", () => {
    expect(seninDari("2026-11-08")).toBe("2026-11-02")
    expect(hariIso("2026-11-08")).toBe(7)
    expect(hariIso("2026-11-02")).toBe(1)
  })
})
