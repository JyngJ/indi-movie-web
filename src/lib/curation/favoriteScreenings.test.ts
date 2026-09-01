import { describe, it, expect } from 'vitest'
import { collectFavoriteScreenings, theaterSummary, type FavoriteTarget } from './favoriteScreenings'
import type { TheaterPosterMovie } from '@/lib/map/posterLogic'

function poster(id: string, title: string, director?: string[]): TheaterPosterMovie {
  return { id, title, genre: [], director, showtimeCount: 1, hasAvailableSeats: true, matchesFilter: true }
}

const theaters = [
  { id: 't1', name: '서울아트시네마' },
  { id: 't2', name: '라이카시네마' },
]

const postersByTheater = new Map<string, TheaterPosterMovie[]>([
  ['t1', [poster('m1', '오디세이', ['홍상수']), poster('m2', '경멸', ['고다르'])]],
  ['t2', [poster('m1', '오디세이', ['홍상수'])]],
])

const empty = new Map<string, FavoriteTarget>()

describe('collectFavoriteScreenings', () => {
  it('관심 영화가 상영 중이면 상영 극장을 모아 한 항목으로 만든다', () => {
    const { items } = collectFavoriteScreenings({
      favorites: [{ type: 'movie', id: 'm1' }],
      theaters, postersByTheater, sticky: empty,
    })
    expect(items).toHaveLength(1)
    expect(items[0].movieId).toBe('m1')
    expect(items[0].theaterNames).toEqual(['서울아트시네마', '라이카시네마'])
    expect(items[0].target).toEqual({ type: 'movie', id: 'm1', label: '오디세이' })
  })

  it('관심 감독 작품은 하트 대상이 그 감독이다', () => {
    const { items } = collectFavoriteScreenings({
      favorites: [{ type: 'director', id: '고다르' }],
      theaters, postersByTheater, sticky: empty,
    })
    expect(items.map((i) => i.movieId)).toEqual(['m2'])
    expect(items[0].target).toEqual({ type: 'director', id: '고다르', label: '고다르' })
  })

  it('영화를 직접 담았으면 감독보다 우선한다 — 해제도 영화 단위여야 한다', () => {
    const { items } = collectFavoriteScreenings({
      favorites: [{ type: 'movie', id: 'm1' }, { type: 'director', id: '홍상수' }],
      theaters, postersByTheater, sticky: empty,
    })
    expect(items[0].target.type).toBe('movie')
  })

  it('관심을 해제해도 화면에 있는 동안은 자리를 지킨다 — 잘못 눌렀을 때 되돌릴 수 있어야 한다', () => {
    const first = collectFavoriteScreenings({
      favorites: [{ type: 'movie', id: 'm1' }],
      theaters, postersByTheater, sticky: empty,
    })
    const afterUnfavorite = collectFavoriteScreenings({
      favorites: [],                       // 하트를 껐다
      theaters, postersByTheater, sticky: first.sticky,
    })
    expect(afterUnfavorite.items.map((i) => i.movieId)).toEqual(['m1'])
    expect(afterUnfavorite.items[0].target).toEqual({ type: 'movie', id: 'm1', label: '오디세이' })
  })

  it('새로 들어온 화면(sticky 비어 있음)에서는 해제한 항목이 빠진다', () => {
    const { items } = collectFavoriteScreenings({
      favorites: [], theaters, postersByTheater, sticky: empty,
    })
    expect(items).toEqual([])
  })

  it('화면에 머무는 동안 새로 담은 관심은 바로 들어온다', () => {
    const first = collectFavoriteScreenings({
      favorites: [{ type: 'movie', id: 'm1' }],
      theaters, postersByTheater, sticky: empty,
    })
    const second = collectFavoriteScreenings({
      favorites: [{ type: 'movie', id: 'm1' }, { type: 'movie', id: 'm2' }],
      theaters, postersByTheater, sticky: first.sticky,
    })
    expect(second.items.map((i) => i.movieId).sort()).toEqual(['m1', 'm2'])
  })

  it('넘겨받은 sticky를 그 자리에서 고치지 않는다', () => {
    const sticky = new Map<string, FavoriteTarget>()
    collectFavoriteScreenings({
      favorites: [{ type: 'movie', id: 'm1' }],
      theaters, postersByTheater, sticky,
    })
    expect(sticky.size).toBe(0)
  })

  it('관심도 sticky도 없으면 빈 목록', () => {
    const { items } = collectFavoriteScreenings({
      favorites: [{ type: 'theater', id: 't1' }],   // 극장 관심은 이 섹션 대상이 아니다
      theaters, postersByTheater, sticky: empty,
    })
    expect(items).toEqual([])
  })
})

describe('theaterSummary', () => {
  it('한 곳이면 이름만', () => {
    expect(theaterSummary(['서울아트시네마'])).toBe('서울아트시네마')
  })
  it('여러 곳이면 첫 이름 + 나머지 수', () => {
    expect(theaterSummary(['서울아트시네마', '라이카시네마', '아트나인'])).toBe('서울아트시네마 외 2곳')
  })
})
