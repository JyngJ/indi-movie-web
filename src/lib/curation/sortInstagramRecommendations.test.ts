import { describe, expect, it } from 'vitest'
import { fixtureMovie } from './fixtures'
import {
  filterVisibleInstagramRecommendations,
  isInstagramRecActiveNow,
  isInstagramRecVisible,
  sortInstagramRecommendations,
} from './sortInstagramRecommendations'
import type { InstagramRecommendation, InstagramRecommendationMovie } from '@/types/instagramRecommendation'
import type { Festival } from '@/types/festival'
import type { Movie } from '@/types/api'

const TODAY = '2026-08-05'

function fixtureFestival(overrides: Partial<Festival> & { id: string }): Festival {
  return {
    name: '테스트 영화제',
    slug: overrides.id,
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    region: '서울',
    city: '서울',
    venueText: null,
    bannerUrl: null,
    linkUrl: null,
    description: null,
    isActive: true,
    ...overrides,
  }
}

function fixtureRecMovie(movie: Movie | null, overrides: Partial<InstagramRecommendationMovie> = {}): InstagramRecommendationMovie {
  return {
    id: overrides.id ?? movie?.id ?? 'rm',
    movieId: movie?.id ?? null,
    movie,
    titleSnapshot: movie?.title ?? '제목 없음',
    sortOrder: 0,
    ...overrides,
  }
}

function fixtureRec(overrides: Partial<InstagramRecommendation> & { id: string }): InstagramRecommendation {
  return {
    targetType: 'movie',
    movies: [],
    festivalId: null,
    festival: null,
    titleSnapshot: `추천 ${overrides.id}`,
    cardImageUrl: 'https://example.com/card.jpg',
    instagramUrl: null,
    publishedAt: null,
    displayUntil: null,
    isActive: true,
    sortOrder: 0,
    ...overrides,
  }
}

describe('isInstagramRecActiveNow', () => {
  it('영화 1편 — 상영 중이면 true', () => {
    const movie = fixtureMovie({ id: 'm1', title: '영화1' })
    const rec = fixtureRec({ id: 'r1', targetType: 'movie', movies: [fixtureRecMovie(movie)] })
    expect(isInstagramRecActiveNow(rec, new Set(['m1']), TODAY)).toBe(true)
  })

  it('영화 1편 — 상영 중 아니면 false', () => {
    const movie = fixtureMovie({ id: 'm1', title: '영화1' })
    const rec = fixtureRec({ id: 'r1', targetType: 'movie', movies: [fixtureRecMovie(movie)] })
    expect(isInstagramRecActiveNow(rec, new Set(['m2']), TODAY)).toBe(false)
  })

  it('영화 여러 편 — 하나라도 상영 중이면 true', () => {
    const m1 = fixtureMovie({ id: 'm1', title: '영화1' })
    const m2 = fixtureMovie({ id: 'm2', title: '영화2' })
    const rec = fixtureRec({ id: 'r1', targetType: 'movie', movies: [fixtureRecMovie(m1), fixtureRecMovie(m2)] })
    expect(isInstagramRecActiveNow(rec, new Set(['m2']), TODAY)).toBe(true)
  })

  it('영화 — movies가 비었거나 전부 연결 끊김이면 false', () => {
    const rec1 = fixtureRec({ id: 'r1', targetType: 'movie', movies: [] })
    const rec2 = fixtureRec({ id: 'r2', targetType: 'movie', movies: [fixtureRecMovie(null, { id: 'rm1' })] })
    expect(isInstagramRecActiveNow(rec1, new Set(['m1']), TODAY)).toBe(false)
    expect(isInstagramRecActiveNow(rec2, new Set(['m1']), TODAY)).toBe(false)
  })

  it('영화제 — 진행중이면 true', () => {
    const festival = fixtureFestival({ id: 'f1', startDate: '2026-08-01', endDate: '2026-08-10' })
    const rec = fixtureRec({ id: 'r1', targetType: 'festival', festivalId: 'f1', festival })
    expect(isInstagramRecActiveNow(rec, new Set(), TODAY)).toBe(true)
  })

  it('영화제 — 예정이면 true', () => {
    const festival = fixtureFestival({ id: 'f1', startDate: '2026-09-01', endDate: '2026-09-10' })
    const rec = fixtureRec({ id: 'r1', targetType: 'festival', festivalId: 'f1', festival })
    expect(isInstagramRecActiveNow(rec, new Set(), TODAY)).toBe(true)
  })

  it('영화제 — 종료면 false', () => {
    const festival = fixtureFestival({ id: 'f1', startDate: '2026-07-01', endDate: '2026-07-10' })
    const rec = fixtureRec({ id: 'r1', targetType: 'festival', festivalId: 'f1', festival })
    expect(isInstagramRecActiveNow(rec, new Set(), TODAY)).toBe(false)
  })

  it('영화제 — festival이 null(연결 끊김)이면 false', () => {
    const rec = fixtureRec({ id: 'r1', targetType: 'festival', festivalId: null, festival: null })
    expect(isInstagramRecActiveNow(rec, new Set(), TODAY)).toBe(false)
  })
})

