import type { FestivalDetail, FestivalScreening } from '@/types/festival'
import { truncateSnippet } from './truncateSnippet'

// ─────────────────────────────────────────────
// 영화제 상세 SEO 문구 — 순수 함수.
// 사람들은 "부산국제영화제 시간표", "부국제 상영작"으로 찾는다. 제목·설명에 그 말(상영 시간표·극장)과
// 숫자(기간·회차·극장 수)를 싣고, 검색용 본문에는 날짜별 요약과 섹션별 상영작을 서버 HTML로 둔다.
// ─────────────────────────────────────────────

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-10-06" → "10월 6일" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

/** "2026-10-06" → "10월 6일 (화)" */
export function dateWithDow(iso: string): string {
  return `${shortDate(iso)} (${DOW[new Date(`${iso}T12:00:00Z`).getUTCDay()]})`
}

function venueNames(festival: FestivalDetail): string[] {
  return [...new Set(
    [...festival.theaters]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => t.theater?.name ?? t.venueText)
      .filter((name): name is string => Boolean(name)),
  )]
}

/** 회차가 있으면 "…상영 시간표 · 극장 N곳", 없으면 "…상영작·극장" — 사이트 이름은 붙이지 않는다 */
export function festivalSeoTitle(festival: FestivalDetail): string {
  const venues = venueNames(festival).length
  if (festival.screenings.length > 0) return `${festival.name} 상영 시간표${venues > 0 ? ` · 극장 ${venues}곳` : ''}`
  return `${festival.name} 상영작·극장`
}

/**
 * 메타 설명 — 운영자가 쓴 소개가 있으면 그걸, 없으면 기간·회차·극장·GV로 만든다(110자 안쪽).
 * 소개보다 숫자가 검색 결과에서 더 눌린다고 보고, 회차가 있으면 숫자 문장을 우선한다.
 */
export function festivalMetaDescription(festival: FestivalDetail): string {
  const period = `${shortDate(festival.startDate)}~${shortDate(festival.endDate)}`
  const venues = venueNames(festival)
  if (festival.screenings.length > 0) {
    const gv = festival.screenings.filter((s) => s.hasGv).length
    const lead = venues.slice(0, 3).join('·')
    const text = `${festival.name}(${period}) 상영 시간표 ${festival.screenings.length}회차를 날짜·극장별로 정리했어요.`
      + (venues.length > 0 ? ` ${lead}${venues.length > 3 ? ` 등 ${venues.length}곳` : ''}` : '')
      + (gv > 0 ? ` · GV ${gv}회차` : '')
    return truncateSnippet(text, 110) ?? text
  }
  return truncateSnippet(festival.description, 110)
    ?? `${festival.city}에서 열리는 ${festival.name}(${period}). 상영작과 극장을 모았어요.`
}

export interface FestivalScreeningSummary {
  byDate: { date: string; count: number; venues: string[] }[]
  bySection: { section: string; titles: string[] }[]
  titleCount: number
  gvCount: number
}

/** 검색용 본문 — 날짜별 회차·극장, 섹션별 상영작(중복 제목 하나로). 섹션 순서는 처음 등장한 순 */
export function summarizeFestivalScreenings(screenings: FestivalScreening[]): FestivalScreeningSummary {
  const dates = new Map<string, { count: number; venues: Set<string> }>()
  const sections = new Map<string, Set<string>>()
  const titles = new Set<string>()
  for (const s of screenings) {
    const d = dates.get(s.screeningDate) ?? { count: 0, venues: new Set<string>() }
    d.count += 1
    d.venues.add(s.venueLabel)
    dates.set(s.screeningDate, d)
    const key = s.section ?? '기타'
    const set = sections.get(key) ?? new Set<string>()
    set.add(s.movieTitleSnapshot)
    sections.set(key, set)
    titles.add(s.movieTitleSnapshot)
  }
  return {
    byDate: [...dates.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, count: v.count, venues: [...v.venues] })),
    bySection: [...sections.entries()].map(([section, set]) => ({ section, titles: [...set] })),
    titleCount: titles.size,
    gvCount: screenings.filter((s) => s.hasGv).length,
  }
}
