import { decideReleaseMatch } from './matchRelease'
import { mergeRelease, needsMatching } from './mergeRelease'
import type { ReleaseRepository } from './repository'
import type { ExternalMovieRef, ReleaseSource, UpcomingRelease, UpcomingReleaseInput } from './types'

/**
 * 개봉 예정 수집 유스케이스: 읽기 → 기존 행과 합치기 → 매칭 → 저장 → movies.release_date 반영.
 * 외부 요청·DB는 전부 주입받는다. dryRun이면 KMDb 검색까지만 하고 아무것도 쓰지 않는다.
 */
export interface SyncReleasesDeps<E extends ExternalMovieRef> {
  source: ReleaseSource
  fetchReleases(): Promise<UpcomingReleaseInput[]>
  repo: ReleaseRepository
  searchExternal(title: string): Promise<E[]>
  /** 외부 영화를 movies에 넣고 movie id를 돌려준다 */
  importExternal(movie: E): Promise<string>
  now(): Date
  dryRun?: boolean
  log?(line: string): void
}

export interface SyncReleasesSummary {
  fetched: number
  created: number
  dateChanged: Array<{ title: string; from: string; to: string }>
  matched: number
  imported: string[]
  needsReview: Array<{ title: string; reason: string }>
  pending: string[]
  /** 개봉일이 7일 넘게 지났는데 아직 영화와 못 이은 것 */
  stalePending: string[]
  releaseDateUpdates: number
}

const STALE_PENDING_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export async function syncReleases<E extends ExternalMovieRef>(deps: SyncReleasesDeps<E>): Promise<SyncReleasesSummary> {
  const log = deps.log ?? (() => {})
  const nowDate = deps.now()
  const nowIso = nowDate.toISOString()

  const inputs = await deps.fetchReleases()
  const [existingRows, localMovies] = await Promise.all([deps.repo.listReleases(deps.source), deps.repo.listLocalMovies()])
  const existing = new Map(existingRows.map((r) => [r.sourceMovieId, r]))

  const summary: SyncReleasesSummary = {
    fetched: inputs.length, created: 0, dateChanged: [], matched: 0, imported: [], needsReview: [], pending: [], stalePending: [], releaseDateUpdates: 0,
  }

  const merged: UpcomingRelease[] = []
  for (const input of inputs) {
    const prev = existing.get(input.sourceMovieId)
    const row = mergeRelease(prev, input, nowIso)
    if (!prev) summary.created++
    else if (prev.releaseDate !== row.releaseDate) summary.dateChanged.push({ title: row.title, from: prev.releaseDate, to: row.releaseDate })
    merged.push(row)
  }

  for (const row of merged) {
    if (!needsMatching(row)) continue
    let decision = decideReleaseMatch<E>(row, localMovies, undefined)
    if (decision.kind === 'pending') {
      // KMDb 요청은 한 건씩 — 동시 요청으로 몰지 않는다
      const external = await deps.searchExternal(row.title).catch((error: unknown) => {
        log(`KMDb 검색 실패 ${row.title}: ${error instanceof Error ? error.message : String(error)}`)
        return undefined
      })
      decision = decideReleaseMatch<E>(row, localMovies, external)
    }

    if (decision.kind === 'matched') {
      Object.assign(row, { movieId: decision.movieId, matchStatus: 'matched', matchNote: null })
    } else if (decision.kind === 'import') {
      if (deps.dryRun) {
        Object.assign(row, { matchStatus: 'pending', matchNote: `KMDb에서 가져올 예정: ${decision.external.key}` })
        summary.imported.push(row.title)
        continue
      }
      const movieId = await deps.importExternal(decision.external)
      localMovies.push({ id: movieId, title: decision.external.title, originalTitle: decision.external.originalTitle, year: decision.external.year })
      Object.assign(row, { movieId, matchStatus: 'matched', matchNote: `KMDb ${decision.external.key}에서 가져옴` })
      summary.imported.push(row.title)
    } else {
      Object.assign(row, { matchStatus: decision.kind, matchNote: decision.reason })
    }
  }

  for (const row of merged) {
    if (row.matchStatus === 'matched') summary.matched++
    else if (row.matchStatus === 'needs_review') summary.needsReview.push({ title: row.title, reason: row.matchNote ?? '' })
    else if (row.matchStatus === 'pending') {
      summary.pending.push(row.title)
      if (nowDate.getTime() - Date.parse(`${row.releaseDate}T00:00:00+09:00`) > STALE_PENDING_DAYS * DAY_MS) summary.stalePending.push(row.title)
    }
  }

  const updates = planReleaseDateUpdates(merged, localMovies)
  summary.releaseDateUpdates = updates.length

  if (!deps.dryRun) {
    await deps.repo.saveReleases(merged)
    if (updates.length) await deps.repo.setMovieReleaseDates(updates)
  }
  return summary
}

/**
 * matched 행의 개봉일을 movies.release_date로 옮길 목록.
 * 한 영화에 소식이 둘이면(재개봉 공지 등) 가장 이른 날짜를 쓴다. 값이 같으면 쓰지 않는다.
 */
export function planReleaseDateUpdates(
  rows: UpcomingRelease[],
  localMovies: Array<{ id: string; releaseDate?: string | null }>,
): Array<{ movieId: string; releaseDate: string }> {
  const byMovie = new Map<string, string>()
  for (const row of rows) {
    if (row.matchStatus !== 'matched' || !row.movieId) continue
    const prev = byMovie.get(row.movieId)
    if (!prev || row.releaseDate < prev) byMovie.set(row.movieId, row.releaseDate)
  }
  const current = new Map(localMovies.map((m) => [m.id, m.releaseDate ?? null]))
  return [...byMovie]
    .filter(([movieId, date]) => current.get(movieId) !== date)
    .map(([movieId, releaseDate]) => ({ movieId, releaseDate }))
}
