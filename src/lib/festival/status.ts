import { addDaysIso } from '@/lib/date'

// ─────────────────────────────────────────────
// 영화제 상태 (upcoming / ongoing / ended)
// DB엔 상태를 저장하지 않는다 — start_date/end_date vs 오늘로 런타임 계산.
// ─────────────────────────────────────────────

export type FestivalStatus = 'upcoming' | 'ongoing' | 'ended'

/**
 * @param startDate ISO date "YYYY-MM-DD"
 * @param endDate ISO date "YYYY-MM-DD"
 * @param today ISO date "YYYY-MM-DD"
 */
export function getFestivalStatus(startDate: string, endDate: string, today: string): FestivalStatus {
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'ended'
  return 'ongoing'
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

function monthDayLabel(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

/**
 * 상태별 날짜 카피 — ongoing은 "언제까지", upcoming은 "언제 시작"을 알린다.
 * @param status getFestivalStatus 결과
 * @param startDate ISO date "YYYY-MM-DD"
 * @param endDate ISO date "YYYY-MM-DD"
 * @param today ISO date "YYYY-MM-DD"
 */
export function getFestivalDateLabel(
  status: FestivalStatus,
  startDate: string,
  endDate: string,
  today: string,
): string {
  if (status === 'ended') return '종료됨'

  if (status === 'ongoing') {
    if (endDate === today) return '오늘 종료'
    if (endDate === addDaysIso(today, 1)) return '내일까지'
    return `${monthDayLabel(endDate)}까지`
  }

  // upcoming
  if (startDate === today) return '오늘 시작'
  if (startDate === addDaysIso(today, 1)) return '내일 시작'
  const dDay = daysBetween(today, startDate)
  if (dDay <= 7) return `D-${dDay}`
  return `${monthDayLabel(startDate)} 시작`
}
