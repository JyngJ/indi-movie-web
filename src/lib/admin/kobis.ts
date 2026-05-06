import type { AdminExternalMovie } from '@/types/admin'

interface KobisMovieListResponse {
  movieListResult?: {
    movieList?: KobisMovieListItem[]
  }
  faultInfo?: {
    message?: string
  }
}

interface KobisMovieListItem {
  movieCd: string
  movieNm: string
  movieNmEn?: string
  prdtYear?: string
  openDt?: string
  genreAlt?: string
  nationAlt?: string
  directors?: Array<{ peopleNm?: string }>
}

interface KobisMovieInfoResponse {
  movieInfoResult?: {
    movieInfo?: {
      movieCd: string
      movieNm: string
      movieNmEn?: string
      prdtYear?: string
      openDt?: string
      genres?: Array<{ genreNm?: string }>
      nations?: Array<{ nationNm?: string }>
      directors?: Array<{ peopleNm?: string }>
      showTm?: string
    }
  }
  faultInfo?: {
    message?: string
  }
}

const kobisBaseUrl = 'https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie'

export async function searchKobisMovies(query: string): Promise<AdminExternalMovie[]> {
  const key = getKobisApiKey()
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const url = new URL(`${kobisBaseUrl}/searchMovieList.json`)
  url.searchParams.set('key', key)
  url.searchParams.set('movieNm', normalizedQuery)
  url.searchParams.set('itemPerPage', '20')

  const response = await fetch(url, { cache: 'no-store' })
  const payload = (await response.json()) as KobisMovieListResponse

  if (!response.ok || payload.faultInfo) {
    throw new Error(payload.faultInfo?.message ?? 'KOBIS 영화 검색에 실패했습니다.')
  }

  return (payload.movieListResult?.movieList ?? []).map(movieFromListItem)
}

export async function getKobisMovie(movieCd: string): Promise<AdminExternalMovie> {
  const key = getKobisApiKey()
  const normalizedMovieCd = movieCd.trim()
  if (!normalizedMovieCd) throw new Error('KOBIS 영화 코드가 필요합니다.')

  const url = new URL(`${kobisBaseUrl}/searchMovieInfo.json`)
  url.searchParams.set('key', key)
  url.searchParams.set('movieCd', normalizedMovieCd)

  const response = await fetch(url, { cache: 'no-store' })
  const payload = (await response.json()) as KobisMovieInfoResponse

  if (!response.ok || payload.faultInfo || !payload.movieInfoResult?.movieInfo) {
    throw new Error(payload.faultInfo?.message ?? 'KOBIS 영화 상세 정보를 불러오지 못했습니다.')
  }

  const movie = payload.movieInfoResult.movieInfo

  return {
    provider: 'kobis',
    externalId: movie.movieCd,
    title: movie.movieNm,
    originalTitle: movie.movieNmEn || undefined,
    year: parseYear(movie.prdtYear, movie.openDt),
    openDate: normalizeOpenDate(movie.openDt),
    genre: (movie.genres ?? []).map((genre) => genre.genreNm).filter(isPresent),
    director: (movie.directors ?? []).map((director) => director.peopleNm).filter(isPresent),
    nation: movie.nations?.map((nation) => nation.nationNm).filter(isPresent).join(', ') || undefined,
  }
}

function movieFromListItem(item: KobisMovieListItem): AdminExternalMovie {
  return {
    provider: 'kobis',
    externalId: item.movieCd,
    title: item.movieNm,
    originalTitle: item.movieNmEn || undefined,
    year: parseYear(item.prdtYear, item.openDt),
    openDate: normalizeOpenDate(item.openDt),
    genre: splitKobisList(item.genreAlt),
    director: (item.directors ?? []).map((director) => director.peopleNm).filter(isPresent),
    nation: item.nationAlt || undefined,
  }
}

function getKobisApiKey() {
  const key = process.env.KOBIS_API_KEY
  if (!key) throw new Error('KOBIS_API_KEY 환경 변수가 필요합니다.')
  return key
}

function splitKobisList(value?: string) {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
}

function parseYear(productionYear?: string, openDate?: string) {
  const year = Number(productionYear || openDate?.slice(0, 4))
  return Number.isInteger(year) && year > 0 ? year : new Date().getFullYear()
}

function normalizeOpenDate(value?: string) {
  if (!value || value.length !== 8) return undefined
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function isPresent(value: string | undefined): value is string {
  return Boolean(value)
}
