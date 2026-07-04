import type { TheaterLeadtimeSample } from './types'

/** 이 미만 표본이면 리드타임을 신뢰할 수 없다고 보고 null(미상) 처리 */
export const MIN_LEADTIME_SAMPLES = 10

/** show_date - created_at(날짜부분) 사이 일수. 음수(과거 데이터 정정 등 이상치)는 제외 */
export function toLeadtimeDiffs(samples: TheaterLeadtimeSample[]): number[] {
  return samples
    .map(({ showDate, createdAt }) => {
      const show = Date.parse(`${showDate}T00:00:00Z`)
      const created = Date.parse(`${createdAt.slice(0, 10)}T00:00:00Z`)
      return Math.round((show - created) / 86400000)
    })
    .filter((diff) => Number.isFinite(diff) && diff >= 0)
}

/**
 * 극장의 통상 공개 리드타임(일)을 표본에서 추정한다.
 * 오탐이 미탐보다 나쁘므로 보수적으로 p25(하위 25%)를 쓴다 — 실제보다 낮게 잡을수록
 * "리드타임 안에 있으니 아직 확정 아님" 쪽으로 기운다.
 * 표본이 부족하면(MIN_LEADTIME_SAMPLES 미만) null — 판정 로직은 이를 "미상"으로 다뤄야 한다.
 */
export function computeLeadtimeDays(diffDays: number[]): number | null {
  if (diffDays.length < MIN_LEADTIME_SAMPLES) return null
  const sorted = [...diffDays].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * 0.25)
  return sorted[idx]
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * "이 영화의 상영 마지막 날"이 데이터 부재가 아니라 진짜 종영인지 판정한다.
 * 상영 중인 모든 극장이 "자기 통상 리드타임만큼의 미래"까지는 이미 공개했어야 하는데도
 * 그 이후 이 영화가 없을 때만 종영 신호로 인정한다 — 즉 극장이 "더 보여줄 수 있었는데 안 보여줌".
 * 리드타임을 모르는 극장이 하나라도 섞여 있으면 보수적으로 미확정 처리.
 */
export function isLeadtimeConfirmed(
  theaterMaxDates: Array<{ theaterId: string; maxShowDate: string }>,
  leadtimeByTheater: Map<string, number | null>,
  todayIso: string,
): boolean {
  if (theaterMaxDates.length === 0) return false

  return theaterMaxDates.every(({ theaterId, maxShowDate }) => {
    const leadtimeDays = leadtimeByTheater.get(theaterId)
    if (leadtimeDays == null) return false
    const horizon = addDaysIso(todayIso, leadtimeDays)
    return maxShowDate < horizon
  })
}
