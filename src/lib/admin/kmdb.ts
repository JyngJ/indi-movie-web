import type { AdminExternalMovie } from '@/types/admin'

interface KmdbSearchResponse {
  Data?: Array<{
    Result?: KmdbMovieItem[]
  }>
  Result?: KmdbMovieItem[]
}

interface KmdbMovieItem {
  DOCID?: string
  docid?: string
  movieId?: string
  movieSeq?: string
  title?: string
  titleEng?: string
  titleOrg?: string
  directorNm?: string
  nation?: string
  prodYear?: string
  plot?: string
  runtime?: string
  rating?: string
  genre?: string
  kmdbUrl?: string
  repRlsDate?: string
  releaseDate?: string
  posterUrl?: string
  posters?: string
  stillUrl?: string
  stlls?: string
}

const kmdbBaseUrl = 'https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp'
const kmdbFetchTimeoutMs = 8000

export async function searchKmdbMovies(query: string): Promise<AdminExternalMovie[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 1) return []

  const payload = await fetchKmdb({
    query: normalizedQuery,
    detail: 'Y',
    listCount: '20',
    startCount: '0',
    sort: 'RANK,1',
  })

  return extractResults(payload).map(movieFromItem)
}

export async function getKmdbMovie(movieId: string, movieSeq: string): Promise<AdminExternalMovie> {
  const normalizedMovieId = movieId.trim()
  const normalizedMovieSeq = movieSeq.trim()

  if (!normalizedMovieId || !normalizedMovieSeq) {
    throw new Error('KMDB movieId와 movieSeq가 필요합니다.')
  }

  const payload = await fetchKmdb({
    movieId: normalizedMovieId,
    movieSeq: normalizedMovieSeq,
    detail: 'Y',
    listCount: '3',
    startCount: '0',
  })
  const movie = extractResults(payload)[0]

  if (!movie) {
    throw new Error('KMDB 영화 상세 정보를 찾지 못했습니다.')
  }

  return movieFromItem(movie)
}

async function fetchKmdb(params: Record<string, string>) {
  const serviceKey = getKmdbServiceKey()
  const url = new URL(kmdbBaseUrl)

  url.searchParams.set('collection', 'kmdb_new2')
  url.searchParams.set('ServiceKey', serviceKey)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const response = await fetchWithRetry(url)
  const payload = (await response.json()) as KmdbSearchResponse

  if (!response.ok) {
    throw new Error('KMDB 영화 정보를 불러오지 못했습니다.')
  }

  return payload
}

async function fetchWithRetry(url: URL) {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), kmdbFetchTimeoutMs)

    try {
      return await fetch(url, { cache: 'no-store', signal: controller.signal })
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`KMDB API 연결 실패: ${formatFetchError(lastError)}`)
}

function formatFetchError(error: unknown) {
  if (!(error instanceof Error)) return '알 수 없는 오류'

  const cause = error.cause
  if (cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string') {
    return cause.code
  }

  return error.name === 'AbortError' ? '요청 시간 초과' : error.message
}

function movieFromItem(item: KmdbMovieItem): AdminExternalMovie {
  const movieId = cleanText(item.movieId)
  const movieSeq = cleanText(item.movieSeq)
  const title = cleanTitle(item.title)
  const originalTitle = cleanText(item.titleOrg) || cleanText(item.titleEng)
  const releaseDate = normalizeDate(cleanText(item.repRlsDate) || cleanText(item.releaseDate))
  const posterUrl = firstUrl(cleanText(item.posterUrl) || cleanText(item.posters))
  const stillUrl = firstUrl(cleanText(item.stillUrl) || cleanText(item.stlls))

  return {
    provider: 'kmdb',
    externalId: `${movieId}:${movieSeq}`,
    movieId,
    movieSeq,
    title,
    originalTitle: originalTitle || undefined,
    year: parseYear(cleanText(item.prodYear), releaseDate),
    openDate: releaseDate,
    genre: splitKmdbList(item.genre),
    director: splitKmdbList(item.directorNm),
    nation: cleanText(item.nation) || undefined,
    posterUrl,
    stillUrl,
    synopsis: cleanText(item.plot) || undefined,
    runtimeMinutes: parseRuntime(item.runtime),
    certification: cleanText(item.rating) || undefined,
  }
}

function extractResults(payload: KmdbSearchResponse) {
  if (payload.Data?.[0]?.Result) return payload.Data[0].Result
  if (payload.Result) return payload.Result
  return []
}

function getKmdbServiceKey() {
  const key = process.env.KMDB_SERVICE_KEY ?? process.env.KMDB_API_KEY
  if (!key) throw new Error('KMDB_SERVICE_KEY 환경 변수가 필요합니다.')
  return key
}

function cleanTitle(value?: string) {
  return cleanText(value).replace(/\s*!HS\s*/g, '').replace(/\s*!HE\s*/g, '').trim()
}

function cleanText(value?: string) {
  return (value ?? '').replace(/<!HS>|<!HE>|!HS|!HE/g, '').replace(/\s+/g, ' ').trim()
}

function splitKmdbList(value?: string) {
  return cleanText(value).split(/[,|]/).map((item) => item.trim()).filter(Boolean)
}

function firstUrl(value: string) {
  const first = value.split('|').map((item) => item.trim()).find(Boolean)
  return first || undefined
}

function normalizeDate(value: string) {
  if (!value) return undefined
  const compact = value.replace(/-/g, '')
  if (compact.length !== 8) return undefined
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

function parseYear(prodYear: string, releaseDate?: string) {
  const year = Number(prodYear || releaseDate?.slice(0, 4))
  return Number.isInteger(year) && year > 0 ? year : new Date().getFullYear()
}

function parseRuntime(value?: string) {
  const runtime = Number(cleanText(value))
  return Number.isInteger(runtime) && runtime > 0 ? runtime : undefined
}
