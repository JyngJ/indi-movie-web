import type { FestivalScreening } from '@/types/festival'
import { normalizeTime } from './timetable'

// ─────────────────────────────────────────────
// 영화제 하위 페이지 — 날짜별 시간표(/festival/biff31/2026-10-08)와 GV 일정(/festival/biff31/gv).
// 한 주소에 회차 전체가 있으면 "부국제 10월 8일 시간표", "부국제 GV 일정" 같은 구체적인 검색어에
// 걸릴 페이지가 없다. 주소 해석·회차 추리기만 두는 순수 모듈(React·Supabase 의존 없음).
// ─────────────────────────────────────────────

export type FestivalView = { kind: 'day'; date: string } | { kind: 'gv' }

/** 주소 판단에 필요한 회차 필드만 — sitemap은 회차 전체를 읽지 않는다 */
type ScreeningKey = Pick<FestivalScreening, 'screeningDate' | 'hasGv'>

export const GV_VIEW_SEGMENT = 'gv'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** 주소 조각 → 하위 페이지. 회차가 없는 날짜·GV 회차가 없는 영화제는 null(404) — 빈 페이지를 색인시키지 않는다 */
export function parseFestivalView(segment: string, screenings: ScreeningKey[]): FestivalView | null {
  if (segment === GV_VIEW_SEGMENT) return screenings.some((s) => s.hasGv) ? { kind: 'gv' } : null
  if (ISO_DATE.test(segment) && screenings.some((s) => s.screeningDate === segment)) return { kind: 'day', date: segment }
  return null
}

export function festivalViewSegment(view: FestivalView): string {
  return view.kind === 'gv' ? GV_VIEW_SEGMENT : view.date
}

export function festivalViewPath(slug: string, view: FestivalView): string {
  return `/festival/${slug}/${festivalViewSegment(view)}`
}

/** 하위 페이지 목록 — 회차가 있는 날짜(날짜순) + GV 회차가 있으면 GV. sitemap과 본문 링크가 같이 쓴다 */
export function listFestivalViews(screenings: ScreeningKey[]): FestivalView[] {
  const dates = [...new Set(screenings.map((s) => s.screeningDate))].sort()
  const views: FestivalView[] = dates.map((date) => ({ kind: 'day', date }))
  if (screenings.some((s) => s.hasGv)) views.push({ kind: 'gv' })
  return views
}

/** 하위 페이지에 실을 회차 — 날짜 → 시작 시각 → 극장 → 관 순 */
export function selectViewScreenings(screenings: FestivalScreening[], view: FestivalView): FestivalScreening[] {
  return screenings
    .filter((s) => (view.kind === 'gv' ? s.hasGv : s.screeningDate === view.date))
    .sort((a, b) =>
      a.screeningDate.localeCompare(b.screeningDate)
      || normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime))
      || a.venueLabel.localeCompare(b.venueLabel)
      || (a.screenLabel ?? '').localeCompare(b.screenLabel ?? ''),
    )
}
