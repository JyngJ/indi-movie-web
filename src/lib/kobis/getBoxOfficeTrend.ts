import type { KobisDailyBoxOffice, KobisFetchJson, KobisMovieMatch } from './types'

const KOBIS_BASE = 'https://www.kobis.or.kr/kobisopenapi/webservice/rest'

async function defaultFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`KOBIS API ${res.status}: ${url}`)
  return res.json()
}

interface KobisMovieListResponse {
  movieListResult?: { movieList?: Array<{ movieCd?: string; movieNm?: string; openDt?: string }> }
}

interface KobisBoxOfficeResponse {
  boxOfficeResult?: { dailyBoxOfficeList?: Array<{ movieCd?: string; scrnCnt?: string }> }
}

/** 예술관 다수가 KOBIS 미가입일 수 있어, 매칭 실패는 예외가 아니라 정상 케이스로 다룬다(null 반환) */
export async function findKobisMovieCd(
  apiKey: string,
  title: string,
  year: number | undefined,
  fetchJson: KobisFetchJson = defaultFetchJson,
): Promise<string | null> {
  const url = `${KOBIS_BASE}/movie/searchMovieList.json?key=${apiKey}&movieNm=${encodeURIComponent(title)}`
  const json = (await fetchJson(url)) as KobisMovieListResponse
  const rawList = json.movieListResult?.movieList ?? []

  const candidates: KobisMovieMatch[] = rawList
    .filter((m): m is { movieCd: string; movieNm: string; openDt?: string } => !!m.movieCd && !!m.movieNm)
    .map((m) => ({ movieCd: m.movieCd, movieNm: m.movieNm, openDt: m.openDt ?? '' }))

  if (candidates.length === 0) return null

  const normalize = (s: string) => s.replace(/\s+/g, '')
  const exact = candidates.filter((c) => normalize(c.movieNm) === normalize(title))
  const pool = exact.length > 0 ? exact : candidates

  if (year == null) return pool[0].movieCd

  const withMatchingYear = pool.find((c) => {
    const openYear = parseInt(c.openDt.slice(0, 4), 10)
    return Number.isFinite(openYear) && Math.abs(openYear - year) <= 1
  })
  return (withMatchingYear ?? pool[0]).movieCd
}

/** 지정한 날짜들(YYYYMMDD)의 일별 박스오피스에서 이 영화의 스크린 수를 가져온다. 그 날 순위 밖이면 스킵 */
export async function fetchScreenCountTrend(
  apiKey: string,
  movieCd: string,
  targetDates: string[],
  fetchJson: KobisFetchJson = defaultFetchJson,
): Promise<KobisDailyBoxOffice[]> {
  const results: KobisDailyBoxOffice[] = []
  for (const targetDt of targetDates) {
    const url = `${KOBIS_BASE}/boxoffice/searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${targetDt}`
    const json = (await fetchJson(url)) as KobisBoxOfficeResponse
    const row = json.boxOfficeResult?.dailyBoxOfficeList?.find((r) => r.movieCd === movieCd)
    if (row?.scrnCnt == null) continue
    const scrnCnt = Number(row.scrnCnt)
    if (Number.isFinite(scrnCnt)) results.push({ targetDt, scrnCnt })
  }
  return results
}

/** 스크린 수 추이가 감소세인지 — 표본 2개 미만이면 판단 불가로 false(=감소 아님, 확정 신호 없음) */
export function isScreenCountDeclining(trend: KobisDailyBoxOffice[]): boolean {
  if (trend.length < 2) return false
  const sorted = [...trend].sort((a, b) => a.targetDt.localeCompare(b.targetDt))
  const first = sorted[0].scrnCnt
  const last = sorted[sorted.length - 1].scrnCnt
  return last < first
}
