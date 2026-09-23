import type { FestivalScreening, FestivalTheaterLink } from '@/types/festival'

// ─────────────────────────────────────────────
// 영화제 극장 지도 데이터 — 순수 함수.
// festival_theaters(순서·극장 연결) + 회차 → 지도 핀 목록과 좌표 없는 극장 목록.
// ─────────────────────────────────────────────

export interface FestivalMapVenue {
  /** 회차의 venueLabel과 같은 이름 — 시간표 극장 탭과 이 이름으로 이어진다 */
  name: string
  pinLabel: string
  theaterId: string | null
  lat: number
  lng: number
  address: string | null
  screeningCount: number
}

/* 지도 핀 라벨에서 떼는 앞머리 — 같은 건물·같은 동네의 핀이 몰려 긴 라벨이 서로 덮는다.
   극장 카드·시간표에는 전체 이름이 그대로 나온다 */
const PIN_LABEL_PREFIXES = ['동서대학교 ', '영화진흥위원회 ']

/** "동서대학교 소향씨어터" → "소향씨어터" */
export function shortPinLabel(name: string): string {
  const prefix = PIN_LABEL_PREFIXES.find((p) => name.startsWith(p) && name.length > p.length)
  return prefix ? name.slice(prefix.length) : name
}

/** 극장 링크의 표시 이름 — theaters에 연결된 곳은 극장 이름, 아니면 임시 장소 표기 */
export function festivalVenueName(link: FestivalTheaterLink): string | null {
  return link.theater?.name ?? link.venueText
}

/**
 * @returns pinned: 좌표가 있어 지도에 세울 극장(영화제가 정한 순서) · unpinned: 좌표가 없는 곳 이름
 *   (백화점 홀·강의실처럼 theaters에 등록하지 않은 행사장)
 */
export function buildFestivalVenueMap(
  theaters: FestivalTheaterLink[],
  screenings: FestivalScreening[],
): { pinned: FestivalMapVenue[]; unpinned: string[] } {
  const counts = new Map<string, number>()
  for (const s of screenings) counts.set(s.venueLabel, (counts.get(s.venueLabel) ?? 0) + 1)

  const pinned: FestivalMapVenue[] = []
  const unpinned: string[] = []
  const seen = new Set<string>()
  for (const link of [...theaters].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const name = festivalVenueName(link)
    if (!name || seen.has(name)) continue
    seen.add(name)
    const t = link.theater
    if (t && Number.isFinite(t.lat) && Number.isFinite(t.lng) && (t.lat !== 0 || t.lng !== 0)) {
      pinned.push({
        name, pinLabel: shortPinLabel(name), theaterId: link.theaterId,
        lat: t.lat, lng: t.lng, address: t.address || null,
        screeningCount: counts.get(name) ?? 0,
      })
    } else {
      unpinned.push(name)
    }
  }
  return { pinned, unpinned }
}
