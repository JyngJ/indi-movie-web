'use client'

import { useEffect, useState } from 'react'
import { cookieStorageAdapter } from '@/lib/adapters/cookieStorage'
import { getHotIndieFilms } from '@/lib/curation/getHotIndieFilms'
import { getReturningFilms } from '@/lib/curation/getReturningFilms'
import { mockHotIndieFilmsRepository, mockReturningFilmsRepository } from '@/lib/curation/mockCandidates'
import { getRecentlyViewed } from '@/lib/curation/recentlyViewed'
import type { HotIndieFilm, RecentlyViewedEntry, ReturningFilm } from '@/lib/curation/types'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface CurationData {
  returningFilms: ReturningFilm[]
  hotIndieFilms: HotIndieFilm[]
  recentlyViewed: RecentlyViewedEntry[]
}

const EMPTY: CurationData = { returningFilms: [], hotIndieFilms: [], recentlyViewed: [] }

/**
 * 큐레이션 시트 데이터 — "오랜만에 상영"/"핫한 독립영화"는 아직 Supabase 연동 repo가 없어
 * 임시 목업 repo(mockCandidates)로 대체. "최근 찾아본"은 쿠키 저장소(cookieStorageAdapter)를
 * 그대로 사용 — 실제 기록 적립은 영화/영화관 상세 진입 지점 연동 시점(추후)에 채워진다.
 */
export function useCurationData(open: boolean): CurationData {
  const [data, setData] = useState<CurationData>(EMPTY)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const asOfDate = todayIso()

    Promise.all([
      getReturningFilms(mockReturningFilmsRepository(asOfDate), asOfDate),
      getHotIndieFilms(mockHotIndieFilmsRepository(), { limit: 8 }),
      getRecentlyViewed(cookieStorageAdapter, 'movie'),
      getRecentlyViewed(cookieStorageAdapter, 'theater'),
    ]).then(([returningFilms, hotIndieFilms, recentMovies, recentTheaters]) => {
      if (cancelled) return
      setData({ returningFilms, hotIndieFilms, recentlyViewed: [...recentMovies, ...recentTheaters] })
    })

    return () => { cancelled = true }
  }, [open])

  return data
}
