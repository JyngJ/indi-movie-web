'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from '@/components/domain/MapPin'
import { Button, Icon } from '@/components/primitives'
import { FavoriteToggle } from '@/components/domain/favorites/FavoriteToggle'
import { cartoTileTemplate } from '@/lib/map/basemap'
import { naverDirectionsUrls } from '@/lib/map/directions'
import { isMultiplexVenue, multiplexNotice } from '@/lib/festival/venue'
import { trackEvent } from '@/lib/analytics/client'
import type { FestivalMapVenue } from '@/lib/festival/venueMap'

/**
 * 영화제 극장 지도 — 극장마다 지도 탭과 같은 핀(MapPin)을 세우고, 핀을 누르면 그 극장 카드를 띄운다.
 * 카드: 길찾기 · 관심 극장 · 시간표 보기(아래 시간표를 그 극장으로 맞춘다).
 *
 * Leaflet이 window를 만지므로 FestivalDetailClient가 dynamic(ssr: false)으로 불러온다.
 * 타일 주소는 basemap.ts 한 곳에서만 온다(AGENTS.md 지도 베이스맵 규칙).
 */

/* MapView와 같은 핀 치수 — 라벨 20 + 간격 4 + 점 22. 앵커는 점의 중심 */
const PIN_W = 160
const LABEL_H = 20
const GAP = 4
const DOT = 22
const ANCHOR_Y = LABEL_H + GAP + DOT / 2
/* PC 극장 카드 폭 — 지도 오른쪽 위에 뜬다 */
const CARD_W = 340

interface Props {
  venues: FestivalMapVenue[]
  selected: string | null
  onSelect: (name: string | null) => void
  onShowTimetable: (name: string) => void
  isFavoriteTheater: (theaterId: string) => boolean
  isDesktop: boolean
  /** 멀티플렉스 안내 문구를 고른다 — 이 영화제 회차 표가 있는가 */
  hasScreenings: boolean
}

function pinIcon(label: string, selected: boolean, favorite: boolean) {
  const html = renderToStaticMarkup(
    <MapPin selected={selected} favorite={favorite ? 'theater' : 'none'} label={label} />,
  )
  return L.divIcon({
    html: `<div style="width:${PIN_W}px;display:flex;justify-content:center;">${html}</div>`,
    className: '',
    iconSize: [PIN_W, LABEL_H + GAP + DOT],
    iconAnchor: [PIN_W / 2, ANCHOR_Y],
  })
}

/** 처음 한 번 모든 극장이 들어오게 맞춘다 — 사용자가 옮긴 뒤엔 건드리지 않는다 */
function FitVenues({ venues, rightInset }: { venues: FestivalMapVenue[]; rightInset: number }) {
  const map = useMap()
  useEffect(() => {
    if (venues.length === 0) return
    if (venues.length === 1) { map.setView([venues[0].lat, venues[0].lng], 16); return }
    // 위는 라벨 높이만큼 더, 오른쪽은 PC에서 떠 있는 극장 카드 폭만큼 비워 핀이 가려지지 않게
    map.fitBounds(L.latLngBounds(venues.map((v) => [v.lat, v.lng] as [number, number])), {
      paddingTopLeft: [48, 64], paddingBottomRight: [48 + rightInset, 40], maxZoom: 17,
    })
    // 극장 목록·카드 자리가 바뀔 때만 다시 맞춘다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues.map((v) => v.name).join('|'), rightInset])
  return null
}

export default function FestivalVenueMap({ venues, selected, onSelect, onShowTimetable, isFavoriteTheater, isDesktop, hasScreenings }: Props) {
  const center = useMemo<[number, number]>(
    () => (venues.length ? [venues[0].lat, venues[0].lng] : [35.17, 129.13]),
    [venues],
  )
  const current = venues.find((v) => v.name === selected) ?? null

  const openDirections = (venue: FestivalMapVenue) => {
    trackEvent('directions clicked', { theater_id: venue.theaterId, theater_name: venue.name, source: 'festival_venue_map' })
    const { app, web } = naverDirectionsUrls(venue)
    const a = document.createElement('a')
    a.href = app
    a.click()
    setTimeout(() => window.open(web, '_blank', 'noopener'), 1500)
  }

  const card = current && (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)',
        borderRadius: 'var(--radius-popover)', backgroundColor: 'var(--color-surface-card)',
        border: isDesktop ? 'none' : '1px solid var(--color-border)',
        boxShadow: isDesktop ? 'var(--shadow-lg)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-2)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{current.name}</div>
          {current.address && (
            <div style={{ marginTop: 'var(--spacing-1)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', wordBreak: 'keep-all' }}>{current.address}</div>
          )}
          <div style={{ marginTop: 'var(--spacing-1)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
            영화제 {current.screeningCount}회차
          </div>
          {isMultiplexVenue(current.name) && (
            <div style={{ marginTop: 'var(--spacing-1)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', wordBreak: 'keep-all' }}>
              {multiplexNotice(current.name, hasScreenings)}
            </div>
          )}
        </div>
        {current.theaterId && <FavoriteToggle type="theater" id={current.theaterId} label={current.name} size={44} />}
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Button variant="secondary" size="md" onClick={() => openDirections(current)} style={{ flex: 1 }}>
          <Icon name="map-pinned" size={16} strokeWidth={1.75} color="currentColor" />
          길찾기
        </Button>
        {current.screeningCount > 0 && (
          <Button variant="tertiary" size="md" onClick={() => onShowTimetable(current.name)} style={{ flex: 1 }}>
            시간표 보기
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', padding: '0 var(--gutter)' }}>
      <div style={{ position: 'relative', height: isDesktop ? 480 : 320, borderRadius: 'var(--radius-control)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {/* isolation — Leaflet 패널(z 200~700)을 이 상자 안에 가둬, 위에 띄우는 카드가 --z-map-popup으로 이긴다 */}
        <MapContainer
          center={center}
          zoom={15}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%', isolation: 'isolate' }}
        >
          <TileLayer url={cartoTileTemplate('light')} />
          <FitVenues venues={venues} rightInset={isDesktop ? CARD_W + 16 : 0} />
          {venues.map((venue) => (
            <Marker
              key={venue.name}
              position={[venue.lat, venue.lng]}
              icon={pinIcon(venue.pinLabel, venue.name === selected, venue.theaterId ? isFavoriteTheater(venue.theaterId) : false)}
              zIndexOffset={venue.name === selected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(venue.name === selected ? null : venue.name) }}
            />
          ))}
        </MapContainer>
        {/* PC는 지도 위 오른쪽에 카드를 띄운다 — 모바일은 지도를 가리지 않게 아래로 */}
        {isDesktop && card && (
          <div style={{ position: 'absolute', top: 'var(--spacing-4)', right: 'var(--spacing-4)', width: CARD_W, zIndex: 'var(--z-map-popup)' }}>
            {card}
          </div>
        )}
      </div>
      {!isDesktop && card}
    </div>
  )
}
