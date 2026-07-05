import { isAlmostSoldOut } from '@/lib/catalog/seatAvailability'
import type { AlmostSoldOutCandidate, AlmostSoldOutFilm, AlmostSoldOutShowing } from './types'

// ─────────────────────────────────────────────
// 매진 임박 (almost sold out)
// 오늘~내일 회차 중 좌석 스냅샷 기준 잔여율이 낮은 회차를 영화 단위로 그룹.
// 좌석 수는 크롤 시점 스냅샷이므로 "현재 N석" 식 실시간 단정 카피 금지.
// ─────────────────────────────────────────────

/** 이 편수 미만이면 섹션 자체를 숨긴다 (희소성 섹션이 1~2편으로 썰렁하게 뜨는 것 방지) */
export const MIN_ALMOST_SOLD_OUT_FILMS = 3

function showingSortKey(s: { showDate: string; showTime: string }) {
  return `${s.showDate}T${s.showTime}`
}

/**
 * 오늘~내일 회차 중 매진 임박(잔여율 ≤ 15%, 매진 제외) 회차를 영화 단위로 그룹해 반환.
 *
 * @param candidates 좌석 스냅샷 포함 회차 목록 (오늘~내일 범위 밖 회차는 무시)
 * @param today ISO date "YYYY-MM-DD"
 * @param tomorrow ISO date "YYYY-MM-DD"
 * @param nowTime "HH:MM" — 지정 시 오늘 회차 중 이미 시작 시각이 지난 회차 제외
 * @returns 가장 임박한 회차 순으로 정렬된 영화 그룹. MIN_ALMOST_SOLD_OUT_FILMS 미만이면 빈 배열(섹션 숨김).
 */
export function getAlmostSoldOutFilms(
  candidates: AlmostSoldOutCandidate[],
  today: string,
  tomorrow: string,
  nowTime?: string,
): AlmostSoldOutFilm[] {
  const byMovie = new Map<string, AlmostSoldOutFilm>()

  for (const c of candidates) {
    if (c.showDate !== today && c.showDate !== tomorrow) continue
    if (nowTime && c.showDate === today && c.showTime < nowTime) continue
    if (!isAlmostSoldOut(c.seatAvailable, c.seatTotal)) continue

    const showing: AlmostSoldOutShowing = {
      theaterId: c.theaterId,
      theaterName: c.theaterName,
      showDate: c.showDate,
      showTime: c.showTime.slice(0, 5),
      seatAvailable: c.seatAvailable,
      seatTotal: c.seatTotal,
    }

    const film = byMovie.get(c.movie.id)
    if (film) {
      film.showings.push(showing)
    } else {
      byMovie.set(c.movie.id, { movie: c.movie, showings: [showing] })
    }
  }

  const films = [...byMovie.values()]
  if (films.length < MIN_ALMOST_SOLD_OUT_FILMS) return []

  for (const film of films) {
    film.showings.sort((a, b) => showingSortKey(a).localeCompare(showingSortKey(b)))
  }

  // 가장 임박한(빠른) 회차를 가진 영화 우선, 동률이면 임박 회차가 많은 영화 우선
  return films.sort((a, b) => {
    const byTime = showingSortKey(a.showings[0]).localeCompare(showingSortKey(b.showings[0]))
    if (byTime !== 0) return byTime
    return b.showings.length - a.showings.length
  })
}

/**
 * 포스터 하단 서브텍스트용 카피 — 가장 임박한 회차의 날짜·시간·극장만 노출.
 * 좌석 수는 스냅샷이므로 카피에 넣지 않는다. 예: "오늘 19:30 에무시네마 · 외 2회"
 */
export function formatAlmostSoldOutCaption(film: AlmostSoldOutFilm, today: string): string {
  const first = film.showings[0]
  if (!first) return ''
  const dayLabel = first.showDate === today ? '오늘' : '내일'
  const rest = film.showings.length - 1
  const base = `${dayLabel} ${first.showTime} ${first.theaterName}`
  return rest > 0 ? `${base} · 외 ${rest}회` : base
}
