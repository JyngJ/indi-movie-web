import { normalizeLooseMovieTitle } from '@/lib/text/movieTitleMatch'
import type { ExternalMovieRef, LocalMovieRef, UpcomingReleaseInput } from './types'

/**
 * 개봉 소식 → 영화 매칭 판정(순수 함수).
 *
 * 제목이 정확히 같고(정규화 후) 연도가 맞는 후보가 딱 하나일 때만 자동으로 잇는다.
 * 동명 영화가 흔해서(KMDb 동명 단편, 재개봉) 애매하면 사람에게 넘긴다.
 * 연도 허용 폭은 ±1 — 양쪽 다 제작연도라 크롤 회차 매칭(±2, 개봉연도 대 제작연도)보다 좁다.
 */
export const RELEASE_YEAR_TOLERANCE = 1

export type ReleaseMatchDecision<E extends ExternalMovieRef = ExternalMovieRef> =
  | { kind: 'matched'; movieId: string }
  | { kind: 'import'; external: E }
  | { kind: 'needs_review'; reason: string }
  | { kind: 'pending'; reason: string }

type Candidate = { title: string; originalTitle?: string | null; year?: number | null }

function titleMatches(release: UpcomingReleaseInput, candidate: Candidate) {
  const target = normalizeLooseMovieTitle(release.title)
  if (!target) return false
  return normalizeLooseMovieTitle(candidate.title) === target ||
    (candidate.originalTitle ? normalizeLooseMovieTitle(candidate.originalTitle) === target : false)
}

function yearFits(release: UpcomingReleaseInput, candidate: Candidate) {
  if (release.productionYear == null || candidate.year == null) return undefined
  return Math.abs(candidate.year - release.productionYear) <= RELEASE_YEAR_TOLERANCE
}

type Choice<T> = { kind: 'one'; item: T } | { kind: 'none' } | { kind: 'ambiguous'; reason: string }

function pickCandidate<T extends Candidate>(release: UpcomingReleaseInput, pool: T[], label: string): Choice<T> {
  const sameTitle = pool.filter((c) => titleMatches(release, c))
  if (sameTitle.length === 0) return { kind: 'none' }

  const fitting = sameTitle.filter((c) => yearFits(release, c) === true)
  if (fitting.length === 1) return { kind: 'one', item: fitting[0] }
  if (fitting.length > 1) return { kind: 'ambiguous', reason: `${label} 동명 ${fitting.length}편 (연도도 같음)` }

  // 연도로 가릴 수 없는 경우: 한쪽 연도가 비어 있으면 후보가 하나일 때만 받는다
  const unknownYear = sameTitle.filter((c) => yearFits(release, c) === undefined)
  if (unknownYear.length === 1 && sameTitle.length === 1) return { kind: 'one', item: unknownYear[0] }

  const years = sameTitle.map((c) => c.year ?? '?').join(', ')
  return { kind: 'ambiguous', reason: `${label} 제목은 같지만 연도가 다름 (제작 ${release.productionYear ?? '?'} / 후보 ${years})` }
}

export function decideLocalMatch(release: UpcomingReleaseInput, localMovies: LocalMovieRef[]): Choice<LocalMovieRef> {
  return pickCandidate(release, localMovies, '로컬')
}

export function decideReleaseMatch<E extends ExternalMovieRef>(
  release: UpcomingReleaseInput,
  localMovies: LocalMovieRef[],
  externalMovies: E[] | undefined,
): ReleaseMatchDecision<E> {
  const local = decideLocalMatch(release, localMovies)
  if (local.kind === 'one') return { kind: 'matched', movieId: local.item.id }
  if (local.kind === 'ambiguous') return { kind: 'needs_review', reason: local.reason }

  if (!externalMovies) return { kind: 'pending', reason: '로컬에 없음 · KMDb 미조회' }
  const external = pickCandidate(release, externalMovies, 'KMDb')
  if (external.kind === 'one') return { kind: 'import', external: external.item }
  if (external.kind === 'ambiguous') return { kind: 'needs_review', reason: external.reason }
  return { kind: 'pending', reason: 'KMDb에 아직 없음' }
}
