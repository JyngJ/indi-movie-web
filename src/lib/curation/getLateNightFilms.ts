import { isLateNightTime, LATE_NIGHT_START_TIME } from '@/lib/catalog/lateNight'
import type { LateNightCandidate, LateNightFilm, LateNightShowing } from './types'

// ─────────────────────────────────────────────
// 심야 상영 (late night)
// 오늘~D+7 회차 중 심야 시간대(기준시각 이후 또는 00:00~05:00 전) 회차를
// 영화 단위로 그룹. 기준 시각은 지도 kind='late'와 동일(src/lib/catalog/lateNight.ts).
//
// 자정 넘는 회차(00:30 등) 처리 방침:
//   show_date는 실제 시작 캘린더 날짜로 저장된다고 가정한다 — 즉 금요일 밤
//   프로그램의 00:40 회차는 show_date가 토요일. 따라서 showDate+showTime
//   문자열 그대로 시간순 비교/정렬이 성립하고, 요일 라벨도 showDate에서
//   그대로 파생한다. (극장 시간표 UI 등 앱 전체가 같은 가정으로 동작)
// ─────────────────────────────────────────────

/** 이 편수 미만이면 섹션 자체를 숨긴다 (무드 섹션이 1~2편으로 썰렁하게 뜨는 것 방지) */
export const MIN_LATE_NIGHT_FILMS = 3

function showingSortKey(s: { showDate: string; showTime: string }) {
  return `${s.showDate}T${s.showTime}`
}

/**
 * 오늘~D+7 회차 중 심야 회차를 영화 단위로 그룹해 반환.
 *
 * @param candidates 오늘~D+7 회차 목록 (기간 밖 회차는 무시, show_time 필터 전)
 * @param startDate ISO date "YYYY-MM-DD" — 기간 시작(오늘)
 * @param endDate ISO date "YYYY-MM-DD" — 기간 끝(D+7)
 * @param nowTime "HH:MM" — 지정 시 오늘 회차 중 이미 시작 시각이 지난 회차 제외
 * @param lateNightStart 심야 기준 시각 — 기본 LATE_NIGHT_START_TIME, 테스트/실험용 주입 가능
 * @returns 가장 가까운 회차 순으로 정렬된 영화 그룹. MIN_LATE_NIGHT_FILMS 미만이면 빈 배열(섹션 숨김).
 */
export function getLateNightFilms(
  candidates: LateNightCandidate[],
  startDate: string,
  endDate: string,
  nowTime?: string,
  lateNightStart: string = LATE_NIGHT_START_TIME,
): LateNightFilm[] {
  const byMovie = new Map<string, LateNightFilm>()

  for (const c of candidates) {
    if (c.showDate < startDate || c.showDate > endDate) continue
    // 오늘 이미 지난 회차 제외 — 자정 넘는 회차도 show_date가 캘린더 날짜라
    // 같은 날짜끼리 "HH:MM" 사전순 비교가 곧 시간순 비교
    if (nowTime && c.showDate === startDate && c.showTime < nowTime) continue
    if (!isLateNightTime(c.showTime, lateNightStart)) continue

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
  if (films.length < MIN_LATE_NIGHT_FILMS) return []

  for (const film of films) {
    film.showings.sort((a, b) => showingSortKey(a).localeCompare(showingSortKey(b)))
  }

  // 가장 가까운 회차를 가진 영화 우선, 동률이면 심야 회차가 많은 영화 우선
  return films.sort((a, b) => {
    const byTime = showingSortKey(a.showings[0]).localeCompare(showingSortKey(b.showings[0]))
    if (byTime !== 0) return byTime
    return b.showings.length - a.showings.length
  })
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** ISO date "YYYY-MM-DD" → 요일 한 글자. 정오 고정으로 파싱해 타임존 이슈 회피. */
export function dayOfWeekLabel(isoDate: string): string {
  return DAY_LABELS[new Date(`${isoDate}T12:00:00`).getDay()]
}

/**
 * 포스터 하단 서브텍스트용 카피 — 가장 가까운 심야 회차의 요일·시간·극장.
 * 예: "오늘 23:00 아트나인" / "금 23:30 씨네인디U · 외 2회"
 * 주의: 기간이 8일(오늘~D+7)이라 D+7은 오늘과 같은 요일 — '오늘' 라벨이 먼저 소진되므로
 * 요일 한 글자는 항상 미래의 가장 가까운 해당 요일을 가리킨다.
 */
export function formatLateNightCaption(film: LateNightFilm, today: string): string {
  const first = film.showings[0]
  if (!first) return ''
  const dayLabel = first.showDate === today ? '오늘' : dayOfWeekLabel(first.showDate)
  const rest = film.showings.length - 1
  const base = `${dayLabel} ${first.showTime} ${first.theaterName}`
  return rest > 0 ? `${base} · 외 ${rest}회` : base
}
