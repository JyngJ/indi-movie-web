import { describe, expect, it } from 'vitest'
import type { IStorageAdapter } from '@/lib/adapters/storage'
import {
  getRecentlyViewed,
  pushRecentlyViewed,
  RECENTLY_VIEWED_MAX_ENTRIES,
  recordRecentlyViewed,
} from './recentlyViewed'
import type { RecentlyViewedEntry } from './types'

function inMemoryStorage(): IStorageAdapter {
  const store = new Map<string, string>()
  return {
    async getItem(key) {
      return store.get(key) ?? null
    },
    async setItem(key, value) {
      store.set(key, value)
    },
    async removeItem(key) {
      store.delete(key)
    },
  }
}

function entry(id: string): RecentlyViewedEntry {
  return { id, title: id }
}

describe('pushRecentlyViewed', () => {
  it('prepends the new entry and moves an existing duplicate to the front', () => {
    const result = pushRecentlyViewed([entry('b'), entry('a')], entry('a'))
    expect(result.map(e => e.id)).toEqual(['a', 'b'])
  })

  it('caps the list at the max entry count, dropping the oldest', () => {
    const existing = Array.from({ length: RECENTLY_VIEWED_MAX_ENTRIES }, (_, i) => entry(`e${i}`))

    const result = pushRecentlyViewed(existing, entry('new'))

    expect(result).toHaveLength(RECENTLY_VIEWED_MAX_ENTRIES)
    expect(result[0].id).toBe('new')
    expect(result.at(-1)?.id).toBe(`e${RECENTLY_VIEWED_MAX_ENTRIES - 2}`)
  })
})

describe('recordRecentlyViewed / getRecentlyViewed', () => {
  it('keeps movie and theater lists in separate storage slots', async () => {
    const storage = inMemoryStorage()

    await recordRecentlyViewed(storage, 'movie', entry('m1'))
    await recordRecentlyViewed(storage, 'theater', entry('t1'))

    expect((await getRecentlyViewed(storage, 'movie')).map(e => e.id)).toEqual(['m1'])
    expect((await getRecentlyViewed(storage, 'theater')).map(e => e.id)).toEqual(['t1'])
  })

  it('returns an empty list when nothing has been recorded yet', async () => {
    expect(await getRecentlyViewed(inMemoryStorage(), 'movie')).toEqual([])
  })

  it('persists across reads — recording then reading reflects the LRU order', async () => {
    const storage = inMemoryStorage()

    await recordRecentlyViewed(storage, 'movie', entry('m1'))
    await recordRecentlyViewed(storage, 'movie', entry('m2'))
    await recordRecentlyViewed(storage, 'movie', entry('m1'))

    expect((await getRecentlyViewed(storage, 'movie')).map(e => e.id)).toEqual(['m1', 'm2'])
  })
})
