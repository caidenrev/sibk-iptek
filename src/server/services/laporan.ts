import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"
import { db } from "../db/client"

// Laporan layanan BK (KF-12). Hanya angka agregat: tidak memuat isi aduan, nama siswa, atau catatan,
// sehingga aman dibuka admin maupun Guru BK.

export type FilterLaporan = { dari: string; sampai: string; kategoriId?: number; guruBkId?: number }

type Baris = { label: string; jumlah: number }

export async function hitungLaporan(f: FilterLaporan) {
  // Periode dihitung dalam WIB: dari 00.00 tanggal awal sampai sebelum 00.00 sehari setelah tanggal akhir.
  const awal = sql`(${f.dari}::date)::timestamp at time zone 'Asia/Jakarta'`
  const akhir = sql`(${f.sampai}::date + 1)::timestamp at time zone 'Asia/Jakarta'`
  const saringAduan = sql`p.created_at >= ${awal} and p.created_at < ${akhir}
    ${f.kategoriId ? sql`and p.kategori_id = ${f.kategoriId}` : sql``}
    ${f.guruBkId ? sql`and p.guru_bk_id = ${f.guruBkId}` : sql``}`
  const saringSesi = sql`s.tanggal between ${f.dari}::date and ${f.sampai}::date
    ${f.guruBkId ? sql`and s.guru_bk_id = ${f.guruBkId}` : sql``}`

  const q = <T,>(x: ReturnType<typeof sql>) => db.execute(x).then((r) => r.rows as unknown as Array<T>)
  const [[ringkas], kategori, urgensi, status, sesi] = await Promise.all([
    q<{ total: number; anonim: number; beridentitas: number; dibuka: number; dibalas: number; rataJam: number | null; selesai: number }>(sql`
      select count(*)::int as total,
             count(*) filter (where p.is_anonim)::int as anonim,
             count(*) filter (where not p.is_anonim)::int as beridentitas,
             count(*) filter (where p.is_anonim and p.identitas_dibuka_pada is not null)::int as dibuka,
             count(t.pertama)::int as dibalas,
             round(avg(extract(epoch from (t.pertama - p.created_at)) / 3600)::numeric, 1)::float as "rataJam",
             count(*) filter (where p.status = 'selesai')::int as selesai
      from pengaduan p
      left join lateral (
        select min(created_at) as pertama from tanggapan where pengaduan_id = p.id and pengirim = 'guru_bk'
      ) t on true
      where ${saringAduan}`),
    // Semua kategori aktif tampil, termasuk yang nol (BB-25: periode kosong tetap menampilkan angka 0).
    q<Baris>(sql`
      select k.nama_kategori as label, count(p.id)::int as jumlah
      from kategori_masalah k
      left join pengaduan p on p.kategori_id = k.id and ${saringAduan}
      where k.is_active ${f.kategoriId ? sql`and k.id = ${f.kategoriId}` : sql``}
      group by k.id, k.nama_kategori order by k.id`),
    q<Baris>(sql`
      select u.v as label, count(p.id)::int as jumlah
      from unnest(array['tinggi','sedang','rendah']) with ordinality as u(v, n)
      left join pengaduan p on p.tingkat_urgensi::text = u.v and ${saringAduan}
      group by u.v, u.n order by u.n`),
    q<Baris>(sql`
      select u.v as label, count(p.id)::int as jumlah
      from unnest(array['baru','diproses','selesai']) with ordinality as u(v, n)
      left join pengaduan p on p.status::text = u.v and ${saringAduan}
      group by u.v, u.n order by u.n`),
    q<Baris>(sql`
      select u.v as label, count(j.id)::int as jumlah
      from unnest(array['menunggu','disetujui','selesai','tidak_hadir','ditolak','batal']) with ordinality as u(v, n)
      left join (jadwal_konseling j join slot_jadwal s on s.id = j.slot_id) on j.status::text = u.v and ${saringSesi}
      group by u.v, u.n order by u.n`),
  ])

  return {
    filter: f,
    ringkas,
    kategori,
    urgensi,
    status,
    sesi,
    totalSesi: sesi.reduce((n, s) => n + s.jumlah, 0),
  }
}

export type IsiLaporan = Awaited<ReturnType<typeof hitungLaporan>>
