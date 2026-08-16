'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { Button } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'

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
  const { favorites } = useFavorites()
  const params = useSearchParams()
  const authError = params.get('auth_error')

  const trailing = status === 'signed-in' ? (
    <Link href="/my/favorites" style={{ textDecoration: 'none' }}>
      <Button variant="text" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary-base)' }}>
        관심 목록 <ChevronRight size={14} strokeWidth={1.75} />
      </Button>
    </Link>
  ) : undefined

  return (
    <MyPageShell title="소식" trailing={trailing}>
      {status === 'loading' && (
        <p style={{ margin: '24px 16px', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
      )}

      {status === 'signed-out' && (
        <div style={{ padding: '32px 16px' }}>
          <LoginPanel
            title="관심 영화 소식, 카톡으로 받아보세요"
            description="하트로 관심 영화·극장·감독을 모아두면 새 상영 소식이 생길 때 알려드려요."
            returnTo="/feed"
            errorCode={authError}
          />
        </div>
      )}

      {status === 'signed-in' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 16px', textAlign: 'center' }}>
          {/* P3: 여기에 FeedList — 카피 + 영화 카드 (피그마 B) */}
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {favorites.length === 0
              ? '아직 소식이 없어요.\n하트로 관심 영화·극장·감독을 모아두면 새 상영 소식이 여기에 쌓여요.'
              : '아직 새 소식이 없어요.\n관심 영화·극장·감독에 새 상영이 생기면 카톡과 함께 여기에 알려드려요.'}
          </p>
          {favorites.length === 0 && (
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="md">상영작 둘러보기</Button>
            </Link>
          )}
        </div>
      )}
    </MyPageShell>
  )
}
