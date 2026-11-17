import type { UpcomingRelease, UpcomingReleaseInput } from './types'

/**
 * 새로 읽은 개봉 소식을 기존 행에 합친다.
 * - 처음 보면 pending 행을 만든다.
 * - 개봉일이 바뀌면 이전 값을 history에 쌓는다(배급 일정 변경 추적).
 * - 제목이 바뀌면 매칭을 다시 하도록 pending으로 돌린다. rejected는 사람이 내린 판단이라 유지.
 */
export function mergeRelease(existing: UpcomingRelease | undefined, incoming: UpcomingReleaseInput, nowIso: string): UpcomingRelease {
  if (!existing) {
    return {
      ...incoming,
      movieId: null,
      matchStatus: 'pending',
      matchNote: null,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      releaseDateHistory: [],
    }
  }

  const dateChanged = existing.releaseDate !== incoming.releaseDate
  const titleChanged = existing.title !== incoming.title
  const resetMatch = titleChanged && existing.matchStatus !== 'rejected'

  return {
    ...existing,
    title: incoming.title,
    productionYear: incoming.productionYear ?? existing.productionYear,
    releaseDate: incoming.releaseDate,
    lastSeenAt: nowIso,
    releaseDateHistory: dateChanged
      ? [...existing.releaseDateHistory, { date: existing.releaseDate, seenAt: existing.lastSeenAt }]
      : existing.releaseDateHistory,
    movieId: resetMatch ? null : existing.movieId,
    matchStatus: resetMatch ? 'pending' : existing.matchStatus,
    matchNote: resetMatch ? null : existing.matchNote,
  }
}

/** 이번 실행에서 매칭을 시도할 행 — matched·rejected는 건드리지 않는다 */
export function needsMatching(release: UpcomingRelease) {
  return release.matchStatus === 'pending' || release.matchStatus === 'needs_review'
}
