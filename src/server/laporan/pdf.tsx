import "@tanstack/react-start/server-only"
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { LOGO_EMAIL_PNG_BASE64 } from "../notif/logo-email"
import type { IsiLaporan } from "../services/laporan"
import { formatTanggal, formatTanggalPendek } from "@/lib/format"

// PDF laporan (DESIGN §9, Gambar 3.15 proposal). Kop memakai logo SIBK sampai sekolah memberikan
// logo resmi (PRD Q5). Huruf bawaan Helvetica agar tidak perlu memuat file font.

const LABEL: Record<string, string> = {
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  menunggu: "Menunggu persetujuan",
  disetujui: "Disetujui (belum dicatat)",
  tidak_hadir: "Tidak hadir",
  ditolak: "Ditolak",
  batal: "Dibatalkan siswa",
}

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 54, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: "#101d21", lineHeight: 1.4 },
  kop: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#0f2a2e" },
  kopTeks: { flex: 1, alignItems: "center" },
  kopSekolah: { fontSize: 15, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  kopSub: { fontSize: 10, marginTop: 2 },
  kopKecil: { fontSize: 8.5, color: "#526065", marginTop: 1 },
  garisTipis: { borderBottomWidth: 0.5, borderBottomColor: "#0f2a2e", marginTop: 2 },
  judul: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 18 },
  periode: { textAlign: "center", marginTop: 3 },
  filter: { textAlign: "center", marginTop: 2, fontSize: 9, color: "#526065" },
  bagian: { marginTop: 16 },
  subjudul: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  tabel: { borderWidth: 0.75, borderColor: "#9aa7aa" },
  barisKepala: { flexDirection: "row", backgroundColor: "#e6f1f0", borderBottomWidth: 0.75, borderBottomColor: "#9aa7aa" },
  baris: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d5dde0" },
  barisTotal: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: "#9aa7aa", backgroundColor: "#f4f8f8" },
  sel: { paddingVertical: 4, paddingHorizontal: 6, flex: 1 },
  selNo: { paddingVertical: 4, paddingHorizontal: 6, width: 28 },
  selAngka: { paddingVertical: 4, paddingHorizontal: 6, width: 70, textAlign: "right" },
  tebal: { fontFamily: "Helvetica-Bold" },
  duaKolom: { flexDirection: "row", gap: 14 },
  kolom: { flex: 1 },
  ttd: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  ttdKotak: { width: 200, alignItems: "center" },
  ttdNama: { marginTop: 54, borderTopWidth: 0.75, borderTopColor: "#101d21", paddingTop: 3, width: 180, textAlign: "center" },
  kaki: { position: "absolute", bottom: 22, left: 48, right: 48, fontSize: 7.5, color: "#526065" },
})

function Tabel({ judulKolom, baris, total }: { judulKolom: string; baris: Array<{ label: string; jumlah: number }>; total?: boolean }) {
  const jumlah = baris.reduce((n, b) => n + b.jumlah, 0)
  return (
    <View style={s.tabel}>
      <View style={s.barisKepala}>
        <Text style={[s.selNo, s.tebal]}>No</Text>
        <Text style={[s.sel, s.tebal]}>{judulKolom}</Text>
        <Text style={[s.selAngka, s.tebal]}>Jumlah</Text>
      </View>
      {baris.map((b, i) => (
        <View key={b.label} style={s.baris} wrap={false}>
          <Text style={s.selNo}>{i + 1}</Text>
          <Text style={s.sel}>{LABEL[b.label] ?? b.label}</Text>
          <Text style={s.selAngka}>{b.jumlah}</Text>
        </View>
      ))}
      {total !== false && (
        <View style={s.barisTotal}>
          <Text style={s.selNo} />
          <Text style={[s.sel, s.tebal]}>Total</Text>
          <Text style={[s.selAngka, s.tebal]}>{jumlah}</Text>
        </View>
      )}
    </View>
  )
}

export type MetaLaporan = {
  namaKategori: string | null
  namaGuru: string | null
  /** Nama di kolom tanda tangan Guru BK (pencetak bila ia Guru BK) */
  penandatangan: string | null
  dicetakOleh: string
}

