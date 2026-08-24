'use client'

import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './Icon'

/**
 * 카카오 로그인 버튼 — 카카오 디자인 가이드 준수 (컨테이너 #FEE500, 심볼·라벨 85% 검정, 라벨 "카카오 로그인").
 * 색은 tokens.css의 --color-brand-kakao* 토큰. 크기는 Button lg(52)와 맞춘다.
 */
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  loading?: boolean
  label?: string
}


export function KakaoLoginButton({ loading = false, label = '카카오 로그인', disabled, style, ...props }: Props) {
  const isDisabled = disabled || loading
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: 'var(--comp-btn-h-lg)',
        paddingLeft: 'var(--comp-btn-px-md)',
        paddingRight: 'var(--comp-btn-px-md)',
        borderRadius: 'var(--radius-button)',
        border: 'none',
        background: 'var(--color-brand-kakao)',
        color: 'var(--color-brand-kakao-text)',
        fontSize: 'var(--text-body)',
        fontWeight: 700,
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        transition: 'background 150ms ease',
        ...style,
      }}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = 'var(--color-brand-kakao-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-brand-kakao)' }}
      {...props}
    >
      <Icon name="kakao" size={20} />
      <span>{loading ? '이동 중…' : label}</span>
    </button>
  )
}
