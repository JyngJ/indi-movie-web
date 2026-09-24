import type { Festival } from '@/types/festival'
import { getFestivalDateLabel, getFestivalStatus } from './status'

// ─────────────────────────────────────────────
// 상영작 탭 상단 영화제 바로가기 칩 — 어떤 영화제를 언제 띄울지 고르는 순수 함수.
//
// 배너(FestivalBannerCard)는 한 번에 하나만, 페이지 한참 아래에 있다. 영화제 회기엔
// 관객이 그 영화제를 찾아 들어오므로, 필터 줄 바로 아래에 바로가기를 둔다.
// 회기가 끝나면 코드를 고치지 않아도 사라진다 — 날짜만 보고 판단한다.
// ─────────────────────────────────────────────

/** 개막 며칠 전부터 칩을 띄울지 — 예매·라인업 관심이 붙는 구간 */
export const SHORTCUT_LEAD_DAYS = 30

function daysUntil(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY
  return Math.round((to - from) / 86_400_000)
}

/**
 * 칩으로 띄울 영화제 — 진행 중이거나 개막이 leadDays 안으로 다가온 것.
 * 종료된 영화제는 제외한다. 개막일 순으로 가까운 것부터.
 *
 * @param today ISO date "YYYY-MM-DD"
 */
export function selectShortcutFestivals(
  festivals: Festival[],
  today: string,
  leadDays: number = SHORTCUT_LEAD_DAYS,
): Festival[] {
  return festivals
    .filter((f) => {
      const status = getFestivalStatus(f.startDate, f.endDate, today)
      if (status === 'ended') return false
      if (status === 'ongoing') return true
      return daysUntil(today, f.startDate) <= leadDays
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** 칩 안에 들어갈 날짜 꼬리 — "D-12", "내일까지" 등. 이름은 칩이 따로 그린다. */
export function festivalShortcutDateLabel(festival: Festival, today: string): string {
  const status = getFestivalStatus(festival.startDate, festival.endDate, today)
  return getFestivalDateLabel(status, festival.startDate, festival.endDate, today)
}
