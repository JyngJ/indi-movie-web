import { expect, it } from 'vitest'
import { pickSimilarViewersMovies } from './similarViewers'

const movie = (id: string, director = 'd-' + id) => ({ id, director: [director], genre: ['드라마'], nation: '한국', year: 2020 })
const movies = ['seen', 'a', 'b', 'c', 'd'].map(id => movie(id))
const active = new Set(['a', 'b', 'c', 'd'])
const now = new Date('2026-11-05T00:00:00Z')
const neighbors = new Map([['seen', [{ movieId: 'a', score: 0.5 }, { movieId: 'b', score: 0.4 }, { movieId: 'c', score: 0.3 }]]])

it('최근 본 영화의 이웃을 상영작에서 고르고 근거 영화를 돌려준다', () => {
  const out = pickSimilarViewersMovies({ recent: [{ id: 'seen' }], favoriteMovieIds: [], neighbors, movies, activeMovieIds: active, popular: [], now })
  expect(out.movieIds.slice(0, 3)).toEqual(['a', 'b', 'c'])
  expect(out.becauseMovieId).toBe('seen')
})
it('행동 이웃이 없으면 비운다', () => {
  expect(pickSimilarViewersMovies({ recent: [{ id: 'seen' }], favoriteMovieIds: [], neighbors: new Map(), movies, activeMovieIds: active, popular: [], now }).movieIds).toEqual([])
})
it('관심 영화도 근거로 쓴다', () => {
  const out = pickSimilarViewersMovies({ recent: [], favoriteMovieIds: ['seen'], neighbors, movies, activeMovieIds: active, popular: [], now })
  expect(out.movieIds[0]).toBe('a')
})
it('추천이 3편 미만이면 비운다', () => {
  const small = new Map([['seen', [{ movieId: 'a', score: 0.5 }]]])
  expect(pickSimilarViewersMovies({ recent: [{ id: 'seen' }], favoriteMovieIds: [], neighbors: small, movies, activeMovieIds: new Set(['a']), popular: [], now }).movieIds).toEqual([])
})
