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
