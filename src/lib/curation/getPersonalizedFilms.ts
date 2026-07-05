import type { Movie } from '@/types/api'

// ─────────────────────────────────────────────
// 이런 작품은 어때요 (personalized films) — 규칙 기반 1단계
// 신호원: 쿠키 기반 최근 조회 이력(영화 id). 서버/배치 없음, 순수 함수.
// 폴백 체인: ① 감독 일치 → ② 같은 국가 + 연도 ±10년 → ③ 같은 장르 → ④ 빈 배열
// 동시 상영작 풀이 작아(100~170편) 엄격한 매칭은 자주 공집합 — 느슨한 폴백이 의도된 설계.
// ─────────────────────────────────────────────

export type PersonalizedReasonType = 'director' | 'nation-era' | 'genre'

/** 추천 근거 — 문구 조립은 UI(컴포넌트)에서 한다 */
export interface PersonalizedReason {
  type: PersonalizedReasonType
  /** 근거가 된 최근 본 영화 */
  sourceMovie: Movie
  /** type === 'director' — 일치한 감독 이름 */
  director?: string
  /** type === 'nation-era' — 일치한 국가 */
  nation?: string
  /** type === 'genre' — 일치한 장르 */
  genre?: string
}

export interface PersonalizedGroup {
  reason: PersonalizedReason
  movies: Movie[]
}

export interface GetPersonalizedFilmsOptions {
  /** 이 편수를 못 채우는 reason 그룹은 버린다 (기본 3) */
  minMoviesPerGroup?: number
  /** 그룹당 최대 편수 (기본 10) */
  maxMoviesPerGroup?: number
  /** 반환할 최대 그룹 수 (기본 1) */
  maxGroups?: number
}

export const PERSONALIZED_MIN_MOVIES_PER_GROUP = 3
export const PERSONALIZED_MAX_MOVIES_PER_GROUP = 10
export const PERSONALIZED_NATION_ERA_YEAR_RANGE = 10

/** 결정적 정렬 — 같은 입력이면 항상 같은 출력 (연도 내림차순 → 제목 → id) */
function compareMovies(a: Movie, b: Movie): number {
  if (a.year !== b.year) return b.year - a.year
  const byTitle = a.title.localeCompare(b.title, 'ko')
  if (byTitle !== 0) return byTitle
  return a.id.localeCompare(b.id)
}

/**
 * 최근 본 영화 이력으로 현재 상영작 중 추천 그룹을 만든다.
 *
 * 규칙:
 * - 후보는 현재 상영작(activeMovieIds)이면서 최근 본 영화 자신이 아닌 것만
 * - 결과 내 중복 제외 (앞 그룹에 들어간 영화는 뒷 그룹에서 제외)
 * - minMoviesPerGroup 못 채우는 그룹은 버림
 * - 폴백 체인 순서대로 시도, 끝까지 부족하면 빈 배열
 *
 * @param recentMovieIds 최근 본 영화 id — 최신순 정렬 가정
 * @param allMovies      전체 영화 목록 (메타 포함)
 * @param activeMovieIds 현재 상영작 id 집합
 */
export function getPersonalizedFilms(
  recentMovieIds: string[],
  allMovies: Movie[],
  activeMovieIds: Set<string>,
  options: GetPersonalizedFilmsOptions = {},
): PersonalizedGroup[] {
  const {
    minMoviesPerGroup = PERSONALIZED_MIN_MOVIES_PER_GROUP,
    maxMoviesPerGroup = PERSONALIZED_MAX_MOVIES_PER_GROUP,
    maxGroups = 1,
  } = options

  const movieById = new Map(allMovies.map((m) => [m.id, m]))
  const recentMovies = recentMovieIds
    .map((id) => movieById.get(id))
    .filter((m): m is Movie => m != null)
  if (recentMovies.length === 0) return []

  const recentIdSet = new Set(recentMovieIds)
  // 후보 풀: 현재 상영작 ∧ 최근 본 영화 자신 제외 — 미리 결정적 정렬
  const pool = allMovies
    .filter((m) => activeMovieIds.has(m.id) && !recentIdSet.has(m.id))
    .sort(compareMovies)
  if (pool.length === 0) return []

  const usedMovieIds = new Set<string>()
  const usedSourceIds = new Set<string>()
  const groups: PersonalizedGroup[] = []

  function tryAddGroup(reason: PersonalizedReason, matches: Movie[]): boolean {
    if (matches.length < minMoviesPerGroup) return false
    const movies = matches.slice(0, maxMoviesPerGroup)
    for (const m of movies) usedMovieIds.add(m.id)
    usedSourceIds.add(reason.sourceMovie.id)
    groups.push({ reason, movies })
    return true
  }

  function available(): Movie[] {
    return pool.filter((m) => !usedMovieIds.has(m.id))
  }

  // ① 최근 본 영화의 감독 일치
  for (const source of recentMovies) {
    if (groups.length >= maxGroups) return groups
    if (usedSourceIds.has(source.id)) continue
    for (const director of source.director) {
      if (!director) continue
      const matches = available().filter((m) => m.director.includes(director))
      if (tryAddGroup({ type: 'director', sourceMovie: source, director }, matches)) break
    }
  }

  // ② 같은 국가 + 연도 ±10년
  for (const source of recentMovies) {
    if (groups.length >= maxGroups) return groups
    if (usedSourceIds.has(source.id)) continue
    if (!source.nation) continue
    const matches = available().filter(
      (m) =>
        m.nation === source.nation &&
        Math.abs(m.year - source.year) <= PERSONALIZED_NATION_ERA_YEAR_RANGE,
    )
    tryAddGroup({ type: 'nation-era', sourceMovie: source, nation: source.nation }, matches)
  }

  // ③ 같은 장르
  for (const source of recentMovies) {
    if (groups.length >= maxGroups) return groups
    if (usedSourceIds.has(source.id)) continue
    for (const genre of source.genre) {
      if (!genre) continue
      const matches = available().filter((m) => m.genre.includes(genre))
      if (tryAddGroup({ type: 'genre', sourceMovie: source, genre }, matches)) break
    }
  }

  // ④ 그래도 부족하면 빈 배열 (있는 만큼 반환)
  return groups
}