function DokumenLaporan({ isi, meta }: { isi: IsiLaporan; meta: MetaLaporan }) {
  const r = isi.ringkas
  const persen = (n: number) => (r.total ? ` (${Math.round((n / r.total) * 100)}%)` : "")
  const sekarang = new Date()
  const ringkasan: Array<[string, string]> = [
    ["Jumlah pengaduan masuk", String(r.total)],
    ["Pengaduan anonim", `${r.anonim}${persen(r.anonim)}`],
    ["Pengaduan beridentitas", `${r.beridentitas}${persen(r.beridentitas)}`],
    ["Pengaduan anonim yang identitasnya dibuka siswa", String(r.dibuka)],
    ["Pengaduan yang sudah ditanggapi", `${r.dibalas}${persen(r.dibalas)}`],
    ["Rata-rata waktu tanggapan pertama", r.rataJam == null ? "-" : `${String(r.rataJam).replace(".", ",")} jam`],
    ["Pengaduan selesai", `${r.selesai}${persen(r.selesai)}`],
    ["Sesi konseling terjadwal pada periode ini", String(isi.totalSesi)],
  ]
  const filter = [meta.namaKategori && `Kategori: ${meta.namaKategori}`, meta.namaGuru && `Guru BK: ${meta.namaGuru}`].filter(Boolean).join(" · ")

  return (
    <Document title={`Laporan BK ${isi.filter.dari} sd ${isi.filter.sampai}`} author="SIBK SMK IPTEK Tangerang Selatan" language="id">
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <Image src={`data:image/png;base64,${LOGO_EMAIL_PNG_BASE64}`} style={{ width: 46, height: 47 }} />
          <View style={s.kopTeks}>
            <Text style={s.kopSekolah}>SMK IPTEK TANGERANG SELATAN</Text>
            <Text style={s.kopSub}>Layanan Bimbingan dan Konseling</Text>
            <Text style={s.kopKecil}>Sistem Informasi Bimbingan Konseling (SIBK)</Text>
          </View>
          <View style={{ width: 46 }} />
        </View>
        <View style={s.garisTipis} />

        <Text style={s.judul}>LAPORAN LAYANAN BIMBINGAN DAN KONSELING</Text>
        <Text style={s.periode}>
          Periode {formatTanggalPendek(`${isi.filter.dari}T12:00:00+07:00`)} s.d. {formatTanggalPendek(`${isi.filter.sampai}T12:00:00+07:00`)}
        </Text>
        {filter && <Text style={s.filter}>{filter}</Text>}

        <View style={s.bagian}>
          <Text style={s.subjudul}>A. Ringkasan</Text>
          <View style={s.tabel}>
            {ringkasan.map(([k, v], i) => (
              <View key={k} style={i === ringkasan.length - 1 ? [s.baris, { borderBottomWidth: 0 }] : s.baris}>
                <Text style={s.sel}>{k}</Text>
                <Text style={[s.selAngka, { width: 110 }]}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.bagian}>
          <Text style={s.subjudul}>B. Pengaduan per kategori masalah</Text>
          <Tabel judulKolom="Kategori" baris={isi.kategori} />
        </View>

        <View style={[s.bagian, s.duaKolom]} wrap={false}>
          <View style={s.kolom}>
            <Text style={s.subjudul}>C. Per tingkat urgensi</Text>
            <Tabel judulKolom="Urgensi" baris={isi.urgensi} />
          </View>
          <View style={s.kolom}>
            <Text style={s.subjudul}>D. Per status penanganan</Text>
            <Tabel judulKolom="Status" baris={isi.status} />
          </View>
        </View>

        <View style={s.bagian} wrap={false}>
          <Text style={s.subjudul}>E. Jadwal konseling tatap muka</Text>
          <Tabel judulKolom="Status sesi" baris={isi.sesi} />
        </View>

        <View wrap={false}>
          <Text style={{ marginTop: 24, textAlign: "right" }}>Tangerang Selatan, {formatTanggalPendek(sekarang)}</Text>
          <View style={s.ttd}>
            <View style={s.ttdKotak}>
              <Text>Mengetahui,</Text>
              <Text>Kepala Sekolah</Text>
              <Text style={s.ttdNama}> </Text>
            </View>
            <View style={s.ttdKotak}>
              <Text> </Text>
              <Text>Guru Bimbingan dan Konseling</Text>
              <Text style={s.ttdNama}>{meta.penandatangan ?? " "}</Text>
            </View>
          </View>
        </View>

        <Text style={s.kaki} fixed>
          {`Dicetak dari SIBK oleh ${meta.dicetakOleh}, ${formatTanggal(sekarang)}. Hanya memuat angka agregat, tanpa isi pengaduan atau identitas siswa.`}
        </Text>
      </Page>
    </Document>
  )
}

export function buatPdfLaporan(isi: IsiLaporan, meta: MetaLaporan) {
  return renderToBuffer(<DokumenLaporan isi={isi} meta={meta} />)
}
