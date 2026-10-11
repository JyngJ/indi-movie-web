import { getRegionFromAddress } from '@/lib/regions'
import { INDEX_WINDOW_DAYS } from './indexPolicy'

/**
 * 영화 상세의 상영 요약 한 줄 — 이 사이트에만 있는 정보(독립영화관 상영 현황)를 서버 HTML 문장으로 낸다.
 *
 * 2026-10 애드센스 "가치가 별로 없는 콘텐츠" 거절 대응. 상영 정보가 칩·버튼으로만 보여서
 * 크롤러가 읽는 본문엔 메타데이터와 다른 곳에도 있는 시놉시스만 남았다.
 *
 * 서버가 한 번 계산해 넘긴다. 클라이언트가 지금 시각으로 다시 계산하면 캐시된 HTML(ISR 1시간)과
 * 문장이 달라져 하이드레이션이 어긋난다. 그래서 시각이 아니라 날짜 단위로만 말한다.
 */

export interface SummaryEntry {
  theaterName: string
  theaterAddress: string
  dateGroups: { date: string; showtimes: unknown[] }[]
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-10-11" → "10월 11일 (토)" — 화면 문구 규범의 날짜 꼴 */
function dateLabel(iso: string, today: string): string {
  if (iso === today) return '오늘'
  const [y, m, d] = iso.split('-').map(Number)
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}월 ${d}일 (${dow})`
}

export function buildMovieScreeningSummary(entries: SummaryEntry[], today: string): string | null {
  const active = entries
    .map((e) => ({ ...e, dateGroups: e.dateGroups.filter((g) => g.date >= today && g.showtimes.length > 0) }))
    .filter((e) => e.dateGroups.length > 0)
  if (active.length === 0) return null

  const total = active.reduce((n, e) => n + e.dateGroups.reduce((k, g) => k + g.showtimes.length, 0), 0)

  const byRegion = new Map<string, number>()
  for (const e of active) {
    const region = getRegionFromAddress(e.theaterAddress)
    byRegion.set(region, (byRegion.get(region) ?? 0) + 1)
  }
  const regions = [...byRegion.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([region, n]) => `${region} ${n}곳`)
    .join(' · ')

  const firsts = active
    .map((e) => ({ name: e.theaterName, date: e.dateGroups.map((g) => g.date).sort()[0] }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'ko'))
  const first = firsts[0]
  const last = active.flatMap((e) => e.dateGroups.map((g) => g.date)).sort().at(-1)!

  const weeks = Math.round(INDEX_WINDOW_DAYS / 7)
  const parts = [
    `앞으로 ${weeks}주 동안 ${active.length}곳에서 ${total}회 상영해요 (${regions})`,
    `첫 상영 ${dateLabel(first.date, today)} ${first.name}`,
  ]
  if (last !== first.date) parts.push(`마지막 상영 ${dateLabel(last, today)}`)
  return parts.join(' · ')
}
