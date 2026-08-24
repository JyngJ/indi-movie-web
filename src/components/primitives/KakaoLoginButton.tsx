'use client'

import type { ButtonHTMLAttributes } from 'react'

/**
 * 카카오 로그인 버튼 — 우리 컴포넌트가 아니라 남의 규격이다.
 *
 * 카카오 로그인 디자인 가이드(developers.kakao.com/docs/ko/kakaologin/design-guide)가
 * 컨테이너 #FEE500, 심볼 #000, 라벨 검정 85%, 반경 12px, 문구는 "카카오 로그인"(축약형
 * "로그인")으로 못박아 뒀다. 심볼은 모양·비율·색을 바꾸면 안 된다.
 *
 * 그래서 심볼을 Icon 레지스트리에서 가져오지 않는다. 레지스트리는 우리가 톤을 맞추려고
 * 언제든 손대는 곳이고(획 굵기·크기 규칙이 거기 있다), 그 손질이 여기까지 번지면
 * 남의 브랜드 규정을 우리가 모르는 새 어기게 된다. 규격이 걸린 마크는 그 버튼이 소유한다.
 *
 * 우리가 정하는 값은 높이(Button lg와 맞춘 52)와 로딩 문구뿐이다.
 */
const KAKAO_RADIUS = 12          /* 카카오 규정 — --radius-button(8)을 쓰면 안 된다 */
const KAKAO_SYMBOL = '#000000'   /* 라벨은 85% 검정이지만 심볼은 순검정 */

function KakaoSymbol({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={KAKAO_SYMBOL} aria-hidden="true">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.32 4.66 6.74l-.95 3.53c-.08.31.27.56.54.38l4.14-2.75c.53.06 1.06.1 1.61.1 5.52 0 10-3.58 10-8S17.52 3 12 3Z" />
    </svg>
  )
}
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
        borderRadius: KAKAO_RADIUS,
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
      <KakaoSymbol />
      <span>{loading ? '이동 중…' : label}</span>
    </button>
  )
}
