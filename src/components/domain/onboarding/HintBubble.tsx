'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from '@/components/primitives'

/**
 * 안내 말풍선 — 지역 설정 안내와 첫 사용 힌트가 같은 모양을 쓴다.
 *
 * 예전에는 상영작 탭(FilmsClient)과 지도 필터 바(FilterBar)가 같은 말풍선을 각자 그려
 * 두 벌이었다. 첫 사용 힌트(2026-10, 온보딩 슬라이드 대체)를 더하면서 하나로 묶었다.
 * 위치는 부모가 정한다 — 이 컴포넌트는 절대 위치 상자 안에 들어가는 내용만 그린다.
 *
 * 한 화면에 말풍선은 하나만 띄운다. 순서는 부모가 정한다(첫 사용 힌트 → 지역 설정 안내).
 */
export function HintBubble({
  icon,
  children,
  onDismiss,
  tail = 'left',
  style,
}: {
  icon: IconName
  children: ReactNode
  onDismiss: () => void
  /** 꼬리 위치 — 위쪽 가장자리의 왼쪽·오른쪽, 또는 없음(가리킬 대상이 넓을 때) */
  tail?: 'left' | 'right' | 'none'
  /** 바깥 상자 위치·폭 — position/top/left/right/width 등 */
  style?: CSSProperties
}) {
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        zIndex: 60,
        width: 276,   /* 안내 문구가 두 줄로 떨어지는 폭 */
        animation: 'tipIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), tipGlow 0.7s ease-out',
        ...style,
      }}
    >
      {tail !== 'none' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -5,
            ...(tail === 'left' ? { left: 'var(--spacing-6)' } : { right: 'var(--spacing-6)' }),
            width: 11,
            height: 11,
            background: 'var(--color-primary-base)',
            transform: 'rotate(45deg)',
            borderRadius: 'var(--radius-badge)',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          background: 'var(--color-primary-base)',
          borderRadius: 'var(--radius-control)',
          boxShadow: 'var(--shadow-popover)',
          padding: 'var(--spacing-3) var(--spacing-3) var(--spacing-3) var(--spacing-4)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-3)',
          color: 'var(--color-on-accent)',
        }}
      >
        <Icon name={icon} size={15} />
        <span className="text-note" style={{ flex: 1, color: 'var(--color-on-accent)', wordBreak: 'keep-all' }}>
          {children}
        </span>
        <button
          type="button"
          aria-label="안내 닫기"
          onClick={onDismiss}
          style={{
            width: 18, height: 18, minWidth: 18, minHeight: 18,
            borderRadius: 'var(--radius-pill)',
            background: 'color-mix(in srgb, var(--color-on-accent) 20%, transparent)',
            border: 'none',
            color: 'var(--color-on-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: -1,
            padding: 0,
          }}
        >
          <Icon name="x" size={8} />
        </button>
      </div>
    </div>
  )
}
