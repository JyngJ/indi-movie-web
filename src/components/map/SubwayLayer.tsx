'use client'

import { memo } from 'react'
import { GeoJSON, Marker } from 'react-leaflet'
import {
  SUBWAY_LINES,
  SUBWAY_LINE_MIN_ZOOM,
  subwayLineStyle,
  makeStationIcon,
} from '@/lib/map/subwayUtils'
import type { Station } from '@/types/api'

interface SubwayLayerProps {
  zoom: number
  subwayLayerReady: boolean
  isDark: boolean
  visibleStations: Station[]
}

function SubwayLayerComponent({
  zoom,
  subwayLayerReady,
  isDark,
  visibleStations,
}: SubwayLayerProps) {
  return (
    <>
      {/* 지하철 노선 그리기 */}
      {zoom >= SUBWAY_LINE_MIN_ZOOM && subwayLayerReady && SUBWAY_LINES.features.length > 0 && (
        <GeoJSON
          key={`subway-lines-${zoom >= SUBWAY_LINE_MIN_ZOOM ? 'on' : 'off'}-${isDark ? 'dark' : 'light'}`}
          data={SUBWAY_LINES}
          style={(feature) => subwayLineStyle(feature, isDark)}
          interactive={false}
        />
      )}

      {/* 지하철 역 마커 그리기 */}
      {visibleStations.map((station) => (
        <Marker
          key={`station-${station.id}`}
          position={[station.lat, station.lng]}
          icon={makeStationIcon(station, isDark, zoom)}
          interactive={false}
          zIndexOffset={-1000}
        />
      ))}
    </>
  )
}

// React.memo를 사용해 부모의 상태 변화로 인한 불필요한 지하철 레이어 리렌더링 및 DOM diffing 차단
export const SubwayLayer = memo(
  SubwayLayerComponent,
  (prev, next) =>
    prev.zoom === next.zoom &&
    prev.subwayLayerReady === next.subwayLayerReady &&
    prev.isDark === next.isDark &&
    prev.visibleStations === next.visibleStations // 레퍼런스 비교
)
