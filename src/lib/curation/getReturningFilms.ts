import type {
  ReturningFilm,
  ReturningFilmCandidate,
  ReturningFilmsRepository,
  ScreeningRun,
} from './types'

/** 정렬된 ISO date 배열을 상영 구간(run) 배열로 묶는다. gapThresholdDays 이하 간격은 같은 run. */
export function clusterDatesToRuns(sortedDates: string[], gapThresholdDays = 14): ScreeningRun[] {
  if (sortedDates.length === 0) return []
  let runStart = sortedDates[0]
  let runEnd = sortedDates[0]
  const runs: ScreeningRun[] = []
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = (Date.parse(sortedDates[i]) - Date.parse(runEnd)) / 86400000
    if (gap <= gapThresholdDays) {
      runEnd = sortedDates[i]
    } else {
      runs.push({ startDate: runStart, endDate: runEnd })
      runStart = sortedDates[i]
      runEnd = sortedDates[i]
    }
  }
  runs.push({ startDate: runStart, endDate: runEnd })
  return runs
}

/** 직전 상영 종료 ↔ 이번 상영 시작 사이의 공백이 이 값(개월) 이상이어야 "오랜만" 으로 간주 */
export const RETURNING_FILM_MIN_GAP_MONTHS = 12

function monthsBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`)
  const to = new Date(`${toDate}T00:00:00Z`)
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) months -= 1
  return months
}

function formatReturningTag(gapMonths: number): string {
  if (gapMonths < 24) return `${gapMonths}개월 만의 재상영`
  return `${Math.floor(gapMonths / 12)}년 만의 재상영`
}

/**
 * "현재 상영 구간"(시작일이 asOfDate 이전이거나 같은 가장 최근 구간)과
 * 그 직전 구간을 찾는다. 직전 구간이 없으면(=한 번도 안 내려간 신작) null.
 */
function findCurrentAndPreviousRun(
  runs: ScreeningRun[],
  asOfDate: string,
): { current: ScreeningRun; previous: ScreeningRun } | null {
  const sorted = [...runs].sort((a, b) => a.startDate.localeCompare(b.startDate))

  let currentIndex = -1
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].startDate <= asOfDate) {
      currentIndex = i
      break
    }
  }
  if (currentIndex < 1) return null

  return { current: sorted[currentIndex], previous: sorted[currentIndex - 1] }
}

function buildReturningFilm(
  candidate: ReturningFilmCandidate,
  asOfDate: string,
): ReturningFilm | null {
  const pair = findCurrentAndPreviousRun(candidate.runs, asOfDate)
  if (!pair) return null

  const gapMonths = monthsBetween(pair.previous.endDate, pair.current.startDate)
  if (gapMonths < RETURNING_FILM_MIN_GAP_MONTHS) return null

  return {
    movie: candidate.movie,
    gapMonths,
    tagText: formatReturningTag(gapMonths),
    currentRunStartDate: pair.current.startDate,
    lastScreenedEndDate: pair.previous.endDate,
  }
}

/** 한동안 어디서도 상영하지 않다가 다시 걸린 영화 — 공백 긴 순으로 정렬 */
export async function getReturningFilms(
  repo: ReturningFilmsRepository,
  asOfDate: string,
): Promise<ReturningFilm[]> {
  const candidates = await repo.getCandidates(asOfDate)

  return candidates
    .map(candidate => buildReturningFilm(candidate, asOfDate))
    .filter((film): film is ReturningFilm => film !== null)
    .sort((a, b) => b.gapMonths - a.gapMonths)
}
