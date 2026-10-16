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

/* 상영이 없어도 다시 여는 영화 (2026-10, 1단계).
   상영 없는 영화 상세에 "비슷한 상영작"과 다시 상영 알림을 넣었다(NoScreeningPanel). 그래도 1,400쪽을
   한꺼번에 열면 같은 판정을 다시 받을 수 있어, 자기 내용(시놉시스)이 있고 **같은 감독의 다른 영화가
   지금 상영 중인** 영화만 먼저 연다 — 상영 없는 1,753편 중 203편(2026-10-16 실측).
   비슷한 영화 2편 이상(장르 포함)으로 잡으면 1,134편이라 사실상 전부 여는 셈이었다.
   2~3주 Search Console·애드센스 반응을 보고 장르 기준(점수 3 이상 3편 → 567편)으로 넓힌다. */
export const REOPEN_MIN_SYNOPSIS_CHARS = 80

export interface MovieIndexFacts {
  hasUpcoming: boolean
  synopsisLength: number
  /** 지금 상영 중인 같은 감독 영화 수 */
  sameDirectorNowShowing: number
}

export function shouldIndexMovie(f: MovieIndexFacts): boolean {
  if (f.hasUpcoming) return true
  return f.synopsisLength >= REOPEN_MIN_SYNOPSIS_CHARS && f.sameDirectorNowShowing > 0
}

/** 영화 상세 robots — 색인 대상이면 기본값, 아니면 색인 제외 + 링크는 따라가게 */
export function robotsForMovie(f: MovieIndexFacts): RobotsDirective | undefined {
  return robotsForScreenings(shouldIndexMovie(f))
}
