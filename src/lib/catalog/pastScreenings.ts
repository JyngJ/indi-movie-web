/**
 * 지난 상영 기록 요약 — 예정된 상영이 없는 영화 상세에 "어디서 언제 상영했는지"를 싣는다.
 *
 * 2026-10 상영 없는 영화·감독 페이지를 색인에서 뺐다(indexPolicy). 같은 틀의 빈 페이지가
 * 애드센스 "가치가 별로 없는 콘텐츠" 판정을 받았기 때문이다. 대신 구글·네이버 롱테일 노출이
 * 한 주 만에 1,000쪽 가까이 빠졌다(2026-10-28 Search Console). 지난 상영 기록(screening_days)은
 * 이 사이트에만 있는 정보라, 그걸 본문으로 내면 빈 틀이 아닌 페이지가 된다.
 *
 * 순수 모듈 — Next·Supabase를 모른다. 지역은 조회하는 쪽이 극장 정보로 정해 넘긴다.
 */

export interface PastScreeningDay {
  theaterId: string
  theaterName: string
  /** 극장 지역(서울·부산 …) — resolveTheaterRegion 결과 */
  region: string
  /** YYYY-MM-DD */
  showDate: string
  showCount: number
}

export interface PastScreeningTheater {
  id: string
  name: string
  region: string
  firstDate: string
  lastDate: string
  /** 상영한 날 수 */
  days: number
}

export interface PastScreeningSummary {
  firstDate: string
  lastDate: string
  /** 상영한 날 수(극장과 무관하게 날짜 기준) */
  days: number
  /** 회차 합계 */
  shows: number
  regions: { region: string; theaters: number }[]
  /** 마지막 상영이 늦은 극장부터 */
  theaters: PastScreeningTheater[]
}

/** 오늘 이전의 기록만 요약한다. 기록이 없으면 null */
export function summarizePastScreenings(rows: readonly PastScreeningDay[], today: string): PastScreeningSummary | null {
  const past = rows.filter((r) => r.showDate < today)
  if (past.length === 0) return null

  const dates = new Set<string>()
  let shows = 0
  const byTheater = new Map<string, PastScreeningTheater & { dates: Set<string> }>()
  for (const r of past) {
    dates.add(r.showDate)
    shows += Math.max(0, r.showCount)
    const t = byTheater.get(r.theaterId)
    if (!t) {
      byTheater.set(r.theaterId, {
        id: r.theaterId, name: r.theaterName, region: r.region,
        firstDate: r.showDate, lastDate: r.showDate, days: 0, dates: new Set([r.showDate]),
      })
      continue
    }
    t.dates.add(r.showDate)
    if (r.showDate < t.firstDate) t.firstDate = r.showDate
    if (r.showDate > t.lastDate) t.lastDate = r.showDate
  }

  const theaters = [...byTheater.values()]
    .map(({ dates: d, ...t }) => ({ ...t, days: d.size }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.days - a.days || a.name.localeCompare(b.name, 'ko'))

  const regionCount = new Map<string, number>()
  for (const t of theaters) regionCount.set(t.region, (regionCount.get(t.region) ?? 0) + 1)
  const regions = [...regionCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([region, n]) => ({ region, theaters: n }))

  const sorted = [...dates].sort()
  return { firstDate: sorted[0], lastDate: sorted.at(-1)!, days: dates.size, shows, regions, theaters }
}

export interface PastScreeningStats {
  /** 상영한 날 수 */
  days: number
  /** 마지막 상영일 YYYY-MM-DD */
  lastDate: string
}

/** 영화별 상영한 날 수와 마지막 상영일 — 사이트맵(색인 기준·수정일)이 영화 전체에 적용할 때 쓴다 */
export function pastScreeningStatsByMovie(rows: readonly { movieId: string; showDate: string }[], today: string): Map<string, PastScreeningStats> {
  const byMovie = new Map<string, Set<string>>()
  for (const r of rows) {
    if (r.showDate >= today) continue
    const s = byMovie.get(r.movieId) ?? new Set<string>()
    s.add(r.showDate)
    byMovie.set(r.movieId, s)
  }
  return new Map([...byMovie.entries()].map(([id, s]) => [id, { days: s.size, lastDate: [...s].sort().at(-1)! }]))
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-10-11" → 같은 해면 "10월 11일 (토)", 다른 해면 "2025년 10월 11일 (토)" — 화면 문구 규범의 날짜 꼴 */
export function pastScreeningDateLabel(iso: string, today: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const year = today.slice(0, 4) === iso.slice(0, 4) ? '' : `${y}년 `
  return `${year}${m}월 ${d}일 (${dow})`
}

const SENTENCE_REGION_LIMIT = 3

/**
 * 본문 첫 문장 — 크롤러가 읽는 서버 HTML 문장이다.
 * "10월 13일 (월)부터 11월 2일 (일)까지 서울 3곳 · 부산 1곳에서 21일, 84회 상영했어요"
 */
export function pastScreeningSentence(s: PastScreeningSummary, today: string): string {
  /* 지역이 많으면 문장이 끝없이 길어진다 — 상위 셋만 적고 전국 합계로 묶는다 */
  const top = s.regions.slice(0, SENTENCE_REGION_LIMIT).map((r) => `${r.region} ${r.theaters}곳`).join(' · ')
  const where = s.regions.length > SENTENCE_REGION_LIMIT
    ? `전국 ${s.theaters.length}곳 (${top} 등)`
    : top
  const when = s.firstDate === s.lastDate
    ? `${pastScreeningDateLabel(s.firstDate, today)}에`
    : `${pastScreeningDateLabel(s.firstDate, today)}부터 ${pastScreeningDateLabel(s.lastDate, today)}까지`
  const amount = s.shows > 0 ? `${s.days}일, ${s.shows}회` : `${s.days}일`
  return `${when} ${where}에서 ${amount} 상영했어요`
}

/** 극장 한 줄의 보조 문구 — "10월 13일 (월) ~ 11월 2일 (일) · 12일" */
export function pastTheaterPeriodLabel(t: PastScreeningTheater, today: string): string {
  const first = pastScreeningDateLabel(t.firstDate, today)
  if (t.firstDate === t.lastDate) return first
  return `${first} ~ ${pastScreeningDateLabel(t.lastDate, today)} · ${t.days}일`
}

/** 화면에 넘기는 꼴 — 서버가 오늘 날짜로 문구까지 만들어 넘긴다(클라이언트가 다시 계산하면 하이드레이션이 어긋난다) */
export interface PastScreeningView {
  sentence: string
  theaters: { id: string; name: string; region: string; period: string }[]
  /** 목록에서 접은 극장 수 */
  moreCount: number
}

/** 극장 목록 상한 — 넘으면 "외 N곳"으로 접는다 */
export const PAST_THEATER_LIST_LIMIT = 12

export function toPastScreeningView(s: PastScreeningSummary, today: string, limit = PAST_THEATER_LIST_LIMIT): PastScreeningView {
  return {
    sentence: pastScreeningSentence(s, today),
    theaters: s.theaters.slice(0, limit).map((t) => ({
      id: t.id, name: t.name, region: t.region, period: pastTheaterPeriodLabel(t, today),
    })),
    moreCount: Math.max(0, s.theaters.length - limit),
  }
}
