import type { IStorageAdapter } from '@/lib/adapters/storage'
import type { RecentlyViewedEntry, RecentlyViewedKind } from './types'

// 스펙 결정: 저장은 쿠키(클라이언트 only). 기존 `storageAdapter`는 localStorage 백엔드라
// 이 용도엔 맞지 않음 — 와이어링 시점(P2)에 document.cookie 기반 IStorageAdapter 구현체를
// 새로 만들어 주입할 것. 이 모듈은 인터페이스에만 의존하므로 구현 교체에 영향 없음.

/** 영화/영화관 각각 최대 보관 개수 (LRU) */
export const RECENTLY_VIEWED_MAX_ENTRIES = 10

const STORAGE_KEY: Record<RecentlyViewedKind, string> = {
  movie: 'movie-app-recent-movies',
  theater: 'movie-app-recent-theaters',
  director: 'movie-app-recent-directors',
}

async function readEntries(
  storage: IStorageAdapter,
  kind: RecentlyViewedKind,
): Promise<RecentlyViewedEntry[]> {
  const raw = await storage.getItem(STORAGE_KEY[kind])
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentlyViewedEntry[]) : []
  } catch {
    return []
  }
}

export async function getRecentlyViewed(
  storage: IStorageAdapter,
  kind: RecentlyViewedKind,
): Promise<RecentlyViewedEntry[]> {
  return readEntries(storage, kind)
}

/** 동일 id는 맨 앞으로 이동(중복 제거 후 prepend), 최대 개수로 자른다 */
export function pushRecentlyViewed(
  entries: RecentlyViewedEntry[],
  entry: RecentlyViewedEntry,
): RecentlyViewedEntry[] {
  const deduped = entries.filter(existing => existing.id !== entry.id)
  return [entry, ...deduped].slice(0, RECENTLY_VIEWED_MAX_ENTRIES)
}

export async function recordRecentlyViewed(
  storage: IStorageAdapter,
  kind: RecentlyViewedKind,
  entry: RecentlyViewedEntry,
): Promise<RecentlyViewedEntry[]> {
  const stamped = { ...entry, viewedAt: Date.now() }
  const next = pushRecentlyViewed(await readEntries(storage, kind), stamped)
  await storage.setItem(STORAGE_KEY[kind], JSON.stringify(next))
  return next
}

export async function removeRecentlyViewed(
  storage: IStorageAdapter,
  kind: RecentlyViewedKind,
  id: string,
): Promise<void> {
  const entries = await readEntries(storage, kind)
  await storage.setItem(STORAGE_KEY[kind], JSON.stringify(entries.filter(e => e.id !== id)))
}

export async function clearRecentlyViewed(storage: IStorageAdapter): Promise<void> {
  await Promise.all(
    (Object.keys(STORAGE_KEY) as RecentlyViewedKind[]).map(k => storage.setItem(STORAGE_KEY[k], '[]'))
  )
}
