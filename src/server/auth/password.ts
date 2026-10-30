import "@tanstack/react-start/server-only"
import bcrypt from "bcryptjs"

const COST = 10

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, COST)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

// Hash acak untuk dibandingkan saat username tidak ditemukan,
// supaya lama respons sama dan orang tidak bisa menebak NIS mana yang terdaftar.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-sibk", COST)

export async function verifyDummy(plain: string) {
  await bcrypt.compare(plain, DUMMY_HASH)
  return false
}
