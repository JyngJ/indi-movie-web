import { describe, expect, it } from 'vitest'
import { pickTheaterCardFilms, type TheaterCardShowtimeRow } from './theaterCardFilms'

const kmdb = (id: string) => `http://file.koreafilm.or.kr/thm/${id}.jpg`
const row = (movie_id: string, show_date: string, show_time: string, poster: string | null = kmdb(movie_id)): TheaterCardShowtimeRow =>
  ({ movie_id, show_date, show_time, movies: { title: `t-${movie_id}`, poster_url: poster } })

describe('pickTheaterCardFilms', () => {
  it('먼저 상영하는 순서로 영화마다 포스터 하나씩, 최대 3장', () => {
    const out = pickTheaterCardFilms([
      row('c', '2026-11-25', '10:00'),
      row('a', '2026-11-24', '19:00'),
      row('b', '2026-11-24', '09:50'),
      row('a', '2026-11-24', '09:00'),
      row('d', '2026-11-26', '10:00'),
    ])
    expect(out.posters.map((p) => p.posterUrl)).toEqual(['a', 'b', 'c'].map((id) => kmdb(id).replace('http:', 'https:')))
    expect(out.filmCount).toBe(4)
  })

  it('포스터 없는 영화는 편수에는 세고 포스터 자리에선 건너뛴다', () => {
    const out = pickTheaterCardFilms([row('a', '2026-11-24', '09:00', null), row('b', '2026-11-24', '10:00')])
    expect(out.filmCount).toBe(2)
    expect(out.posters.map((p) => p.title)).toEqual(['t-b'])
  })

  it('언론사 포스터는 쓰지 않는다 — 이용허락 근거가 있는 호스트만', () => {
    const out = pickTheaterCardFilms([
      row('a', '2026-11-24', '09:00', 'https://image.cine21.com/cine21/poster/a.jpg'),
      row('b', '2026-11-24', '10:00'),
    ])
    expect(out.filmCount).toBe(2)
    expect(out.posters.map((p) => p.title)).toEqual(['t-b'])
  })

  it('상영이 없으면 0편·포스터 없음', () => {
    expect(pickTheaterCardFilms([])).toEqual({ filmCount: 0, posters: [] })
  })
})
