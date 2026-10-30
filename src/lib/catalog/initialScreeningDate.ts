import { toKstIsoDate } from '@/lib/date'

type ScreeningTime = { showTime: string; endTime?: string | null }

/** 첫 진입에만 사용한다. 상영 중인 회차는 남겨 두고, 모두 종료됐을 때 다음 상영일을 고른다. */
export function initialScreeningDate(
  activeDates: ReadonlySet<string>,
  todayShowtimes: readonly ScreeningTime[],
  now: Date,
): string | undefined {
  const today = toKstIsoDate(now)
  const midnight = Date.parse(`${today}T00:00:00+09:00`)
  const minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  const hasUnfinishedScreening = todayShowtimes.some((st) => {
    const start = minutes(st.showTime)
    let end = st.endTime ? minutes(st.endTime) : start + 120
    // 자정을 넘기는 심야 회차의 종료 시각은 다음 날이다.
    if (end < start) end += 24 * 60
    return midnight + end * 60_000 > now.getTime()
  })
  if (hasUnfinishedScreening) return today
  return [...activeDates].filter((date) => date > today).sort()[0]
}
