import { describe, expect, it } from 'vitest'
import { favoriteKey, toFavoriteSet } from './types'

describe('favorites', () => {
  it('favoriteKey는 type:id', () => {
    expect(favoriteKey('movie', 'abc')).toBe('movie:abc')
  })
  it('toFavoriteSet은 조회 Set을 만든다 (타입 구분)', () => {
    const s = toFavoriteSet([{ type: 'movie', id: '1' }, { type: 'theater', id: '1' }])
    expect(s.has('movie:1')).toBe(true)
    expect(s.has('theater:1')).toBe(true)
    expect(s.has('movie:2')).toBe(false)
    expect(s.size).toBe(2)
  })
})

describe('summarizeFavorites', () => {
  it('상영 중 카운트를 붙이고, 사라진 항목은 버리고, 상영 중 우선 정렬', async () => {
    const { summarizeFavorites } = await import('./summarize')
    const r = summarizeFavorites(
      [
        { type: 'movie', id: 'm1', createdAt: '2026-08-10' },
        { type: 'movie', id: 'm2', createdAt: '2026-08-12' },
        { type: 'movie', id: 'gone', createdAt: '2026-08-13' },
        { type: 'theater', id: 't1', createdAt: '2026-08-11' },
      ],
      [{ id: 'm1', title: 'A' }, { id: 'm2', title: 'B' }],
      [{ id: 't1', name: 'T', city: '서울' }],
      [{ movieId: 'm1', theaterId: 't1' }, { movieId: 'm1', theaterId: 't2' }, { movieId: 'x', theaterId: 't1' }],
    )
    expect(r.movies.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(r.movies[0].screeningTheaterCount).toBe(2)
    expect(r.movies[1].screeningTheaterCount).toBe(0)
    expect(r.theaters[0].screeningMovieCount).toBe(2)
  })
})