describe('isInstagramRecVisible / filterVisibleInstagramRecommendations', () => {
  it('is_active=false면 안 보임', () => {
    const rec = fixtureRec({ id: 'r1', isActive: false })
    expect(isInstagramRecVisible(rec, TODAY)).toBe(false)
  })

  it('display_until이 오늘보다 과거면 안 보임', () => {
    const rec = fixtureRec({ id: 'r1', displayUntil: '2026-08-04' })
    expect(isInstagramRecVisible(rec, TODAY)).toBe(false)
  })

  it('display_until이 오늘이면 보임(포함 경계)', () => {
    const rec = fixtureRec({ id: 'r1', displayUntil: TODAY })
    expect(isInstagramRecVisible(rec, TODAY)).toBe(true)
  })

  it('display_until이 null이면 무기한 보임', () => {
    const rec = fixtureRec({ id: 'r1', displayUntil: null })
    expect(isInstagramRecVisible(rec, TODAY)).toBe(true)
  })

  it('filterVisibleInstagramRecommendations가 안 보이는 것만 걸러낸다', () => {
    const recs = [
      fixtureRec({ id: 'visible' }),
      fixtureRec({ id: 'expired', displayUntil: '2026-08-01' }),
      fixtureRec({ id: 'inactive', isActive: false }),
    ]
    expect(filterVisibleInstagramRecommendations(recs, TODAY).map((r) => r.id)).toEqual(['visible'])
  })
})

describe('sortInstagramRecommendations', () => {
  it('지금 유효한 카드가 먼저 온다', () => {
    const activeMovie = fixtureMovie({ id: 'm1', title: '상영중' })
    const endedFestival = fixtureFestival({ id: 'f1', startDate: '2026-07-01', endDate: '2026-07-10' })

    const recs = [
      fixtureRec({ id: 'ended', targetType: 'festival', festivalId: 'f1', festival: endedFestival, sortOrder: 0 }),
      fixtureRec({ id: 'active', targetType: 'movie', movies: [fixtureRecMovie(activeMovie)], sortOrder: 1 }),
    ]

    const sorted = sortInstagramRecommendations(recs, new Set(['m1']), TODAY)
    expect(sorted.map((r) => r.id)).toEqual(['active', 'ended'])
  })

  it('유효 여부가 같으면 sort_order 오름차순', () => {
    const recs = [
      fixtureRec({ id: 'b', sortOrder: 2 }),
      fixtureRec({ id: 'a', sortOrder: 1 }),
    ]
    const sorted = sortInstagramRecommendations(recs, new Set(), TODAY)
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('sort_order도 같으면 published_at 최신순', () => {
    const recs = [
      fixtureRec({ id: 'old', sortOrder: 0, publishedAt: '2026-07-01' }),
      fixtureRec({ id: 'new', sortOrder: 0, publishedAt: '2026-08-01' }),
    ]
    const sorted = sortInstagramRecommendations(recs, new Set(), TODAY)
    expect(sorted.map((r) => r.id)).toEqual(['new', 'old'])
  })

  it('원본 배열을 변경하지 않는다', () => {
    const recs = [fixtureRec({ id: 'a', sortOrder: 2 }), fixtureRec({ id: 'b', sortOrder: 1 })]
    const original = [...recs]
    sortInstagramRecommendations(recs, new Set(), TODAY)
    expect(recs).toEqual(original)
  })
})
