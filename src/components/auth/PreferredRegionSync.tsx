'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { subscribeStoredRegion } from '@/lib/regionStorage'

/**
 * 로그인 사용자가 고른 지역 필터를 계정(users.preferred_city)에 저장한다.
 * 다음 방문에 useCurrentLocationRegion이 이 값을 접속 위치보다 먼저 복원한다.
 *
 * 앱이 넣은 값(auto: 세션 복원·접속 위치·큐레이션 임시 적용)은 저장하지 않는다 —
 * 접속 위치가 "마지막에 고른 지역"을 덮으면 출장지에서 한 번 열었을 뿐인데
 * 집 지역이 바뀐다. 지운 것(null)은 사용자의 선택이라 저장한다.
 */
export function PreferredRegionSync() {
  const { status, user, updatePreferredRegion } = useAuth()
  const signedIn = status === 'signed-in'
  const savedRef = useRef<string | null | undefined>(undefined)
  savedRef.current = user?.preferredRegion

  useEffect(() => {
    if (!signedIn) return
    return subscribeStoredRegion((id, { auto }) => {
      if (auto || id === (savedRef.current ?? null)) return
      updatePreferredRegion(id).catch(() => { /* 다음 선택 때 다시 저장된다 */ })
    })
  }, [signedIn, updatePreferredRegion])

  return null
}
