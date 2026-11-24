// ================================
// dtryx 날짜별 회차 조회 순서 (순수 함수 — 요청은 probe로 주입)
// ================================

/**
 * dtryx는 (극장, 영화, 날짜) 한 조합씩만 조회된다. 브랜드 전체 영화를 모든 날짜에 다 물으면
 * 요청이 폭증해 밴을 부르므로(2026-07-09), "전 영화 스캔"으로 이 극장의 상영작을 찾은 뒤
 * 나머지 날짜는 그 상영작만 묻는다.
 *
 * 예전에는 전 영화 스캔을 주의 첫날·마지막 날에만 했다. 화요일 새벽 수집에서는 첫날(화)이
 * 작은영화관 정기 휴관일이고 마지막 날(다음 주 월)은 휴관이거나 아직 편성 전이라, 상영작을
 * 하나도 못 찾고 나머지 날짜는 아예 묻지 않아 그 주 전체가 0건이 됐다
 * (2026-11-17·11-24 화요일, 단양·서석·대가야·영양·인디플러스포항 등 10곳. 이 극장들의 화요일 상영 0회).
 *
 * 이제는 첫날·마지막 날을 먼저 전 영화로 스캔하고, 그래도 상영작이 없으면 남은 날짜를
 * 차례로 전 영화 스캔한다 — 회차가 없는 하루가 그 주 전체를 0건으로 만들지 않는다.
 * 상영작이 잡힌 뒤의 날짜는 그 상영작만 묻는다. 모든 날짜를 한 번씩은 조회한다.
 */
export function orderDtryxScanDates<T>(dates: readonly T[]): T[] {
  if (dates.length <= 2) return [...dates]
  return [dates[0], dates[dates.length - 1], ...dates.slice(1, -1)]
}

/** 기본 조회(첫날·마지막 날) 개수 — 이 날짜들은 상영작을 찾았든 말든 전 영화로 스캔한다 */
const BASE_FULL_SCANS = 2

export async function scanDtryxDates<D, M, C>(
  dates: readonly D[],
  movies: readonly M[],
  movieKey: (movie: M) => string,
  probe: (movie: M, date: D) => Promise<C[]>,
  runSequential: <R>(tasks: Array<() => Promise<R>>) => Promise<R[]>,
): Promise<{ candidates: C[]; fullScanCount: number }> {
  const all: C[] = []
  const showing = new Set<string>()
  let fullScanCount = 0

  for (const [index, date] of orderDtryxScanDates(dates).entries()) {
    const fullScan = index < BASE_FULL_SCANS || showing.size === 0
    const targets = fullScan ? movies : movies.filter((movie) => showing.has(movieKey(movie)))
    if (fullScan) fullScanCount += 1
    const groups = await runSequential(targets.map((movie) => async () => {
      const found = await probe(movie, date)
      if (found.length) showing.add(movieKey(movie))
      return found
    }))
    for (const group of groups) all.push(...group)
  }

  return { candidates: all, fullScanCount }
}
