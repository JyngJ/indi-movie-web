'use client'

import type { CSSProperties, ReactNode } from 'react'
import { FilterPill } from './FilterPill'

/**
 * Tabs — 같은 자리에서 내용을 갈아 끼우는 탭 줄.
 *
 * 두 가지 모습만 있다.
 * - underline: 패널·시트 안에서 폭을 나눠 갖는 탭. 선택된 탭 아래에 2px 밑줄.
 * - pill: 목록 위에 얹는 필터형 탭. FilterPill을 그대로 쓴다.
 *
 * 날짜 탭(DetailDateTabs·DateBar)은 여기 들어오지 않는다. 그쪽은 요일 색, 좌우 이동
 * 버튼, 오늘 표시처럼 날짜에만 있는 규칙을 갖고 있어 같은 컴포넌트로 묶으면
 * 양쪽 다 어중간해진다.
 */

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  /** 접근성 라벨이 label과 달라야 할 때만. */
  ariaLabel?: string
}

export interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  variant?: 'underline' | 'pill'
  /** tablist에 붙는 이름. 스크린리더가 무슨 탭 묶음인지 읽는다. */
  label: string
  style?: CSSProperties
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  label,
  style,
}: TabsProps<T>) {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label={label}
        style={{ display: 'flex', gap: 8, padding: '12px var(--gutter)', ...style }}
      >
        {items.map((item) => (
          <FilterPill
            key={item.value}
            active={value === item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            aria-selected={value === item.value}
            aria-label={item.ariaLabel}
          >
            {item.label}
          </FilterPill>
        ))}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0, ...style }}
    >
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            aria-label={item.ariaLabel}
            onClick={() => onChange(item.value)}
            style={{
              flex: 1,
              height: 42,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-meta)',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: active ? 'var(--color-primary-base)' : 'transparent',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
