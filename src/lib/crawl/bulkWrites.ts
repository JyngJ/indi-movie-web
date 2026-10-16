// ================================
// 크롤러 DB 쓰기 묶기 — 순수 함수
// 회차 하나마다 요청 하나를 보내던 자리를 한 번(또는 몇 번)으로 줄이기 위한 판단·정리 로직.
// 2026-10 Supabase 로그 실측: 하루 약 1.5만 요청 중 크롤러가 7천 건 — 자동매칭이 후보마다
// 후보 갱신 1회 + showtimes upsert 1회, 좌석 갱신이 좌석 값마다 1회씩 보내고 있었다.
// ================================

export interface CandidateMatchState {
  matchedTheaterId?: string | null
  matchedMovieId?: string | null
  warnings: readonly string[]
  status: string
}

/** 자동매칭 결과가 지금 저장된 값과 같은가 — 같으면 다시 쓰지 않는다 */
export function isMatchUnchanged(current: CandidateMatchState, next: CandidateMatchState): boolean {
  return (current.matchedTheaterId ?? null) === (next.matchedTheaterId ?? null)
    && (current.matchedMovieId ?? null) === (next.matchedMovieId ?? null)
    && current.status === next.status
    && current.warnings.length === next.warnings.length
    && current.warnings.every((w, i) => w === next.warnings[i])
}

/**
 * 같은 키를 가진 행은 마지막 것만 남긴다. 한 요청 안에 ON CONFLICT 키가 겹치면 Postgres가
 * "ON CONFLICT DO UPDATE command cannot affect row a second time"으로 묶음 전체를 거부한다.
 */
export function dedupeByKey<T>(rows: readonly T[], key: (row: T) => string): T[] {
  const latest = new Map<string, T>()
  for (const row of rows) latest.set(key(row), row)
  return Array.from(latest.values())
}

export function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

/** RPC가 아직 DB에 없을 때(SQL 실행 전) PostgREST가 돌려주는 코드 — 예전 방식으로 돌아간다 */
export function isMissingRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '')
}
