import { describe, expect, it } from "vitest"
import { barisImportSchema, normJenisKelamin, parseCsv, tabelKeObjek } from "@/lib/import-siswa"

describe("parser CSV", () => {
  it("mendeteksi pemisah titik koma (Excel Indonesia)", () => {
    expect(parseCsv("nis;nama\r\n1;Budi")).toEqual([
      ["nis", "nama"],
      ["1", "Budi"],
    ])
  })

  it("mendukung koma dan tanda kutip berisi koma", () => {
    expect(parseCsv('nis,nama\n1,"Budi, S."')).toEqual([
      ["nis", "nama"],
      ["1", "Budi, S."],
    ])
  })

  it("membuang BOM di awal file", () => {
    expect(parseCsv("﻿nis;nama\n1;A")[0][0]).toBe("nis")
  })
})

describe("pemetaan kolom", () => {
  it("mengenali judul alternatif dan melewati baris kosong", () => {
    const rows = tabelKeObjek([
      ["NIS", "Nama Lengkap", "L/P", "Rombel", "No. WA"],
      [232410101, "Budi", "L", "X TKJ 2", 81234567890],
      ["", "", "", "", ""],
    ])
    expect(rows).toEqual([{ nis: "232410101", nama: "Budi", jenis_kelamin: "L", kelas: "X TKJ 2", no_whatsapp: "81234567890" }])
  })

  it("menolak file tanpa kolom wajib", () => {
    expect(() => tabelKeObjek([["nama", "kelas"], ["A", "B"]])).toThrow(/nis/)
  })
})

describe("validasi baris", () => {
  it.each([
    ["Laki-laki", "L"],
    ["perempuan", "P"],
    ["P", "P"],
    ["x", null],
  ])("jenis kelamin %s → %s", (v, h) => {
    expect(normJenisKelamin(v)).toBe(h)
  })

  it("menormalkan WA dan mengosongkan email kosong", () => {
    const r = barisImportSchema.parse({ nis: "232410101", nama: "Budi Santoso", jenis_kelamin: "L", kelas: "X TKJ 2", email: "", no_whatsapp: "0812-3456-7890" })
    expect(r).toMatchObject({ jenisKelamin: "L", email: null, noWhatsapp: "6281234567890" })
  })

  it("mengumpulkan semua kesalahan dalam satu baris", () => {
    const r = barisImportSchema.safeParse({ nis: "12", nama: "B", kelas: "", jenis_kelamin: "z" })
    expect(r.success).toBe(false)
    expect(r.error!.issues.length).toBeGreaterThanOrEqual(3)
  })
})
