'use client'

import { useCallback } from 'react'
import { useUIStore, type LoginSheetState } from '@/store/uiStore'
import { useAuth } from './AuthProvider'

/**
 * 로그인이 필요한 액션 게이트. 비로그인이면 로그인 시트를 띄우고 false, 로그인이면 true.
 *
 *   const requireAuth = useRequireAuth()
 *   onClick={() => { if (!requireAuth({ description: '관심 영화로 등록하면 …' })) return; toggleFavorite() }}
 *
 * P2 하트 버튼이 이걸 쓴다. 로그인 후 returnTo(기본: 현재 경로)로 돌아오지만 액션 자체는 재실행하지 않는다 —
 * 돌아온 화면에서 다시 누르면 된다 (OAuth 리다이렉트를 넘어 상태를 들고 가는 복잡도 대비 이득이 없음).
 */
export function useRequireAuth() {
  const { status } = useAuth()
  const openLoginSheet = useUIStore((s) => s.openLoginSheet)
  return useCallback(
    (opts?: LoginSheetState): boolean => {
      if (status === 'signed-in') return true
      openLoginSheet(opts)
      return false
    },
    [status, openLoginSheet],
  )
}
