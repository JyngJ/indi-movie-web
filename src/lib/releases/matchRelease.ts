import { normalizeLooseMovieTitle } from '@/lib/text/movieTitleMatch'
import type { ExternalMovieRef, LocalMovieRef, UpcomingReleaseInput } from './types'

/**
 * 개봉 소식 → 영화 매칭 판정(순수 함수).
 *
 * 제목이 정확히 같고(정규화 후) 연도가 맞는 후보가 딱 하나일 때만 자동으로 잇는다.
 * 동명 영화가 흔해서(KMDb 동명 단편, 재개봉) 애매하면 사람에게 넘긴다.
 * 연도 허용 폭은 ±1 — 양쪽 다 제작연도라 크롤 회차 매칭(±2, 개봉연도 대 제작연도)보다 좁다.
 *
 * 감독 이름(directors)을 주면 연도보다 감독을 먼저 본다. 우리 DB·KMDb가 연도 칸에 개봉연도를
 * 넣어 둔 영화가 있어서(옆에서 숨만 쉬어도 좋아: 제작 2023 / KMDb 2026) 연도만으로는 같은 영화를
 * 동명 영화로 오판한다. 감독은 그런 흔들림이 없다.
 */
export const RELEASE_YEAR_TOLERANCE = 1

export type ReleaseMatchDecision<E extends ExternalMovieRef = ExternalMovieRef> =
  | { kind: 'matched'; movieId: string }
  | { kind: 'import'; external: E }
  | { kind: 'needs_review'; reason: string }
  | { kind: 'pending'; reason: string }

type Candidate = { title: string; originalTitle?: string | null; year?: number | null; directors?: string[] | null }

/** "베리 베리 스트레인지 러브 (장편)"처럼 같은 제목의 단편과 가르려고 붙인 꼬리표는 떼고도 비교한다 */
const FORMAT_SUFFIX = /\s*\((?:장편|단편|가제)\)\s*$/

function titleMatches(release: UpcomingReleaseInput, candidate: Candidate) {
  const targets = new Set([release.title, release.title.replace(FORMAT_SUFFIX, '')].map(normalizeLooseMovieTitle).filter(Boolean))
  if (targets.size === 0) return false
  return targets.has(normalizeLooseMovieTitle(candidate.title)) ||
    (candidate.originalTitle ? targets.has(normalizeLooseMovieTitle(candidate.originalTitle)) : false)
}

function yearFits(release: UpcomingReleaseInput, candidate: Candidate) {
  if (release.productionYear == null || candidate.year == null) return undefined
  return Math.abs(candidate.year - release.productionYear) <= RELEASE_YEAR_TOLERANCE
}

function normalizePersonName(name: string) {
  return name.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
}

function sharesDirector(directors: Set<string>, candidate: Candidate) {
  return (candidate.directors ?? []).some((name) => directors.has(normalizePersonName(name)))
}

type Choice<T> = { kind: 'one'; item: T } | { kind: 'none' } | { kind: 'ambiguous'; reason: string }

function pickByYear<T extends Candidate>(release: UpcomingReleaseInput, sameTitle: T[], label: string): Choice<T> {
  const fitting = sameTitle.filter((c) => yearFits(release, c) === true)
  if (fitting.length === 1) return { kind: 'one', item: fitting[0] }
  if (fitting.length > 1) return { kind: 'ambiguous', reason: `${label} 동명 ${fitting.length}편 (연도도 같음)` }

  // 연도로 가릴 수 없는 경우: 한쪽 연도가 비어 있으면 후보가 하나일 때만 받는다
  const unknownYear = sameTitle.filter((c) => yearFits(release, c) === undefined)
  if (unknownYear.length === 1 && sameTitle.length === 1) return { kind: 'one', item: unknownYear[0] }

  const years = sameTitle.map((c) => c.year ?? '?').join(', ')
  return { kind: 'ambiguous', reason: `${label} 제목은 같지만 연도가 다름 (제작 ${release.productionYear ?? '?'} / 후보 ${years})` }
}

function pickCandidate<T extends Candidate>(release: UpcomingReleaseInput, pool: T[], label: string, directors?: string[]): Choice<T> {
  const sameTitle = pool.filter((c) => titleMatches(release, c))
  if (sameTitle.length === 0) return { kind: 'none' }

  const directorSet = new Set((directors ?? []).map(normalizePersonName).filter(Boolean))
  if (directorSet.size > 0) {
    const sameDirector = sameTitle.filter((c) => sharesDirector(directorSet, c))
    if (sameDirector.length === 1) return { kind: 'one', item: sameDirector[0] }
    if (sameDirector.length > 1) {
      const byYear = pickByYear(release, sameDirector, label)
      return byYear.kind === 'one' ? byYear : { kind: 'ambiguous', reason: `${label} 같은 감독의 동명 ${sameDirector.length}편` }
    }
    // 감독이 적힌 후보가 전부 다른 감독이면 제목만 같은 다른 영화다
    if (sameTitle.every((c) => (c.directors ?? []).length > 0)) return { kind: 'none' }
  }

  return pickByYear(release, sameTitle, label)
}

export function decideReleaseMatch<E extends ExternalMovieRef>(
  release: UpcomingReleaseInput,
  localMovies: LocalMovieRef[],
  externalMovies: E[] | undefined,
  directors?: string[],
): ReleaseMatchDecision<E> {
  const local = pickCandidate(release, localMovies, '로컬', directors)
  if (local.kind === 'one') return { kind: 'matched', movieId: local.item.id }
  if (local.kind === 'ambiguous') return { kind: 'needs_review', reason: local.reason }

  if (!externalMovies) return { kind: 'pending', reason: '로컬에 없음 · KMDb 미조회' }
  const external = pickCandidate(release, externalMovies, 'KMDb', directors)
  if (external.kind === 'one') return { kind: 'import', external: external.item }
  if (external.kind === 'ambiguous') return { kind: 'needs_review', reason: external.reason }
  return { kind: 'pending', reason: 'KMDb에 아직 없음' }
}
