import { describe, expect, it } from 'vitest'
import type { AdminExternalMovie } from '@/types/admin'
import { pickKmdbAlternatives, yearMatchIndex } from './kmdbAlternatives'

const k = (title: string, year: number, movieId: string, movieSeq = '1'): AdminExternalMovie => ({
  provider: 'kmdb', externalId: `${movieId}${movieSeq}`, movieId, movieSeq, title, year, genre: [], director: [],
})

describe('pickKmdbAlternatives', () => {
  const existing = [
    { title: '파계', year: 1980, kmdb_id: 'K', kmdb_movie_seq: '80' },
    { title: '파계', year: 1959 },
  ]
  const results = [
    k('파계', 1980, 'K', '80'),
    k('파계', 1974, 'K', '74'),
    k('파계', 1959, 'F', '59'),
    k('충열도( 파계 )', 1977, 'C'),
    k('파계', 1974, 'K', '74'),
  ]

  it('제목이 같고 DB에 없는 것만, 중복 없이', () => {
    expect(pickKmdbAlternatives(results, '파계', existing, []).map((m) => m.year)).toEqual([1974])
  })

  it('극장 표기 연도와 맞는 후보가 앞에 온다', () => {
    const more = [...results, k('파계', 2001, 'Z')]
    expect(pickKmdbAlternatives(more, '파계', existing, [1974]).map((m) => m.year)).toEqual([1974, 2001])
    expect(pickKmdbAlternatives(more, '파계', existing, []).map((m) => m.year)).toEqual([2001, 1974])
  })

  it('limit만큼만', () => {
    const many = Array.from({ length: 6 }, (_, i) => k('파계', 2000 + i, `N${i}`))
    expect(pickKmdbAlternatives(many, '파계', existing, [], 2)).toHaveLength(2)
  })
})

describe('yearMatchIndex', () => {
  it('하나만 맞으면 그 번호, 없거나 여럿이면 undefined', () => {
    expect(yearMatchIndex([1974], [1980, 1959, 1974])).toBe(2)
    expect(yearMatchIndex([1974], [1980, 1959])).toBeUndefined()
    expect(yearMatchIndex([1974], [1974, 1974])).toBeUndefined()
    expect(yearMatchIndex([], [1974])).toBeUndefined()
  })
})
