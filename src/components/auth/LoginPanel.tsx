'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { KakaoLoginButton, GoogleLoginButton } from '@/components/primitives'
import { LoginEmailPreview } from './LoginEmailPreview'
import type { AuthProvider } from '@/lib/auth/types'

/** 로그인 패널 — MY와 전역 로그인 시트가 공유한다.
 * 메일 예시로 수신 혜택을 보여 주고, 이메일 수신은 로그인 후 별도로 선택한다.
 * 진입 맥락의 제목·설명과 로그인 후 돌아갈 경로는 유지한다. */
interface Props {
  title?: string
  description?: string
  /** 로그인 후 돌아갈 경로. 생략 시 현재 경로 */
  returnTo?: string
  /** 콜백 실패 코드 (?auth_error=) */
  errorCode?: string | null
}

export function LoginPanel({
  title = '관심 영화의 새 상영 소식을 알려 드려요',
  description = '관심 목록을 저장하고, 이메일로 소식을 받아보세요',
  returnTo,
  errorCode,
}: Props) {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState<AuthProvider | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setBusy(null)
      setError('')
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const handleSignIn = async (provider: AuthProvider) => {
    setBusy(provider)
    setError('')
    try {
      await signIn(provider, returnTo)
    } catch {
      setBusy(null)
      setError(provider === 'google'
        ? '구글 로그인에 연결하지 못했어요. 카카오로 로그인하거나 잠시 후 다시 시도해 주세요.'
        : '카카오 로그인에 연결하지 못했어요. 다시 시도해 주세요.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center', width: '100%', maxWidth: 360, marginInline: 'auto' }}>
      <LoginEmailPreview />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="text-balance" style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        <p className="text-pretty" style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </div>

      {(errorCode || error) && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--text-meta)', color: 'var(--color-error)' }}>
          {error || '로그인하지 못했어요. 다시 시도해 주세요.'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
        <KakaoLoginButton onClick={() => handleSignIn('kakao')} loading={busy === 'kakao'} disabled={busy !== null} />
        <GoogleLoginButton onClick={() => handleSignIn('google')} loading={busy === 'google'} disabled={busy !== null} />
      </div>

      <p style={{ margin: 0, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
        이메일 소식은 로그인 후 선택할 수 있어요<br />
        만 14세 이상만 가입할 수 있어요<br />
        계속하면{' '}
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
          이용약관
        </Link>
        과{' '}
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
          개인정보 처리방침
        </Link>
        에 동의하는 것으로 봐요.
      </p>
    </div>
  )
}
