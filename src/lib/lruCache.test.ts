import { describe, it, expect } from 'vitest'
import { LRUCache } from './lruCache'

describe('LRUCache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)

    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBeUndefined()
  })

  it('should evict the oldest item when limit is exceeded', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    // 크기가 3에 다다름
    cache.set('d', 4) // 가장 먼저 들어간 'a'가 지워져야 함

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
    expect(cache.size).toBe(3)
  })

  it('should update recency on get', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    // 'a'를 사용함으로 최근 사용으로 갱신
    cache.get('a')

    // 'd'를 추가하면 'a' 대신 그다음으로 오래된 'b'가 지워져야 함
    cache.set('d', 4)

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('should update recency on set of existing key', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    // 'a'에 새로운 값을 set하여 갱신
    cache.set('a', 10)

    // 'd'를 추가하면 'a' 대신 'b'가 지워져야 함
    cache.set('d', 4)

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(10)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('should clear all entries', () => {
    const cache = new LRUCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()

    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })
})
