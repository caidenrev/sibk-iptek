// Import data siswa dari Excel/CSV (PRD §5.2). Pembacaan file terjadi di browser,
// validasi akhir (kelas, duplikat) dilakukan di server.
import { z } from "zod"
import { emailSchema, namaSchema, nisSchema, waSchema } from "./validasi"

export const KOLOM = ["nis", "nama", "jenis_kelamin", "kelas", "email", "no_whatsapp"] as const
export type KolomImport = (typeof KOLOM)[number]

/** Nama judul kolom yang dikenali (huruf kecil, tanpa spasi/tanda baca). */
const ALIAS: Record<string, KolomImport> = {
  nis: "nis",
  nisn: "nis",
  nomorinduk: "nis",
  nomorinduksiswa: "nis",
  nama: "nama",
  namalengkap: "nama",
  namasiswa: "nama",
  jeniskelamin: "jenis_kelamin",
  jk: "jenis_kelamin",
  lp: "jenis_kelamin",
  gender: "jenis_kelamin",
  kelas: "kelas",
  namakelas: "kelas",
  rombel: "kelas",
  email: "email",
  surel: "email",
  nowhatsapp: "no_whatsapp",
  nomorwhatsapp: "no_whatsapp",
  whatsapp: "no_whatsapp",
  wa: "no_whatsapp",
  nowa: "no_whatsapp",
  nohp: "no_whatsapp",
  hp: "no_whatsapp",
  telepon: "no_whatsapp",
}

const normJudul = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

export function petakanJudul(judul: Array<string>): Array<KolomImport | null> {
  return judul.map((j) => ALIAS[normJudul(j)] ?? null)
}

/** Jenis kelamin dari berbagai penulisan: L, P, Laki-laki, Perempuan, Pria, Wanita. */
export function normJenisKelamin(v: string): "L" | "P" | null {
  const s = v.trim().toLowerCase()
  if (!s) return null
  if (s === "l" || s.startsWith("laki") || s === "pria" || s === "lk") return "L"
  if (s === "p" || s.startsWith("perem") || s === "wanita" || s === "pr") return "P"
  return null
}

/** Validasi satu baris mentah (semua kolom string) — dipakai di server saat pratinjau. */
export const barisImportSchema = z.object({
  nis: nisSchema,
  nama: namaSchema,
  jenis_kelamin: z.string().optional(),
  kelas: z.string().trim().min(1, "Kelas wajib diisi"),
  email: z.string().optional(),
  no_whatsapp: z.string().optional(),
}).transform((r, ctx) => {
  const jk = normJenisKelamin(r.jenis_kelamin ?? "")
  if (!jk) ctx.addIssue({ code: "custom", message: "Jenis kelamin harus L atau P" })
  const email = emailSchema.safeParse(r.email ?? "")
  if (!email.success) ctx.addIssue({ code: "custom", message: "Format email tidak valid" })
  const wa = waSchema.safeParse(r.no_whatsapp ?? "")
  if (!wa.success) ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid" })
  return {
    nis: r.nis,
    nama: r.nama,
    jenisKelamin: (jk ?? "L") as "L" | "P",
    kelas: r.kelas,
    email: email.success ? email.data : null,
    noWhatsapp: wa.success ? wa.data : null,
  }
})

// ----------------------------------------------------------------- CSV

/** Parser CSV kecil: mendukung tanda kutip, pemisah "," atau ";" (Excel berbahasa Indonesia memakai ";"). */
export function parseCsv(teks: string): Array<Array<string>> {
  const bersih = teks.replace(/^﻿/, "")
  const barisPertama = bersih.split(/\r?\n/, 1)[0] ?? ""
  const pemisah = (barisPertama.match(/;/g)?.length ?? 0) > (barisPertama.match(/,/g)?.length ?? 0) ? ";" : ","

  const hasil: Array<Array<string>> = []
  let baris: Array<string> = []
  let sel = ""
  let kutip = false
  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i]
    if (kutip) {
      if (c === '"' && bersih[i + 1] === '"') {
        sel += '"'
        i++
      } else if (c === '"') kutip = false
      else sel += c
    } else if (c === '"') kutip = true
    else if (c === pemisah) {
      baris.push(sel)
      sel = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && bersih[i + 1] === "\n") i++
      baris.push(sel)
      hasil.push(baris)
      baris = []
      sel = ""
    } else sel += c
  }
  if (sel !== "" || baris.length) {
    baris.push(sel)
    hasil.push(baris)
  }
  return hasil
}

/** Ubah tabel 2D (baris pertama = judul) menjadi objek per baris. Baris kosong dilewati. */
export function tabelKeObjek(tabel: Array<Array<unknown>>) {
  if (tabel.length === 0) throw new Error("File kosong.")
  const peta = petakanJudul(tabel[0].map((v) => String(v ?? "")))
  const hilang = (["nis", "nama", "kelas"] as const).filter((k) => !peta.includes(k))
  if (hilang.length) {
    throw new Error(`Kolom wajib tidak ditemukan: ${hilang.join(", ")}. Gunakan template yang disediakan.`)
  }
  const rows: Array<Record<string, string>> = []
  for (const r of tabel.slice(1)) {
    const obj: Record<string, string> = {}
    peta.forEach((k, i) => {
      if (k) obj[k] = selKeTeks(r[i])
    })
    if (Object.values(obj).some((v) => v !== "")) rows.push(obj)
  }
  if (rows.length === 0) throw new Error("Tidak ada baris data di bawah judul kolom.")
  return rows
}

function selKeTeks(v: unknown): string {
  if (v == null) return ""
  // NIS/nomor WA yang tersimpan sebagai angka di Excel: hindari notasi 6.28e+12
  if (typeof v === "number") return Number.isInteger(v) ? v.toFixed(0) : String(v)
  return String(v).trim()
}

/** Baca file .xlsx / .csv dari input browser. */
export async function bacaFile(file: File): Promise<Array<Record<string, string>>> {
  const nama = file.name.toLowerCase()
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran file maksimal 5 MB.")
  if (nama.endsWith(".csv")) return tabelKeObjek(parseCsv(await file.text()))
  if (nama.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser")
    const data = await readSheet(file)
    return tabelKeObjek(data as Array<Array<unknown>>)
  }
  if (nama.endsWith(".xls")) throw new Error("Format .xls lama belum didukung. Simpan ulang sebagai .xlsx atau .csv.")
  throw new Error("Format file harus .xlsx atau .csv.")
}

/** Template CSV (dibuka langsung oleh Excel). Memakai ";" agar kolom terpisah di Excel berbahasa Indonesia. */
export function templateCsv() {
  const isi = [
    "nis;nama;jenis_kelamin;kelas;email;no_whatsapp",
    "232410101;Contoh Siswa Satu;L;X TKJ 2;;081234567890",
    "232410102;Contoh Siswa Dua;P;XI RPL 1;siswa.dua@email.com;",
  ].join("\r\n")
  return new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" })
}
