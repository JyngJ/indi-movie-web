import type { AutoMatchSummary, CrawledShowtimeCandidate } from '@/types/admin'

export type AutoMatchKind = 'autoApproved' | 'matchedNeedsReview' | 'unmatched' | 'writeFailed'

export interface AutoMatchSummaryInput {
  kind: AutoMatchKind
  movieTitle: string
}

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

  for (const outcome of outcomes) {
    const title = normalizeTitle(outcome.movieTitle)
    screenings[outcome.kind]++
    if (title) {
      categories[outcome.kind].add(title)
      allTitles.add(title)
    }
  }

  return {
    autoApproved: { screenings: screenings.autoApproved, uniqueTitles: categories.autoApproved.size },
    matchedNeedsReview: { screenings: screenings.matchedNeedsReview, uniqueTitles: categories.matchedNeedsReview.size },
    unmatched: { screenings: screenings.unmatched, uniqueTitles: categories.unmatched.size },
    writeFailed: { screenings: screenings.writeFailed, uniqueTitles: categories.writeFailed.size },
    uniqueMovieTitles: allTitles.size,
  }
}
