'use client'

export type DayType = 'weekday' | 'saturday' | 'sunday' | 'holiday' | 'today'

export interface Day {
  dow: string
  date: string
  isoDate: string   // 'YYYY-MM-DD' — API 쿼리용
  type: DayType
  disabled?: boolean
}

interface DateBarProps {
  days: Day[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
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

export function DateBar({ days, selectedDate, onSelectDate }: DateBarProps) {
  return (
    <div
      style={{
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'var(--color-surface-card)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* 날짜 행 */}
      <div className="flex justify-between gap-1">
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
                border: 'none',
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
            </button>
          )
        })}
      </div>

    </div>
  )
}
