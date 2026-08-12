'use client'

import { useState } from 'react'
import { IconButton } from '@/components/primitives'

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

function getDateNumColor(type: DayType): string {
  /* 피그마: 숫자는 평일 800 · 주말 900 — 유채색은 요일 글자만 */
  switch (type) {
    case 'today':    return 'var(--color-primary-base)'
    case 'saturday':
    case 'sunday':
    case 'holiday':  return 'var(--color-neutral-900)'
    default:         return 'var(--color-neutral-800)'
  }
}

function getDayTextColor(type: DayType): string {
  /* docs/DESIGN.md DateBar dayCell 스펙 기준 */
  switch (type) {
    case 'today':    return 'var(--color-primary-base)'      /* 비선택 시 primary 색으로 강조 */
    case 'saturday': return 'var(--color-primary-500)'  /* 2.0: 토요일 = primary/500 (hover-l은 800으로 어두워져 부적합) */
    case 'sunday':
    case 'holiday':  return 'var(--color-error-mid)'         /* 피그마 error/700 #BD4E4C */
    default:         return 'var(--color-text-sub)'          /* #635D55 */
  }
}

/* 이전/다음 주 이동 버튼 — 누르면 쫀득하게 눌렸다 튕겨 돌아옴(:active는 터치에서 잘 안 먹어 포인터 이벤트로 직접 제어) */
function DateNavButton({ direction, onClick, enabled, label }: { direction: 'prev' | 'next'; onClick?: () => void; enabled?: boolean; label: string }) {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)
  return (
    <IconButton
      variant="ghost"
      size={32}
      data-rc={`datebar-week-${direction}`}
      onClick={onClick}
      disabled={!enabled}
      onPointerDown={() => enabled && setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      style={{
        /* 못 누르는 버튼을 흐리게라도 남겨두면 "눌러도 아무 일 없는 것"으로 읽혀 연타를 부른다.
           자리(layout)는 지키되 보이지 않게 한다. */
        visibility: enabled ? 'visible' : 'hidden',
        opacity: enabled ? 1 : 0,
        cursor: enabled ? 'pointer' : 'default',
        transform: pressed ? 'scale(0.78)' : 'scale(1)',
        transition: pressed
          ? 'transform 0.05s ease-out'
          : 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms',
      }}
      aria-label={label}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </IconButton>
  )
}

export function DateBar({ days, selectedDate, onSelectDate, onPrev, onNext, hasPrev, hasNext }: DateBarProps) {
  return (
    <div
      style={{
        width: '100%',
        padding: '8px 12px',   /* 피그마 datebar pad [8,12] */
        backgroundColor: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* 이전 버튼 */}
      <DateNavButton direction="prev" onClick={onPrev} enabled={hasPrev} label="이전 주" />

      {/* 날짜 행 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        {days.map((d) => {
          const isSelected = d.date === selectedDate
          const isDisabled = !!d.disabled
          // 상영 없는 날도 선택할 수 있다 — 선택하면 똑같이 선택 상태로 보인다
          const active     = isSelected

          const textColor = isDisabled
            ? 'var(--color-text-placeholder)'
            : getDayTextColor(d.type)
          const dateColor = isDisabled
            ? 'var(--color-text-placeholder)'
            : getDateNumColor(d.type)

          return (
            <button
              key={d.date}
              type="button"
              data-rc="datebar-date"
              /* 상영 없는 날도 누를 수 있다 — 그 날로 옮겨 다른 영화를 고를 수 있어야 한다.
                 흐린 표시는 "이 날은 없음"을 알리는 것이지 못 누른다는 뜻이 아니다 */
              className={`flex flex-col items-center${active ? '' : ' date-cell--hoverable'}`}
              style={{
                paddingTop: 'var(--comp-date-cell-pt)',
                paddingBottom: 'var(--comp-date-cell-pb)',
                /* 선택 셀은 좌우 16으로 넓어져 시각적으로 도드라짐 (피그마 오늘 54 vs 38) */
                paddingLeft: active ? 16 : 8,
                paddingRight: active ? 16 : 8,
                transition: 'padding 200ms ease, background 160ms',   /* 오버슈트는 팝(transform)만 — padding 진동 방지 */
                animation: active ? 'date-cell-pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                borderRadius: 'var(--comp-date-cell-radius)',
                backgroundColor: active ? 'var(--color-primary-base)' : 'transparent',
                cursor: 'pointer',
                border: (d.type === 'today' && !active)
                  ? '1.5px solid color-mix(in srgb, var(--color-primary-base) 50%, transparent)'
                  : '1.5px solid transparent',
                opacity: isDisabled && !active ? 0.4 : 1,
                position: 'relative',
              }}
              onClick={() => onSelectDate?.(d.date)}
            >
              <span
                style={{
                  fontSize: 'var(--text-dow)',
                  fontWeight: 400,
                  lineHeight: 1,
                  marginBottom: 4,
                  color: active ? 'var(--color-primary-100)' : textColor,
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
                  color: active ? 'var(--color-neutral-100)' : dateColor,
                  // disabled 날짜에 가로줄 — shorthand(textDecoration) 혼용 금지
                  textDecorationLine: isDisabled && !active ? 'line-through' : 'none',
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
                    width: 'var(--comp-date-ind-w)',
                    height: 'var(--comp-date-ind-h)',
                    borderRadius: 9999,
                    /* 영화 선택 시 상영하는 모든 날에서 점(3px)→선(22px)으로 자라남 (마운트 애니메이션) */
                    animation: 'date-ind-grow 240ms 60ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
                    backgroundColor: active ? 'var(--color-primary-100)' : 'var(--color-neutral-500)',
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
