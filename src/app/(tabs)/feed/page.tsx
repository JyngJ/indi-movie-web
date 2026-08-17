'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { Button } from '@/components/primitives'
import { FeedContent } from '@/components/domain/favorites/FeedContent'

/**
 * 소식 탭 홈 (IA 28) — 피드. 카톡으로 보내는 상영 소식과 같은 데이터가 여기 쌓인다 (P3에서 채움).
 * 비로그인: 탭 홈 자체가 로그인 화면. 로그인: 우상단 "관심 목록 ›" + 피드 리스트.
 */
export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedPageInner />
    </Suspense>
  )
}

function FeedPageInner() {
  const { status } = useAuth()
  const params = useSearchParams()
  const authError = params.get('auth_error')

  const trailing = status === 'signed-in' ? (
    <Link href="/my/favorites" style={{ textDecoration: 'none' }}>
      <Button variant="secondary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        내 관심 목록 <ChevronRight size={14} strokeWidth={1.75} />
      </Button>
    </Link>
  ) : undefined

  return (
    <MyPageShell title="소식" trailing={trailing}>
      <FeedContent authError={authError} />
    </MyPageShell>
  )
}
