'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { getRecentlyViewed } from '@/lib/curation/recentlyViewed'
import type { NewIndieFilm, RecentlyViewedEntry, ReturningFilm } from '@/lib/curation/types'

interface CurationData {
  returningFilms: ReturningFilm[]
  newIndieFilms: NewIndieFilm[]
  recentlyViewed: RecentlyViewedEntry[]
}

const EMPTY: CurationData = { returningFilms: [], newIndieFilms: [], recentlyViewed: [] }

/** curation_cache에서 서버 계산 스냅샷 읽기 + 최근 찾아본 쿠키 로드.
 *  refreshKey가 바뀔 때마다 최근 찾아본만 재로드 (Supabase는 open 첫 진입 시 1회).
 */
export function useCurationData(open: boolean, refreshKey = 0): CurationData {
  const [cacheData, setCacheData] = useState<Pick<CurationData, 'returningFilms' | 'newIndieFilms'>>({
    returningFilms: [],
    newIndieFilms: [],
  })
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedEntry[]>([])

  // Supabase 스냅샷 — open 첫 진입 시 1회
  useEffect(() => {
    if (!open) return
    let cancelled = false
    createSupabaseBrowserClient()
      .from('curation_cache')
      .select('returning_films, new_indie_films')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setCacheData({
          returningFilms: (data?.returning_films as ReturningFilm[] | null) ?? [],
          newIndieFilms: (data?.new_indie_films as NewIndieFilm[] | null) ?? [],
        })
      }, () => {})
    return () => { cancelled = true }
  }, [open])

  // 최근 찾아본 — refreshKey 바뀔 때마다 재로드 (쿠키 읽기라 빠름)
  useEffect(() => {
    if (!open) return
    Promise.all([
      getRecentlyViewed(cookieStorageAdapter, 'movie'),
      getRecentlyViewed(cookieStorageAdapter, 'theater'),
      getRecentlyViewed(cookieStorageAdapter, 'director'),
    ]).then(([movies, theaters, directors]) => {
      const all: RecentlyViewedEntry[] = [
        ...movies.map(e => ({ ...e, kind: 'movie' as const })),
        ...theaters.map(e => ({ ...e, kind: 'theater' as const })),
        ...directors.map(e => ({ ...e, kind: 'director' as const })),
      ].sort((a, b) => (b.viewedAt ?? 0) - (a.viewedAt ?? 0))
      setRecentlyViewed(all)
    }).catch(() => {})
  }, [open, refreshKey])

  return { ...cacheData, recentlyViewed }
}
