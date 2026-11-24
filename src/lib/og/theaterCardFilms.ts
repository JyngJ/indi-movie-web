/**
 * 극장 공유 카드에 얹을 이번 주 상영작 — 순수 함수.
 *
 * 극장 카드가 이름·주소뿐이라 카카오톡처럼 작게 보이는 곳에서 아래가 텅 비고 주소는 안
 * 읽혔다(2026-11-24). 이 극장에서 무엇을 하는지가 한눈에 보이도록 포스터와 편수를 얹는다.
 */
import { licensedImageUrl } from '@/lib/media/imageUrl'

export const THEATER_CARD_DAYS = 7
export const THEATER_CARD_POSTERS = 3

export interface TheaterCardShowtimeRow {
  movie_id: string
  show_date: string
  show_time: string
  movies: { title?: string | null; poster_url?: string | null } | null
}

export interface TheaterCardFilms {
  /** 기간 안에 상영하는 서로 다른 영화 수 */
  filmCount: number
  /** 가장 먼저 상영하는 순서로, 이용허락 근거가 있는 포스터가 있는 영화만 (https 주소) */
  posters: { title: string; posterUrl: string }[]
}

export function pickTheaterCardFilms(rows: TheaterCardShowtimeRow[], limit = THEATER_CARD_POSTERS): TheaterCardFilms {
  const sorted = [...rows].sort((a, b) =>
    a.show_date === b.show_date ? a.show_time.localeCompare(b.show_time) : a.show_date.localeCompare(b.show_date))
  const seen = new Set<string>()
  const posters: TheaterCardFilms['posters'] = []
  for (const row of sorted) {
    if (seen.has(row.movie_id)) continue
    seen.add(row.movie_id)
    const posterUrl = licensedImageUrl(row.movies?.poster_url)
    if (posters.length < limit && posterUrl) posters.push({ title: row.movies?.title ?? '영화 포스터', posterUrl })
  }
  return { filmCount: seen.size, posters }
}
