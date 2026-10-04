export interface SeatReading {
  fingerprint: string
  seatAvailable: number
  seatTotal: number
}

export interface SeatUpdateBatch {
  seatAvailable: number
  seatTotal: number
  fingerprints: string[]
}

/**
 * 좌석 수 갱신을 `UPDATE ... WHERE fingerprint IN (...)` 묶음으로 나눈다.
 *
 * upsert를 쓰면 안 된다 — Postgres는 ON CONFLICT 판정 전에 새 행의 NOT NULL을
 * 먼저 검사해서, 이미 있는 fingerprint여도 id 등 필수 컬럼이 빠진 행은 23502로 막힌다.
 * 같은 좌석 값끼리 묶으면 회차 수천 건도 요청 수십 번으로 끝난다.
 *
 * - known에 없는 fingerprint는 뺀다 (DB에 없는 회차를 새로 만들지 않는다)
 * - 같은 fingerprint가 여러 번 오면 마지막 값을 쓴다
 * - fingerprint 목록은 chunkSize개씩 자른다 (PostgREST GET 쿼리 문자열 길이 제한)
 */
export function buildSeatUpdateBatches(
  readings: readonly SeatReading[],
  known: ReadonlySet<string>,
  chunkSize = 50,
): SeatUpdateBatch[] {
  const latest = new Map<string, SeatReading>()
  for (const r of readings) {
    if (known.has(r.fingerprint)) latest.set(r.fingerprint, r)
  }

  const groups = new Map<string, SeatUpdateBatch>()
  for (const r of latest.values()) {
    const key = `${r.seatAvailable}/${r.seatTotal}`
    const group = groups.get(key) ?? { seatAvailable: r.seatAvailable, seatTotal: r.seatTotal, fingerprints: [] }
    group.fingerprints.push(r.fingerprint)
    groups.set(key, group)
  }

  const batches: SeatUpdateBatch[] = []
  for (const group of groups.values()) {
    for (let i = 0; i < group.fingerprints.length; i += chunkSize) {
      batches.push({ ...group, fingerprints: group.fingerprints.slice(i, i + chunkSize) })
    }
  }
  return batches
}
