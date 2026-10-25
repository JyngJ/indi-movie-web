import type { AutoMatchSummary, CrawledShowtimeCandidate, UnmatchedTitleSummary } from '@/types/admin'

export type AutoMatchKind = 'autoApproved' | 'matchedNeedsReview' | 'unmatched' | 'writeFailed'

export interface AutoMatchSummaryInput {
  kind: AutoMatchKind
  movieTitle: string
  theaterName?: string
  /** unmatched일 때 무엇을 못 찾았는지 */
  missing?: UnmatchedTitleSummary['missing']
}

const TOP_UNMATCHED = 5

/** 상영일이 KST 기준 오늘 이후인 후보만 자동매칭에 넘긴다. */
export function selectAutoMatchCandidates<T extends Pick<CrawledShowtimeCandidate, 'showDate'>>(
  candidates: readonly T[],
  todayKst: string,
  hasExplicitIds: boolean,
): T[] {
  if (hasExplicitIds) return [...candidates]
  return candidates.filter((candidate) => candidate.showDate >= todayKst)
}

function normalizeTitle(title: string) {
  return title.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR')
}

/** 자동매칭 결과를 상태별 회차 수와 고유 제목 수로 집계한다. */
export function summarizeAutoMatchOutcomes(outcomes: readonly AutoMatchSummaryInput[]): AutoMatchSummary {
  const categories: Record<AutoMatchKind, Set<string>> = {
    autoApproved: new Set(),
    matchedNeedsReview: new Set(),
    unmatched: new Set(),
    writeFailed: new Set(),
  }
  const screenings: Record<AutoMatchKind, number> = {
    autoApproved: 0,
    matchedNeedsReview: 0,
    unmatched: 0,
    writeFailed: 0,
  }
  const allTitles = new Set<string>()
  /* 2026-10-24: 보고가 "미매칭 N회차 · M편" 숫자뿐이라 왜 많은지 매번 SQL로 찾아야 했다.
     회차 수는 신작 한 편(KMDb 미등록)이나 극장 연결이 빠진 수집처 하나로도 크게 뛴다 —
     제목·극장·못 찾은 쪽을 같이 남긴다. */
  const unmatchedByTitle = new Map<string, { title: string; screenings: number; theaters: Set<string>; missing: Set<UnmatchedTitleSummary['missing']> }>()

  for (const outcome of outcomes) {
    const title = normalizeTitle(outcome.movieTitle)
    screenings[outcome.kind]++
    if (title) {
      categories[outcome.kind].add(title)
      allTitles.add(title)
    }
    if (outcome.kind === 'unmatched' && title) {
      const entry = unmatchedByTitle.get(title) ?? { title: outcome.movieTitle.trim().replace(/\s+/g, ' '), screenings: 0, theaters: new Set(), missing: new Set() }
      entry.screenings++
      if (outcome.theaterName?.trim()) entry.theaters.add(outcome.theaterName.trim())
      entry.missing.add(outcome.missing ?? 'movie')
      unmatchedByTitle.set(title, entry)
    }
  }

  const topUnmatched: UnmatchedTitleSummary[] = [...unmatchedByTitle.values()]
    .sort((a, b) => b.screenings - a.screenings || a.title.localeCompare(b.title, 'ko'))
    .slice(0, TOP_UNMATCHED)
    .map((e) => ({
      title: e.title,
      screenings: e.screenings,
      theaterNames: [...e.theaters].sort((a, b) => a.localeCompare(b, 'ko')),
      // 같은 제목인데 회차마다 다르면(극장은 찾고 영화는 못 찾은 곳·둘 다 못 찾은 곳) both
      missing: e.missing.size === 1 ? [...e.missing][0] : 'both',
    }))

  return {
    autoApproved: { screenings: screenings.autoApproved, uniqueTitles: categories.autoApproved.size },
    matchedNeedsReview: { screenings: screenings.matchedNeedsReview, uniqueTitles: categories.matchedNeedsReview.size },
    unmatched: { screenings: screenings.unmatched, uniqueTitles: categories.unmatched.size },
    writeFailed: { screenings: screenings.writeFailed, uniqueTitles: categories.writeFailed.size },
    uniqueMovieTitles: allTitles.size,
    topUnmatched,
  }
}

const MISSING_LABEL: Record<UnmatchedTitleSummary['missing'], string> = {
  movie: 'DB에 영화 없음',
  theater: '극장 미연결',
  both: '극장·영화 못 찾음',
}

/** Discord 보고의 "미매칭 상위" 칸 — 제목 · 극장 · 회차 · 못 찾은 쪽. 없으면 빈 배열. */
export function formatTopUnmatched(list: readonly UnmatchedTitleSummary[]): string[] {
  return list.map((u) => {
    const title = u.title.length > 40 ? `${u.title.slice(0, 39)}…` : u.title
    const theaters = u.theaterNames.length > 2
      ? `${u.theaterNames.slice(0, 2).join(' · ')} 외 ${u.theaterNames.length - 2}곳`
      : u.theaterNames.join(' · ') || '극장 정보 없음'
    return `• 「${title}」 ${u.screenings.toLocaleString()}회차 — ${theaters} · ${MISSING_LABEL[u.missing]}`
  })
}
