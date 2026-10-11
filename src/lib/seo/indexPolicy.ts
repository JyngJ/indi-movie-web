/**
 * 검색 색인 기준 — 상영이 있는 페이지만 검색엔진에 내보낸다.
 *
 * 2026-10 애드센스가 "가치가 별로 없는 콘텐츠"로 거절했다. 사이트맵 약 3,360쪽 중
 * 영화 상세 1,897쪽·감독 1,266쪽 대부분이 "이 날 상영 정보가 없어요"뿐인 같은 틀의 페이지였다.
 * 상영이 없는 페이지는 사람이 열 수 있게 두되 색인에서 빼고(noindex, follow) 사이트맵에서도 뺀다.
 * 상영이 다시 잡히면 다음 렌더(1시간 ISR·크롤 후 태그 무효화)에서 자동으로 색인 대상이 된다.
 *
 * 순수 모듈 — Next·Supabase를 모른다.
 */

/** 상영을 보는 구간 — getMovieTheaterShowtimes의 기본 구간(오늘~13일 뒤)과 같다 */
export const INDEX_WINDOW_DAYS = 14

export interface RobotsDirective {
  index: boolean
  follow: boolean
}

/** 상영이 있으면 기본값(색인), 없으면 색인 제외 + 링크는 따라가게 */
export function robotsForScreenings(hasUpcoming: boolean): RobotsDirective | undefined {
  return hasUpcoming ? undefined : { index: false, follow: true }
}
