'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { Button, EmptyState } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'
import { useNotificationEvents } from '@/hooks/useNotifications'
import { FeedList } from './FeedList'

/**
 * 소식 본문 — 모바일 /feed 페이지와 데스크톱 FeedPanel이 같이 쓴다.
 * 소식은 배치(scripts/notify-favorites.ts)가 관심 목록 × 상영 사실을 대조해 쌓아둔 것을 읽는다.
 * 열면 읽음 처리한다 — 안 읽은 건 배경으로 구분되므로 화면을 벗어나기 전까진 그대로 보인다.
 */
export function FeedContent({ authError, onNavigate }: { authError?: string | null; onNavigate?: () => void }) {
  const { status } = useAuth()
  const { favorites } = useFavorites()
  const { events, isLoading, markAllRead } = useNotificationEvents()

  useEffect(() => {
    if (status !== 'signed-in') return
    // 목록을 본 시점에 읽음 처리 — 낙관적 업데이트라 배경색은 다음 진입부터 바뀐다
    void markAllRead()
  }, [status, markAllRead])

  if (status === 'loading' || (status === 'signed-in' && isLoading)) {
    return <p style={{ margin: '24px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
  }

  if (status === 'signed-out') {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px var(--gutter)' }}>
        <LoginPanel
          title="관심 영화 소식을 여기서 받아보세요"
          description="하트로 관심 영화·극장·감독을 모아두면 새 상영 소식이 생길 때 알려드려요."
          illustration="flyer"
          returnTo="/feed"
          errorCode={authError}
        />
      </div>
    )
  }

  if (events.length > 0) {
    return <FeedList events={events} onNavigate={onNavigate} />
  }

  return (
    <EmptyState
      variant="block"
      message={favorites.length === 0
        ? '아직 소식이 없어요.\n하트로 관심 영화·극장·감독을 모아두면\n새 상영 소식이 여기에 쌓여요.'
        : '아직 새 소식이 없어요.\n관심 영화·극장·감독에 새 상영이 생기면\n여기에 알려드려요.'}
      action={favorites.length === 0 && (
        <Link href="/" style={{ textDecoration: 'none' }} onClick={onNavigate}>
          <Button variant="secondary" size="md">상영작 둘러보기</Button>
        </Link>
      )}
      style={{ minHeight: '100%' }}
    />
  )
}
