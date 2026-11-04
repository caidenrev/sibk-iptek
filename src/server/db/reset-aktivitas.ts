// Reset aktivitas sebelum aplikasi diserahkan ke sekolah.
//
//   pnpm db:reset-aktivitas           → hanya MENAMPILKAN apa yang akan dihapus (aman)
//   pnpm db:reset-aktivitas --yakin   → benar-benar menghapus
//   tambah --akun-siswa               → akun siswa juga dikembalikan ke kondisi awal (lihat di bawah)
//
// Yang DIHAPUS: pengaduan & tanggapan (beserta file lampiran), slot & jadwal konseling, catatan
// konseling, log notifikasi, notifikasi lonceng, kode OTP, sesi login (semua orang keluar), dan status cron terakhir.
// Dengan --akun-siswa: password siswa kembali = NIS (wajib ganti saat login), kontak WA/email siswa
// dan status verifikasinya dikosongkan. Akun admin & Guru BK tidak disentuh.
// Yang TETAP: akun (admin, Guru BK, siswa), kelas, kategori masalah, token Fonnte.
import bcrypt from "bcryptjs"
import { readdir, rm } from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"
import { opsiPool } from "./pool-config"

// Urutan tidak penting: semua dikosongkan dalam satu perintah TRUNCATE.
const TABEL_AKTIVITAS = [
  "tanggapan",
  "pengaduan",
  "catatan_konseling",
  "jadwal_konseling",
  "slot_jadwal",
  "notifikasi",
  "pemberitahuan",
  "kode_otp",
  "sesi",
]
const BUCKET = "lampiran"
const FOLDER_LOKAL = path.resolve("storage", BUCKET)

// Pengaturan yang hanya mencatat aktivitas (bukan konfigurasi).
const PENGATURAN_AKTIVITAS = ["cron.terakhir"]

const yakin = process.argv.includes("--yakin")
const akunSiswa = process.argv.includes("--akun-siswa")
const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL belum diisi di .env")
  process.exit(1)
}
const pool = new Pool(opsiPool(url))

// ---------------------------------------------------------------- Supabase Storage
const SUPA = process.env.SUPABASE_URL?.replace(/\/$/, "")
const KUNCI = process.env.SUPABASE_SECRET_KEY
const header = { Authorization: `Bearer ${KUNCI}`, apikey: KUNCI ?? "", "Content-Type": "application/json" }

/** Semua file di bucket lampiran (folder YYYY/MM ditelusuri). */
async function daftarFileStorage(prefix = ""): Promise<Array<string>> {
  const hasil: Array<string> = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SUPA}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: header,
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    })
    if (!res.ok) throw new Error(`Gagal membaca Storage (${res.status}): ${await res.text()}`)
    const isi = (await res.json()) as Array<{ name: string; id: string | null }>
    for (const item of isi) {
      if (item.name === ".emptyFolderPlaceholder") continue
      const lengkap = prefix + item.name
      if (item.id === null) hasil.push(...(await daftarFileStorage(lengkap + "/")))
      else hasil.push(lengkap)
    }
    if (isi.length < 1000) break
  }
  return hasil
}

