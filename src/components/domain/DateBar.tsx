'use client'

import { useState } from 'react'

export type DayType = 'weekday' | 'saturday' | 'sunday' | 'holiday' | 'today'

export interface Day {
  dow: string
  date: string
  isoDate: string   // 'YYYY-MM-DD' — API 쿼리용
  type: DayType
  disabled?: boolean
  hasSelectedMovie?: boolean   // 선택된 영화가 이 날짜에 상영하는지
}

interface DateBarProps {
  days: Day[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

function getDayTextColor(type: DayType): string {
  /* tokens.js dateBar.dayCell 기준 */
  switch (type) {
    case 'today':    return 'var(--color-primary-base)'      /* 비선택 시 primary 색으로 강조 */
    case 'saturday': return 'var(--color-primary-hover-l)'  /* #5C7896 */
    case 'sunday':
    case 'holiday':  return 'var(--color-error)'             /* #B94A48 */
    default:         return 'var(--color-text-sub)'          /* #635D55 */
  }
}

const NAV_BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, flexShrink: 0,
  background: 'none', border: 'none',
  borderRadius: '50%',
  color: 'var(--color-text-sub)',
  cursor: 'pointer',
  padding: 0,
  minHeight: 'unset',
}

/* 이전/다음 주 이동 버튼 — 누르면 쫀득하게 눌렸다 튕겨 돌아옴(:active는 터치에서 잘 안 먹어 포인터 이벤트로 직접 제어) */
function DateNavButton({ direction, onClick, enabled, label }: { direction: 'prev' | 'next'; onClick?: () => void; enabled?: boolean; label: string }) {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      onPointerDown={() => enabled && setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      style={{
        ...NAV_BTN,
        opacity: enabled ? 1 : 0.25,
        cursor: enabled ? 'pointer' : 'default',
        transform: pressed ? 'scale(0.78)' : 'scale(1)',
        transition: pressed
          ? 'transform 0.05s ease-out'
          : 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms',
      }}
      aria-label={label}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}

export function DateBar({ days, selectedDate, onSelectDate, onPrev, onNext, hasPrev, hasNext }: DateBarProps) {
  return (
    <div
      style={{
        width: '100%',
        padding: '8px 6px',
        backgroundColor: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* 이전 버튼 */}
      <DateNavButton direction="prev" onClick={onPrev} enabled={hasPrev} label="이전 주" />

      {/* 날짜 행 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        {days.map((d) => {
          const isSelected = d.date === selectedDate
          const isDisabled = !!d.disabled
          // disabled이면 선택 불가 → 선택 상태도 해제해서 보여줌
          const active     = isSelected && !isDisabled

          const textColor = isDisabled
            ? 'var(--color-text-placeholder)'
            : getDayTextColor(d.type)

          return (
            <button
              key={d.date}
              type="button"
              disabled={isDisabled}
              className="flex-1 flex flex-col items-center"
              style={{
                paddingTop: 'var(--comp-date-cell-pt)',
                paddingBottom: 'var(--comp-date-cell-pb)',
                borderRadius: 'var(--comp-date-cell-radius)',
                backgroundColor: active ? 'var(--color-primary-base)' : 'transparent',
                cursor: isDisabled ? 'default' : 'pointer',
                border: (d.type === 'today' && !active)
                  ? '1.5px solid color-mix(in srgb, var(--color-primary-base) 50%, transparent)'
                  : '1.5px solid transparent',
                opacity: isDisabled ? 0.4 : 1,
                position: 'relative',
              }}
              onClick={isDisabled ? undefined : () => onSelectDate?.(d.date)}
            >
              <span
                style={{
                  fontSize: 'var(--text-dow)',
                  fontWeight: 500,
                  lineHeight: 1,
                  marginBottom: 4,
                  color: active ? 'rgba(255,255,255,0.85)' : textColor,
                }}
              >
                {d.type === 'today' ? '오늘' : d.dow}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-date)',
                  fontWeight: 700,
                  fontFeatureSettings: '"tnum"',
                  lineHeight: 1,
                  color: active ? '#FFFFFF' : textColor,
                  // disabled 날짜에 가로줄 — shorthand(textDecoration) 혼용 금지
                  textDecorationLine: isDisabled ? 'line-through' : 'none',
                  textDecorationColor: 'var(--color-text-placeholder)',
                }}
              >
                {d.date}
              </span>
              {d.hasSelectedMovie && !isDisabled && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 12,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: active ? 'rgba(255,255,255,0.85)' : 'var(--color-primary-base)',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* 다음 버튼 */}
      <DateNavButton direction="next" onClick={onNext} enabled={hasNext} label="다음 주" />
    </div>
  )
}
