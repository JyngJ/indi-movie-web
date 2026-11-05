/**
 * 상영작 탭 발견 테마 로테이션 (2026-11-05).
 *
 * 테마 후보 12개를 한 번에 다 깔지 않고 방문마다 몇 개만 고른다. 규칙:
 * 1. 오늘 상영작이 minMovies 미만인 테마는 후보에서 뺀다(호출부가 걸러서 넘긴다).
 * 2. 최근에 보여 준 테마일수록 덜 뽑는다 — 마지막 노출 시각이 오래됐거나 한 번도 안 본 테마가 먼저.
 * 3. 같은 방문(seed) 안에서는 항상 같은 결과 — 스크롤하다 섹션이 바뀌지 않는다.
 * 4. 이미 고른 테마와 영화가 절반 넘게 겹치면 건너뛴다.
 */
export interface RotationCandidate { listId: string; movies: ReadonlyArray<{ id: string }> }

export const ROTATION_PICK_COUNT = 4
/** 이 시간 안에 본 테마는 "최근 본 것"으로 친다 */
export const ROTATION_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000
const MAX_OVERLAP = 0.5

/** 문자열 seed → 0~1 결정적 난수 (테마별로 다른 값) */
function hash01(seed: string, key: string): number {
  let h = 2166136261
  for (const ch of `${seed}:${key}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000
}

export function pickRotatingThemes<T extends RotationCandidate>(
  candidates: T[],
  lastShownAt: Readonly<Record<string, number>>,
  seed: string,
  now: number,
  count = ROTATION_PICK_COUNT,
): T[] {
  const ranked = candidates
    .map((c) => {
      const last = lastShownAt[c.listId]
      // 최근 노출 정도 0(오래됨·처음)~1(방금). 난수로 같은 단계 안의 순서를 섞는다.
      const recency = last == null ? 0 : Math.max(0, 1 - (now - last) / ROTATION_COOLDOWN_MS)
      return { c, key: recency + hash01(seed, c.listId) * 0.5 }
    })
    .sort((a, b) => a.key - b.key || a.c.listId.localeCompare(b.c.listId))
  const picked: T[] = []
  for (const { c } of ranked) {
    if (picked.length >= count) break
    const ids = new Set(c.movies.map((m) => m.id))
    const overlaps = picked.some((p) => {
      const shared = p.movies.filter((m) => ids.has(m.id)).length
      return shared / Math.min(ids.size, p.movies.length) > MAX_OVERLAP
    })
    if (!overlaps) picked.push(c)
  }
  return picked
}

/** 노출 기록 갱신 — 오래된 항목은 지운다 */
export function recordShownThemes(history: Readonly<Record<string, number>>, shown: string[], now: number): Record<string, number> {
  const next: Record<string, number> = {}
  for (const [id, at] of Object.entries(history)) if (now - at < ROTATION_COOLDOWN_MS * 10) next[id] = at
  for (const id of shown) next[id] = now
  return next
}
