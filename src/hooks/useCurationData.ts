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

/** curation_cache 테이블에서 서버가 미리 계산한 스냅샷을 읽는다. 최근 찾아본 항목은 쿠키에서 직접 로드. */
export function useCurationData(open: boolean): CurationData {
  const [data, setData] = useState<CurationData>(EMPTY)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    Promise.all([
      createSupabaseBrowserClient()
        .from('curation_cache')
        .select('returning_films, new_indie_films')
        .eq('id', 1)
        .single(),
      getRecentlyViewed(cookieStorageAdapter, 'movie'),
      getRecentlyViewed(cookieStorageAdapter, 'theater'),
    ]).then(([cacheResult, recentMovies, recentTheaters]) => {
      if (cancelled) return
      const cache = cacheResult.data
      setData({
        returningFilms: (cache?.returning_films as ReturningFilm[] | null) ?? [],
        newIndieFilms: (cache?.new_indie_films as NewIndieFilm[] | null) ?? [],
        recentlyViewed: [...recentMovies, ...recentTheaters],
      })
    }).catch(() => {})

    return () => { cancelled = true }
  }, [open])

  return data
}
