'use client'

import type { ButtonHTMLAttributes } from 'react'
import { Button } from './Button'

/** Google 공식 로그인 로고는 변형하지 않는다.
 * 출처·이용 근거: https://developers.google.com/identity/branding-guidelines
 * 다른 소셜 로그인과 같은 높이·폭을 유지한다. */
export function GoogleLoginButton({ loading = false, disabled, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { loading?: boolean }) {
  return <Button type="button" size="lg" fullWidth variant="secondary" disabled={disabled} loading={loading}
    style={{ background: 'var(--color-surface-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', fontSize: 'var(--text-body)', fontWeight: 500 }}
    aria-busy={loading || undefined} {...props}>
    {!loading && <img src="/brand/google-g.png" width={20} height={20} alt="Google 로고" aria-hidden="true" />}
    {loading ? '이동 중…' : 'Google로 계속하기'}
  </Button>
}
