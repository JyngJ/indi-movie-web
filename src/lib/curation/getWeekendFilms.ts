import type { LateNightCandidate, LateNightFilm, LateNightShowing } from './types'
import { dayOfWeekLabel } from './getLateNightFilms'

// ─────────────────────────────────────────────
// 이번 주말 상영 (weekend)
// 이번 주(오늘 기준) 토·일 회차를 영화 단위로 그룹.
// candidates는 useLateNightCandidates(오늘~D+7)를 그대로 재사용 —
// 오늘이 월요일이어도 이번 주 일요일까지 최대 6일 후라 항상 D+7 범위 안에 들어온다.
//
// 오늘이 일요일이면 이번 주 토요일은 이미 지났으므로 제외하고 오늘(일요일) 잔여 회차만 포함한다.
// 그 외 요일은 이번 주 남은 토·일 모두 포함하며, 둘 다 미래 날짜라 nowTime 필터가 걸리지 않는다.
// ─────────────────────────────────────────────

/** 이 편수 미만이면 섹션 자체를 숨긴다 */
export const MIN_WEEKEND_FILMS = 3

function showingSortKey(s: { showDate: string; showTime: string }) {
  return `${s.showDate}T${s.showTime}`
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * 이번 주 토·일 회차를 영화 단위로 그룹해 반환.
 *
 * @param candidates 오늘~D+7 회차 목록 (기간 밖 회차는 무시)
 * @param today ISO date "YYYY-MM-DD"
 * @param nowTime "HH:MM" — 지정 시 오늘 회차 중 이미 시작 시각이 지난 회차 제외
 * @returns 가장 가까운 회차 순으로 정렬된 영화 그룹. MIN_WEEKEND_FILMS 미만이면 빈 배열(섹션 숨김).
 */
export function getWeekendFilms(
  candidates: LateNightCandidate[],
  today: string,
  nowTime?: string,
): LateNightFilm[] {
  const dow = new Date(`${today}T12:00:00`).getDay() // 0=일 ... 6=토

  const weekendDates =
    dow === 0
      ? [today] // 일요일 — 이번 주 토요일은 이미 지남, 오늘 잔여 회차만
      : [addDays(today, 6 - dow), addDays(today, 7 - dow)] // 이번 주 남은 토·일

  const byMovie = new Map<string, LateNightFilm>()

  for (const c of candidates) {
    if (!weekendDates.includes(c.showDate)) continue
    if (nowTime && c.showDate === today && c.showTime < nowTime) continue

    const showing: LateNightShowing = {
      theaterId: c.theaterId,
      theaterName: c.theaterName,
      showDate: c.showDate,
      showTime: c.showTime.slice(0, 5),
    }

    const film = byMovie.get(c.movie.id)
    if (film) {
      film.showings.push(showing)
    } else {
      byMovie.set(c.movie.id, { movie: c.movie, showings: [showing] })
    }
  }

  const films = [...byMovie.values()]
  if (films.length < MIN_WEEKEND_FILMS) return []

  for (const film of films) {
    film.showings.sort((a, b) => showingSortKey(a).localeCompare(showingSortKey(b)))
  }

  return films.sort((a, b) => {
    const byTime = showingSortKey(a.showings[0]).localeCompare(showingSortKey(b.showings[0]))
    if (byTime !== 0) return byTime
    return b.showings.length - a.showings.length
  })
}

/**
 * 포스터 하단 서브텍스트용 카피 — 가장 가까운 주말 회차의 요일·시간·극장.
 * 예: "오늘 15:00 라이카시네마" / "토 19:30 씨네인디U · 외 2회"
 */
export function formatWeekendCaption(film: LateNightFilm, today: string): string {
  const first = film.showings[0]
  if (!first) return ''
  const dayLabel = first.showDate === today ? '오늘' : dayOfWeekLabel(first.showDate)
  const rest = film.showings.length - 1
  const base = `${dayLabel} ${first.showTime} ${first.theaterName}`
  return rest > 0 ? `${base} · 외 ${rest}회` : base
}
