'use client'

export type DayType = 'weekday' | 'saturday' | 'sunday' | 'holiday' | 'today'
export type TimeFilter = '전체' | '오전' | '오후' | '18시 이후' | '심야'

interface Day {
  dow: string
  date: string
  type: DayType
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
    case 'today':    return '#FFFFFF'
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
          const isToday    = d.type === 'today'
          const isSelected = isToday || d.date === selectedDate
          const textColor  = getDayTextColor(d.type)

          return (
            <button
              key={d.date}
              type="button"
              className="flex-1 flex flex-col items-center"
              style={{
                paddingTop: 'var(--comp-date-cell-pt)',     /* 6px */
                paddingBottom: 'var(--comp-date-cell-pb)',  /* 8px */
                borderRadius: 'var(--comp-date-cell-radius)', /* 8px */
                backgroundColor: isSelected ? 'var(--color-primary-base)' : 'transparent',
                cursor: 'pointer',
                border: 'none',
              }}
              onClick={() => onSelectDate?.(d.date)}
            >
              <span
                style={{
                  fontSize: 'var(--text-dow)',     /* 10px */
                  fontWeight: 500,
                  lineHeight: 1,
                  marginBottom: 4,
                  color: isSelected ? 'rgba(255,255,255,0.85)' : textColor,
                }}
              >
                {d.dow}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-date)',    /* 16px */
                  fontWeight: 700,
                  fontFeatureSettings: '"tnum"',
                  lineHeight: 1,
                  color: isSelected ? '#FFFFFF' : textColor,
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
