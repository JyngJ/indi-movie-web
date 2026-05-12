'use client'

export type DayType = 'weekday' | 'saturday' | 'sunday' | 'holiday' | 'today'
export type TimeFilter = '전체' | '오전' | '오후' | '18시 이후' | '심야'

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
  timeFilters?: TimeFilter[]
  selectedTime?: TimeFilter
  onSelectDate?: (date: string) => void
  onSelectTime?: (time: TimeFilter) => void
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

export function DateBar({
  days,
  selectedDate,
  timeFilters = ['전체', '오전', '오후', '18시 이후', '심야'],
  selectedTime = '전체',
  onSelectDate,
  onSelectTime,
}: DateBarProps) {
  return (
    <div
      style={{
        width: '100%',
        padding: '14px 16px',
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
                {d.dow}
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

      {/* 시간대 필터 */}
      <div className="flex gap-2 mt-[14px] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {timeFilters.map((f) => {
          const active = f === selectedTime
          return (
            <button
              key={f}
              type="button"
              className="flex-shrink-0 inline-flex items-center border transition-colors duration-150"
              style={{
                height: 'var(--comp-time-chip-height)',   /* 30px */
                paddingLeft: 'var(--comp-time-chip-px)',  /* 12px */
                paddingRight: 'var(--comp-time-chip-px)',
                borderRadius: 'var(--comp-time-chip-radius)', /* pill */
                fontSize: 'var(--comp-time-chip-font)',   /* 12px */
                fontWeight: 500,
                backgroundColor: active ? 'var(--color-primary-base)' : 'var(--color-surface-raised)',
                borderColor:     active ? 'var(--color-primary-base)' : 'var(--color-border)',
                color:           active ? '#FFFFFF' : 'var(--color-text-body)',
                cursor: 'pointer',
              }}
              onClick={() => onSelectTime?.(f)}
            >
              {f}
            </button>
          )
        })}
      </div>
    </div>
  )
}
