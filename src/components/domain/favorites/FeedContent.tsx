'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { Button } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'

/**
 * 소식 본문 — 모바일 /feed 페이지와 데스크톱 FeedPanel이 같이 쓴다.
 * P3: 여기에 FeedList(카피 + 영화 카드, 피그마 B)가 들어온다.
 */
export function FeedContent({ authError, onNavigate }: { authError?: string | null; onNavigate?: () => void }) {
  const { status } = useAuth()
  const { favorites } = useFavorites()

  if (status === 'loading') {
    return <p style={{ margin: '24px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
  }

  if (status === 'signed-out') {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px var(--gutter)' }}>
        <LoginPanel
          title="관심 영화 소식, 카톡으로 받아보세요"
          description="하트로 관심 영화·극장·감독을 모아두면 새 상영 소식이 생길 때 알려드려요."
          returnTo="/feed"
          errorCode={authError}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px var(--gutter)', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        {favorites.length === 0
          ? '아직 소식이 없어요.\n하트로 관심 영화·극장·감독을 모아두면 새 상영 소식이 여기에 쌓여요.'
          : '아직 새 소식이 없어요.\n관심 영화·극장·감독에 새 상영이 생기면 카톡과 함께 여기에 알려드려요.'}
      </p>
      {favorites.length === 0 && (
        <Link href="/" style={{ textDecoration: 'none' }} onClick={onNavigate}>
          <Button variant="secondary" size="md">상영작 둘러보기</Button>
        </Link>
      )}
    </div>
  )
}
