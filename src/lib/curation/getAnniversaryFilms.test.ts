import { describe, expect, it } from 'vitest'
import { getAnniversaryFilms, MIN_ANNIVERSARY_FILMS } from './getAnniversaryFilms'
import type { Movie } from '@/types/api'

function movie(id: string, year: number): Movie {
  return { id, title: id, year, genre: [], director: [], nation: '' } as unknown as Movie
}

const active = (ids: string[]) => new Set(ids)

describe('getAnniversaryFilms', () => {
  it('10의 배수 주년만 뽑고 오래된 순으로 정렬한다', () => {
    const movies = [movie('a', 2016), movie('b', 1996), movie('c', 2006), movie('d', 2011)]
    const result = getAnniversaryFilms(movies, active(['a', 'b', 'c', 'd']), 2026)
    expect(result.map((f) => f.movie.id)).toEqual(['b', 'c', 'a'])
    expect(result.map((f) => f.age)).toEqual([30, 20, 10])
  })

  it('활성 상영작이 아니면 제외한다', () => {
    const movies = [movie('a', 2016), movie('b', 1996), movie('c', 2006)]
    const result = getAnniversaryFilms(movies, active(['a', 'b']), 2026)
    expect(result).toEqual([]) // 2편 < MIN
  })

  it('올해 개봉작(0주년)은 제외한다', () => {
    const movies = [movie('a', 2026), movie('b', 2016), movie('c', 2006), movie('d', 1996)]
    const result = getAnniversaryFilms(movies, active(['a', 'b', 'c', 'd']), 2026)
    expect(result.map((f) => f.movie.id)).toEqual(['d', 'c', 'b'])
  })

  it(`${MIN_ANNIVERSARY_FILMS}편 미만이면 빈 배열`, () => {
    const movies = [movie('a', 2016)]
    expect(getAnniversaryFilms(movies, active(['a']), 2026)).toEqual([])
  })
})
