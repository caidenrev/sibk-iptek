import { randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"
import { buatAlias, buatKodeTiket, dekripsiDengan, enkripsiDengan, hashPengirimDengan } from "@/server/crypto/core"

const kunci = randomBytes(32)
const kunciLain = randomBytes(32)

describe("enkripsi identitas pengirim (AES-256-GCM)", () => {
  it("bisa dibuka kembali dengan kunci yang sama", () => {
    expect(dekripsiDengan(kunci, enkripsiDengan(kunci, "42"))).toBe("42")
  })

  it("ID yang sama menghasilkan ciphertext berbeda (tidak bisa dicocokkan antar-aduan)", () => {
    expect(enkripsiDengan(kunci, "42")).not.toBe(enkripsiDengan(kunci, "42"))
  })

  it("tidak bisa dibuka dengan kunci lain", () => {
    expect(() => dekripsiDengan(kunciLain, enkripsiDengan(kunci, "42"))).toThrow()
  })

  it("menolak ciphertext yang diubah", () => {
    const b = Buffer.from(enkripsiDengan(kunci, "42"), "base64")
    b[b.length - 1] ^= 1
    expect(() => dekripsiDengan(kunci, b.toString("base64"))).toThrow()
  })
})

describe("hash pengirim (HMAC)", () => {
  it("konsisten untuk siswa yang sama", () => {
    expect(hashPengirimDengan(kunci, 7)).toBe(hashPengirimDengan(kunci, 7))
  })
  it("berbeda untuk siswa lain dan kunci lain", () => {
    expect(hashPengirimDengan(kunci, 7)).not.toBe(hashPengirimDengan(kunci, 8))
    expect(hashPengirimDengan(kunci, 7)).not.toBe(hashPengirimDengan(kunciLain, 7))
  })
  it("tidak memuat ID siswa", () => {
    expect(hashPengirimDengan(kunci, 123456)).not.toContain("123456")
    expect(hashPengirimDengan(kunci, 1)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("kode tiket & alias", () => {
  it("kode tiket berformat BK- + 6 karakter tanpa huruf yang mirip", () => {
    for (let i = 0; i < 200; i++) expect(buatKodeTiket()).toMatch(/^BK-[A-HJKMNP-Z2-9]{6}$/)
  })
  it("alias berbentuk 'Siswa <Nama>-<2 digit>'", () => {
    for (let i = 0; i < 50; i++) expect(buatAlias()).toMatch(/^Siswa [A-Z][a-z]+-\d{2}$/)
  })
})
