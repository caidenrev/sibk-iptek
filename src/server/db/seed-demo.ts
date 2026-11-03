// Data demo untuk UAT (Sprint 4 · 4.8).
// Jalankan setelah `pnpm db:seed`:
//
//   pnpm db:seed-demo           → isi data demo (ditolak bila sudah ada pengaduan)
//   pnpm db:seed-demo --paksa   → tetap isi walau sudah ada data
//
// Isi: 10 pengaduan (anonim & beridentitas, berbagai kategori/urgensi/status, tersebar 3 bulan
// terakhir) beserta percakapan, slot minggu depan untuk 2 Guru BK, jadwal dengan berbagai status,
// dan catatan konseling. Data dimasukkan langsung ke database, jadi TIDAK ada notifikasi terkirim.
// Hapus semuanya dengan `pnpm db:reset-aktivitas --yakin` (akun tetap ada).
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { buatAlias, buatKodeTiket } from "../crypto/core"
import { enkripsi, hashPengirim } from "../crypto"
import { opsiPool } from "./pool-config"
import * as s from "./schema"

const pool = new Pool(opsiPool(process.env.DATABASE_URL!))
const db = drizzle(pool, { schema: s })
const paksa = process.argv.includes("--paksa")

type Aduan = {
  nis: string
  anonim: boolean
  kategori: string
  urgensi: "rendah" | "sedang" | "tinggi"
  status: "baru" | "diproses" | "selesai"
  hariLalu: number
  judul: string
  isi: string
  /** [dari, isi] berurutan; "g" = Guru BK penanggung jawab, "s" = siswa */
  percakapan?: Array<["g" | "s", string]>
  guru?: "dewi" | "ahmad"
}

const ADUAN: Array<Aduan> = [
  { nis: "232410001", anonim: true, kategori: "Sosial", urgensi: "tinggi", status: "diproses", hariLalu: 2, guru: "dewi",
    judul: "Sering diejek di grup kelas", isi: "Beberapa teman sering mengirim stiker dan komentar yang mengejek saya di grup WhatsApp kelas. Saya jadi malas masuk sekolah.",
    percakapan: [["g", "Terima kasih sudah berani bercerita. Sejak kapan ini terjadi, dan apakah kamu menyimpan tangkapan layarnya?"], ["s", "Sejak awal semester. Ada beberapa tangkapan layar."]] },
  { nis: "232410003", anonim: false, kategori: "Belajar", urgensi: "sedang", status: "selesai", hariLalu: 20, guru: "dewi",
    judul: "Nilai matematika turun", isi: "Nilai ulangan matematika saya turun terus sejak kelas XI. Saya sudah belajar tapi tetap sulit memahami materi.",
    percakapan: [["g", "Kita bahas cara belajarnya ya. Coba ajukan jadwal konseling minggu ini."], ["s", "Baik Bu, terima kasih."]] },
  { nis: "232410002", anonim: false, kategori: "Karier", urgensi: "rendah", status: "baru", hariLalu: 1, guru: "ahmad",
    judul: "Bingung memilih tempat PKL", isi: "Saya bingung memilih tempat PKL antara bengkel jaringan atau kantor ISP. Mohon saran mana yang lebih cocok untuk jurusan TKJ." },
  { nis: "232410004", anonim: true, kategori: "Pribadi", urgensi: "tinggi", status: "baru", hariLalu: 0,
    judul: "Sulit tidur dan cemas", isi: "Beberapa minggu ini saya sulit tidur dan sering cemas tanpa alasan jelas. Saya tidak tahu harus cerita ke siapa." },
  { nis: "232410005", anonim: false, kategori: "Pribadi", urgensi: "sedang", status: "diproses", hariLalu: 9, guru: "dewi",
    judul: "Masalah di rumah", isi: "Orang tua sering bertengkar di rumah dan saya sulit konsentrasi belajar.",
    percakapan: [["g", "Terima kasih sudah percaya. Kamu aman di rumah? Kita bisa bicara langsung kapan saja."]] },
  { nis: "232410006", anonim: true, kategori: "Belajar", urgensi: "rendah", status: "selesai", hariLalu: 45, guru: "ahmad",
    judul: "Sering terlambat masuk", isi: "Saya sering terlambat karena rumah jauh dan angkot jarang. Saya takut nilainya terpengaruh.",
    percakapan: [["g", "Bapak sudah koordinasi dengan wali kelas. Coba berangkat dengan jadwal angkot pertama, nanti kita evaluasi."], ["s", "Siap Pak, sudah lebih baik sekarang."]] },
  { nis: "232410007", anonim: false, kategori: "Sosial", urgensi: "sedang", status: "selesai", hariLalu: 60, guru: "dewi",
    judul: "Konflik dengan teman sebangku", isi: "Saya bertengkar dengan teman sebangku dan suasana kelas jadi tidak nyaman.",
    percakapan: [["g", "Mau kita fasilitasi bicara bertiga di ruang BK?"], ["s", "Boleh Bu."]] },
  { nis: "232410008", anonim: true, kategori: "Karier", urgensi: "sedang", status: "diproses", hariLalu: 30, guru: "ahmad",
    judul: "Ingin kuliah tapi biaya", isi: "Saya ingin lanjut kuliah tapi orang tua bilang biayanya berat. Apa ada beasiswa untuk lulusan SMK?",
    percakapan: [["g", "Ada beberapa pilihan beasiswa, misalnya KIP Kuliah. Nanti Bapak kirimkan daftarnya."]] },
  { nis: "232410009", anonim: false, kategori: "Belajar", urgensi: "rendah", status: "baru", hariLalu: 3,
    judul: "Kesulitan pelajaran pemrograman", isi: "Saya tertinggal di pelajaran pemrograman web dan malu bertanya di kelas." },
  { nis: "232410010", anonim: false, kategori: "Pribadi", urgensi: "sedang", status: "selesai", hariLalu: 75, guru: "dewi",
    judul: "Kurang percaya diri saat presentasi", isi: "Saya selalu gugup saat presentasi di depan kelas sampai lupa materi.",
    percakapan: [["g", "Kita latihan teknik napas dan latihan presentasi kecil dulu ya."], ["s", "Terima kasih Bu, presentasi kemarin lebih lancar."]] },
]

