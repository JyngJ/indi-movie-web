import type { LastWeekFilm } from './types'

// ─────────────────────────────────────────────
// 막바지 상영 D-N 재계산
// curation_cache.last_week_films의 daysLeft는 스냅샷을 만든 날 기준으로 고정된다.
// 스냅샷은 하루 한 번(새벽 크롤) 갱신되므로, 자정을 넘기면 오늘이 마지막인 영화가
// 다음 갱신까지 "D-1"로 남는다. maxShowDate는 날짜가 지나도 변하지 않는 사실이라
// 읽는 쪽이 오늘 날짜로 다시 센다.
// ─────────────────────────────────────────────

const DAY_MS = 86_400_000

/** "YYYY-MM-DD" 두 날짜의 차이(일). to가 from보다 뒤면 양수 */
function diffDays(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS)
}

/**
 * 오늘(KST "YYYY-MM-DD") 기준으로 이미 끝난 영화를 빼고 daysLeft를 다시 센다.
 * regionId를 주면 그 지역에서 상영 중인 영화만 남긴다.
 */
export function refreshLastWeekFilms(
  films: LastWeekFilm[],
  todayIso: string,
  regionId?: string | null,
): LastWeekFilm[] {
  const out: LastWeekFilm[] = []
  for (const film of films) {
    if (film.maxShowDate < todayIso) continue
    if (regionId && !film.regions?.includes(regionId)) continue
    const daysLeft = diffDays(todayIso, film.maxShowDate)
    out.push(daysLeft === film.daysLeft ? film : { ...film, daysLeft })
  }
  return out
}
