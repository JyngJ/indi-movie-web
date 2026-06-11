import type { AdminExternalMovie } from '@/types/admin'

const CINE21_BASE = 'https://cine21.com'

function cleanText(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildPosterUrl(html: string): string | undefined {
  const yearMonth = html.match(/cine21\/poster\/(\d{4}\/\d{4})\//)?.[1]
  const filename = html.match(/cine21\/poster\/\d{4}\/\d{4}\/([A-Za-z0-9_.-]+\.(?:jpg|png|gif|webp))/)?.[1]
  if (!yearMonth || !filename) return undefined
  return `https://image.cine21.com/cine21/poster/${yearMonth}/${filename}`
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'indi-movie-web-admin-crawler/0.1', 'accept-language': 'ko-KR,ko;q=0.9' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`cine21 fetch ${res.status}: ${url}`)
  return res.text()
}

function extractAudienceRating(html: string): number | undefined {
  const match = html.match(/관객 별점<\/p>\s*<div class="star_wrap">[\s\S]*?<p class="num">([\d.]+)<\/p>/)
  if (!match) return undefined
  const value = parseFloat(match[1])
  return Number.isFinite(value) ? value : undefined
}

interface Cine21AutocompleteSuggestion {
  category: string
  id: string
  /** 영화 제작연도 (문자열) */
  txt2?: string
}

/** 제목(+연도)으로 cine21을 검색해 관객 별점(10점 만점)을 가져옴. 못 찾으면 undefined */
export async function fetchCine21Rating(title: string, year?: number): Promise<number | undefined> {
  if (!title.trim()) return undefined

  const json = await fetchHtml(`${CINE21_BASE}/search/autocomplete?query=${encodeURIComponent(title)}`)
  const suggestions = (JSON.parse(json).suggestions ?? []) as Cine21AutocompleteSuggestion[]

  const movieIds = suggestions
    .filter(s => s.category === 'movie')
    .filter((s) => {
      if (year == null) return true
      const detailYear = s.txt2 != null ? parseInt(s.txt2) : NaN
      // cine21 txt2는 제작연도라 개봉연도와 1~2년 차이날 수 있음
      return !Number.isFinite(detailYear) || Math.abs(detailYear - year) <= 2
    })
    .map(s => s.id)
    .slice(0, 5)

  for (const movieId of movieIds) {
    const detailHtml = await fetchHtml(`${CINE21_BASE}/movie/info/?movie_id=${movieId}`).catch(() => null)
    if (!detailHtml) continue

    const rating = extractAudienceRating(detailHtml)
    if (rating != null) return rating
  }

  return undefined
}

export async function searchCine21Movies(query: string): Promise<AdminExternalMovie[]> {
  if (!query.trim()) return []

  const html = await fetchHtml(`${CINE21_BASE}/search/result/?q=${encodeURIComponent(query)}`)

  // 검색 결과에서 movie_id 추출
  const movieIds = [...new Set([...html.matchAll(/movie_id=(\d+)/g)].map(m => m[1]))].slice(0, 5)
  if (!movieIds.length) return []

  const results = await Promise.all(movieIds.map(id => parseCine21Detail(id).catch(() => null)))
  return results.filter(Boolean) as AdminExternalMovie[]
}

async function parseCine21Detail(movieId: string): Promise<AdminExternalMovie | null> {
  const html = await fetchHtml(`${CINE21_BASE}/movie/info/?movie_id=${movieId}`)

  const title = html.match(/영화 \[(.+?)\]/)?.[1]?.trim()
  if (!title) return null

  const directors = [...html.matchAll(/감독<\/p>[\s\S]{0,400}?<a[^>]+>([^<]+)<\/a>/g)]
    .map(m => m[1].trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

  const genreBlock = html.match(/장르<\/p>\s*([\s\S]{0,200}?)<\/li>/)?.[1] ?? ''
  const genres = cleanText(genreBlock).split(/[,，]/).map(s => s.trim()).filter(Boolean)

  const nationBlock = html.match(/국가<\/p>\s*([\s\S]{0,100}?)<\/li>/)?.[1] ?? ''
  const nations = cleanText(nationBlock).split(/[,，]/).map(s => s.trim()).filter(Boolean)

  const yearMatch = html.match(/제작연도[\s\S]{0,50}?(\d{4})/)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  const posterUrl = buildPosterUrl(html)

  // 시놉시스: <p class="synopsis"> 등
  const synMatch = html.match(/(?:시놉시스|synopsis)[\s\S]{0,200}?<p[^>]*>([\s\S]{20,1000}?)<\/p>/i)
  const synopsis = synMatch ? cleanText(synMatch[1]).slice(0, 600) : undefined

  return {
    provider: 'cine21',
    externalId: `cine21:${movieId}`,
    movieId: movieId,
    movieSeq: '',
    title,
    year,
    genre: genres,
    director: directors,
    nation: nations[0],
    posterUrl,
    synopsis,
  }
}
