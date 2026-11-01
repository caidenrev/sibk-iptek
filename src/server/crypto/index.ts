import "@tanstack/react-start/server-only"
import { env } from "../env"
import { dekripsiDengan, enkripsiDengan, hashPengirimDengan } from "./core"

const KUNCI_ENC = Buffer.from(env.APP_ENC_KEY, "base64")
const KUNCI_HMAC = Buffer.from(env.APP_HMAC_KEY, "base64")

export const enkripsi = (teks: string) => enkripsiDengan(KUNCI_ENC, teks)
export const dekripsi = (sandi: string) => dekripsiDengan(KUNCI_ENC, sandi)
export const hashPengirim = (siswaId: number) => hashPengirimDengan(KUNCI_HMAC, siswaId)

export { buatAlias, buatKodeTiket } from "./core"
