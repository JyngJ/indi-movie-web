'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { KakaoLoginButton } from '@/components/primitives'

/**
 * 로그인 패널 — 내 계정 탭 홈(비로그인)과 전역 로그인 시트가 같이 쓴다.
 * 카피는 진입 맥락에 따라 바꿀 수 있다 (예: 하트 클릭 → "관심 영화로 등록하면 새 상영 소식을 알려드려요").
 * 구글은 Supabase 프로바이더 켜지면 버튼만 추가 (M0에서 카카오만 먼저).
 */
interface Props {
  title?: string
  description?: string
  /** 로그인 후 돌아갈 경로. 생략 시 현재 경로 */
  returnTo?: string
  /** 콜백 실패 코드 (?auth_error=) */
  errorCode?: string | null
}

export function LoginPanel({
  title = '내 영화 취향을 기억할게요',
  description = '로그인하면 관심 영화·극장을 저장하고, 새로 상영 소식이 생기면 알려드려요.',
  returnTo,
  errorCode,
}: Props) {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(false)

  const handleKakao = async () => {
    setBusy(true)
    try {
      await signIn('kakao', returnTo)
    } catch {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </div>

      {errorCode && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--text-meta)', color: 'var(--color-error)' }}>
          로그인에 실패했어요. 다시 시도해 주세요. ({errorCode})
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
        <KakaoLoginButton onClick={handleKakao} loading={busy} />
      </div>

      <p style={{ margin: 0, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
        계속하면{' '}
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
          개인정보 처리방침
        </Link>
        에 동의하는 것으로 봐요.
      </p>
    </div>
  )
}
