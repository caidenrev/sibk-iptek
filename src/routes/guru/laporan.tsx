import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { HalamanLaporan, periodeLaporan, searchLaporanSchema } from "@/components/app/halaman-laporan"
import { laporanFn, opsiLaporanFn } from "@/server/functions/laporan"

export const Route = createFileRoute("/guru/laporan")({
  validateSearch: searchLaporanSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [isi, opsi] = await Promise.all([
      laporanFn({ data: { ...periodeLaporan(deps), kategoriId: deps.kategoriId, guruBkId: deps.guruBkId } }),
      opsiLaporanFn(),
    ])
    return { isi, opsi }
  },
  head: () => ({ meta: [{ title: "Laporan · SIBK" }] }),
  component: Laporan,
})

function Laporan() {
  const { isi, opsi } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return <HalamanLaporan isi={isi} opsi={opsi} search={search} ubah={(p) => navigate({ search: (s) => ({ ...s, ...p }) })} />
}