async function hapusFileStorage(kunci: Array<string>) {
  for (let i = 0; i < kunci.length; i += 500) {
    const res = await fetch(`${SUPA}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: header,
      body: JSON.stringify({ prefixes: kunci.slice(i, i + 500) }),
    })
    if (!res.ok) throw new Error(`Gagal menghapus file Storage (${res.status}): ${await res.text()}`)
  }
}

async function jumlahFileLokal(dir = FOLDER_LOKAL): Promise<number> {
  try {
    const isi = await readdir(dir, { withFileTypes: true })
    let n = 0
    for (const e of isi) n += e.isDirectory() ? await jumlahFileLokal(path.join(dir, e.name)) : 1
    return n
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------- utama
try {
  const host = new URL(url).hostname
  const { rows: ada } = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)`,
    [TABEL_AKTIVITAS]
  )
  const tabel = TABEL_AKTIVITAS.filter((t) => ada.some((r) => r.table_name === t))

  console.log(`\nDatabase : ${host}`)
  console.log(yakin ? "Mode     : HAPUS\n" : "Mode     : cek saja (tidak ada yang dihapus)\n")

  console.log("Data aktivitas yang akan dikosongkan:")
  for (const t of tabel) {
    const { rows } = await pool.query<{ n: number }>(`select count(*)::int as n from "${t}"`)
    console.log(`  ${t.padEnd(20)} ${String(rows[0].n).padStart(6)} baris`)
  }

  const fileStorage = SUPA && KUNCI ? await daftarFileStorage() : []
  const fileLokal = await jumlahFileLokal()
  console.log(`  ${"lampiran (Storage)".padEnd(20)} ${String(fileStorage.length).padStart(6)} file${SUPA && KUNCI ? "" : "  (SUPABASE_URL belum diisi, dilewati)"}`)
  console.log(`  ${"lampiran (lokal)".padEnd(20)} ${String(fileLokal).padStart(6)} file`)
  const { rows: pAkt } = await pool.query<{ n: number }>(`select count(*)::int as n from pengaturan where kunci = any($1)`, [
    PENGATURAN_AKTIVITAS,
  ])
  console.log(`  ${"status cron".padEnd(20)} ${String(pAkt[0].n).padStart(6)} baris`)

  // Siswa yang sudah pernah dipakai: sudah ganti password atau sudah mengisi kontak.
  const { rows: siswaDipakai } = await pool.query<{ username: string; nama: string }>(
    `select username, nama from users
     where role = 'siswa'
       and (harus_ganti_password = false or email is not null or no_whatsapp is not null)
     order by username`
  )
  console.log(
    `\nAkun siswa yang sudah dipakai: ${siswaDipakai.length}` +
      (akunSiswa ? "  → dikembalikan ke kondisi awal" : "  (tidak disentuh; tambah --akun-siswa untuk ikut mereset)")
  )
  for (const s of siswaDipakai.slice(0, 10)) console.log(`  ${s.username}  ${s.nama}`)
  if (siswaDipakai.length > 10) console.log(`  … dan ${siswaDipakai.length - 10} lainnya`)

  console.log("\nTetap disimpan:")
  const TETAP = ["users", "guru_bk", "siswa", "kelas", "kategori_masalah", "pengaturan"]
  const { rows: adaTetap } = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)`,
    [TETAP]
  )
  for (const t of TETAP.filter((x) => adaTetap.some((r) => r.table_name === x))) {
    const { rows } = await pool.query<{ n: number }>(`select count(*)::int as n from "${t}"`)
    console.log(`  ${t.padEnd(20)} ${String(rows[0].n).padStart(6)} baris`)
  }

  if (!yakin) {
    console.log("\nBelum ada yang dihapus. Jalankan lagi dengan --yakin untuk menghapus:")
    console.log(`  pnpm db:reset-aktivitas --yakin${akunSiswa ? " --akun-siswa" : ""}\n`)
  } else {
    // Hash password siswa disiapkan dulu (lambat), supaya transaksi di bawah singkat.
    const hashSiswa = akunSiswa
      ? await Promise.all(siswaDipakai.map(async (s) => [s.username, await bcrypt.hash(s.username, 10)] as const))
      : []

    // Satu transaksi: semua terhapus bersamaan atau tidak sama sekali.
    // TRUNCATE tanpa CASCADE, supaya kalau ada tabel lain yang masih merujuk, perintah gagal dan tidak ada yang hilang.
    const klien = await pool.connect()
    try {
      await klien.query("begin")
      await klien.query(`truncate table ${tabel.map((t) => `"${t}"`).join(", ")} restart identity`)
      await klien.query(`delete from pengaturan where kunci = any($1)`, [PENGATURAN_AKTIVITAS])
      for (const [username, hash] of hashSiswa) {
        await klien.query(
          `update users set password = $2, harus_ganti_password = true, email = null, no_whatsapp = null,
             email_terverifikasi_pada = null, wa_terverifikasi_pada = null, updated_at = now()
           where username = $1 and role = 'siswa'`,
          [username, hash]
        )
      }
      await klien.query("commit")
    } catch (e) {
      await klien.query("rollback")
      throw e
    } finally {
      klien.release()
    }
    console.log(`\n✓ ${tabel.length} tabel aktivitas dikosongkan, nomor urut (id) dimulai lagi dari 1`)
    console.log("✓ Status cron terakhir dihapus")
    if (hashSiswa.length) console.log(`✓ ${hashSiswa.length} akun siswa dikembalikan: password = NIS, kontak dikosongkan`)

    if (fileStorage.length) {
      await hapusFileStorage(fileStorage)
      console.log(`✓ ${fileStorage.length} file lampiran dihapus dari Supabase Storage`)
    }
    if (fileLokal) {
      await rm(FOLDER_LOKAL, { recursive: true, force: true })
      console.log(`✓ ${fileLokal} file lampiran lokal dihapus`)
    }
    console.log("\nSelesai. Semua orang otomatis keluar; login lagi dengan akun masing-masing.\n")
  }
} catch (e) {
  console.error("\nGagal:", e instanceof Error ? e.message : e)
  process.exitCode = 1
} finally {
  await pool.end()
}
