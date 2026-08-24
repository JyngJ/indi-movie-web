'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { MyHomeContent } from '@/components/auth/MyHomeContent'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { IconButton } from '@/components/primitives'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useUIStore } from '@/store/uiStore'
import { Icon } from '@/components/primitives'

/**
 * MY 탭 홈 페이지 (모바일 + 데스크톱 딥링크). 데스크톱 레일 MY 클릭은 MyPanel 팝오버.
 * 우상단 더보기(⋯): 모바일 → /more, 데스크톱 → 더보기 패널. (FAQ·버그 리포트·인스타·출처·개인정보 — 토글이 없어 "설정"이 아니라 "더보기", 2026-08-17)
 */
export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyPageInner />
    </Suspense>
  )
}

function MyPageInner() {
  const router = useRouter()
  const isDesktop = useIsDesktopLayout()
  const params = useSearchParams()
  const authError = params.get('auth_error')
  const openSettingsPage = useUIStore((s) => s.openSettingsPage)

  const openSettings = () => {
    // 클릭 시점 실제 뷰포트로 판단 — Suspense 지연 hydration 중엔 서버 스냅샷(false)이 잡힐 수 있다
    const desktopNow = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : isDesktop
    if (desktopNow) openSettingsPage('main')
    else router.push('/more')
  }

  return (
    <MyPageShell
      title="MY"
      trailing={
        <IconButton variant="ghost" size={44} aria-label="더보기" onClick={openSettings}>
          <Icon name="more" size={22} strokeWidth={1.75} />
        </IconButton>
      }
    >
      <MyHomeContent authError={authError} onProfile={() => router.push('/my/profile')} />
    </MyPageShell>
  )
}
