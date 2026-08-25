'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { MyHomeContent } from '@/components/auth/MyHomeContent'
import { MyPageShell } from '@/components/auth/MyPageShell'

/**
 * MY 탭 홈 페이지 (모바일 + 데스크톱 딥링크). 데스크톱 레일 MY 클릭은 MyPanel 팝오버.
 * 우상단 더보기(⋯)는 뺐다(2026-08-24) — FAQ·버그 리포트·인스타·출처·개인정보가
 * 전부 MY 홈 본문으로 내려왔다.
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
  const params = useSearchParams()
  const authError = params.get('auth_error')

  return (
    <MyPageShell title="MY">
      <MyHomeContent authError={authError} onProfile={() => router.push('/my/profile')} />
    </MyPageShell>
  )
}