const hariLalu = (n: number, jam = 9) => sql`(now() - interval '${sql.raw(String(n))} days')::date + time '${sql.raw(`${String(jam).padStart(2, "0")}:15`)}'`

async function main() {
  const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from pengaduan`).then((r) => r.rows)
  if (n > 0 && !paksa) {
    console.log(`Sudah ada ${n} pengaduan. Batal agar data tidak tercampur. Pakai --paksa untuk tetap mengisi.`)
    return
  }

  const siswaRows = await db.execute<{ id: number; nis: string; kelasGuru: number | null }>(sql`
    select s.id, s.nis, k.guru_bk_id as "kelasGuru" from siswa s left join kelas k on k.id = s.kelas_id`).then((r) => r.rows)
  const guruRows = await db.execute<{ id: number; userId: number; username: string }>(sql`
    select g.id, g.user_id as "userId", u.username from guru_bk g join users u on u.id = g.user_id`).then((r) => r.rows)
  const kategori = await db.execute<{ id: number; nama: string }>(sql`select id, nama_kategori as nama from kategori_masalah`).then((r) => r.rows)
  const guru = {
    dewi: guruRows.find((g) => g.username === "198702122019032001"),
    ahmad: guruRows.find((g) => g.username === "198905172020121002"),
  }
  if (!guru.dewi || !guru.ahmad) throw new Error("Akun Guru BK seed tidak ditemukan. Jalankan pnpm db:seed dulu.")

  // ---------------------------------------------------------------- pengaduan & percakapan
  const idAduan: Record<string, number> = {}
  for (const a of ADUAN) {
    const sw = siswaRows.find((x) => x.nis === a.nis)
    const kat = kategori.find((k) => k.nama === a.kategori)
    if (!sw || !kat) continue
    const g = a.guru ? guru[a.guru]! : null
    const dibuat = hariLalu(a.hariLalu)
    const [p] = await db
      .insert(s.pengaduan)
      .values({
        kodeTiket: buatKodeTiket(),
        siswaId: a.anonim ? null : sw.id,
        pengirimHash: hashPengirim(sw.id),
        pengirimTerenkripsi: enkripsi(String(sw.id)),
        isAnonim: a.anonim,
        alias: a.anonim ? buatAlias() : null,
        kategoriId: kat.id,
        guruBkId: g?.id ?? null,
        judul: a.judul,
        isi: a.isi,
        tingkatUrgensi: a.urgensi,
        status: a.status,
        createdAt: dibuat,
        updatedAt: dibuat,
        dibacaSiswaPada: dibuat,
        dibacaGuruPada: a.percakapan ? sql`now()` : null,
      })
      .returning({ id: s.pengaduan.id })
    idAduan[a.nis + a.judul] = p.id
    let menit = 30
    for (const [dari, isi] of a.percakapan ?? []) {
      await db.insert(s.tanggapan).values({
        pengaduanId: p.id,
        pengirim: dari === "g" ? "guru_bk" : "siswa",
        userId: dari === "g" ? g!.userId : null,
        isi,
        createdAt: sql`${dibuat} + interval '${sql.raw(String(menit))} minutes'`,
      })
      menit += 90
    }
  }

  // ---------------------------------------------------------------- slot & jadwal
  // Slot minggu depan (Senin–Jumat) untuk kedua Guru BK, ditambah sesi yang sudah lewat untuk riwayat.
  const slotBaru = async (guruBkId: number, hariDariSekarang: number, jam: string, lokasi: string, status: "tersedia" | "dipesan" = "tersedia") => {
    const [jamMulai, jamAkhir] = [jam, `${String(Number(jam.slice(0, 2)) + 1).padStart(2, "0")}:00`]
    const [r] = await db.execute<{ id: number }>(sql`
      insert into slot_jadwal (guru_bk_id, tanggal, jam_mulai, jam_selesai, lokasi, status)
      values (${guruBkId}, (now() at time zone 'Asia/Jakarta')::date + ${hariDariSekarang}::int, ${jamMulai}::time, ${jamAkhir}::time, ${lokasi}, ${status})
      returning id`).then((x) => x.rows)
    return r.id
  }
  const senin = await db
    .execute<{ n: number }>(sql`select (8 - extract(isodow from now() at time zone 'Asia/Jakarta'))::int as n`)
    .then((r) => r.rows[0].n) // jumlah hari sampai Senin depan
  for (let h = 0; h < 5; h++) {
    await slotBaru(guru.dewi.id, senin + h, "10:00", "Ruang BK 1")
    await slotBaru(guru.dewi.id, senin + h, "13:00", "Ruang BK 1")
    if (h % 2 === 0) await slotBaru(guru.ahmad.id, senin + h, "09:00", "Ruang BK 2")
  }

  const jadwal = async (nis: string, g: { id: number }, hari: number, jam: string, status: s.StatusJadwal, topik: string, alasan?: string) => {
    const sw = siswaRows.find((x) => x.nis === nis)!
    const slotId = await slotBaru(g.id, hari, jam, g === guru.dewi ? "Ruang BK 1" : "Ruang BK 2", status === "menunggu" || status === "disetujui" || status === "selesai" || status === "tidak_hadir" ? "dipesan" : "tersedia")
    const [r] = await db
      .insert(s.jadwalKonseling)
      .values({ siswaId: sw.id, slotId, topik, status, alasanPenolakan: alasan ?? null, diputuskanPada: status === "menunggu" ? null : sql`now()` })
      .returning({ id: s.jadwalKonseling.id })
    return r.id
  }
  await jadwal("232410003", guru.dewi, senin + 1, "15:00", "menunggu", "Strategi belajar matematika")
  await jadwal("232410005", guru.dewi, senin + 2, "15:00", "disetujui", "Membahas situasi di rumah")
  await jadwal("232410002", guru.ahmad, senin + 3, "11:00", "ditolak", "Konsultasi tempat PKL", "Ada rapat jurusan. Silakan pilih slot Rabu.")
  const selesai1 = await jadwal("232410007", guru.dewi, -14, "10:00", "selesai", "Mediasi dengan teman sebangku")
  const selesai2 = await jadwal("232410010", guru.dewi, -40, "13:00", "selesai", "Latihan percaya diri")
  await jadwal("232410006", guru.ahmad, -7, "09:00", "tidak_hadir", "Keterlambatan masuk sekolah")

  await db.insert(s.catatanKonseling).values([
    {
      jadwalId: selesai1,
      guruBkId: guru.dewi.id,
      ringkasanMasalah: "Salah paham soal pembagian tugas kelompok. Keduanya sepakat bicara langsung bila ada masalah.",
      tindakLanjut: "Coba duduk bersama lagi minggu depan dan saling menyampaikan bila ada yang mengganjal.",
      tampilkanKeSiswa: true,
    },
    {
      jadwalId: selesai2,
      guruBkId: guru.dewi.id,
      ringkasanMasalah: "Kecemasan saat tampil di depan umum. Latihan napas 4-7-8 dan latihan presentasi singkat.",
      tindakLanjut: "Latihan presentasi 3 menit di depan cermin setiap hari selama seminggu.",
      tampilkanKeSiswa: true,
      perluLanjutan: true,
    },
  ])

  const ringkas = await db
    .execute(sql`select (select count(*) from pengaduan)::int as pengaduan, (select count(*) from tanggapan)::int as tanggapan,
      (select count(*) from slot_jadwal)::int as slot, (select count(*) from jadwal_konseling)::int as jadwal,
      (select count(*) from catatan_konseling)::int as catatan`)
    .then((r) => r.rows[0])
  console.log("Data demo dibuat:", ringkas)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
