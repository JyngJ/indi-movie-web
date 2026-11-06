import { MapTheaterRoute } from '@/components/map/MapTheaterRoute'

/** 지도에서 극장 시트를 펼쳤을 때의 극장 주소 — 그리는 건 지도(MapView)의 시트이고, 여기서는 표시만 켠다 */
export default async function InterceptedTheaterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MapTheaterRoute id={id} />
}
