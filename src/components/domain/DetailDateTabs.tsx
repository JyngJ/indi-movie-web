'use client'

/** 상세(영화·극장) 공용 날짜 탭 — 56×60 언더라인, 상영 있는 날만 활성.
 *  dates: ISO 7일, activeDates: 상영 있는 ISO 집합. */
export function DetailDateTabs({
  dates,
  selectedDate,
  activeDates,
  onSelect,
}: {
  dates: string[]
  selectedDate: string
  activeDates: ReadonlySet<string>
  onSelect: (isoDate: string) => void
}) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  return (
    <div style={{ display: 'flex', overflowX: 'auto', padding: '0 var(--spacing-1)' }} className="no-scrollbar">
      {dates.map((d, i) => {
        const dt = new Date(d + 'T00:00:00')
        const day = DOW[dt.getDay()]
        const isHoliday = dt.getDay() === 0
        const isSelected = d === selectedDate
        const hasShows = activeDates.has(d)
        return (
          <button
            key={d}
            onClick={() => hasShows && onSelect(d)}
            style={{
              flexShrink: 0, width: 56, height: 60,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              border: 'none', background: 'none', cursor: hasShows ? 'pointer' : 'default',
              opacity: hasShows ? 1 : 0.35,
              borderBottom: isSelected ? '2px solid var(--color-primary-base)' : '2px solid transparent',
              minHeight: 'auto',
            }}
            disabled={!hasShows}
          >
            <span style={{ fontSize: 'var(--text-badge)', fontWeight: 500, color: isSelected ? 'var(--color-primary-base)' : isHoliday ? 'var(--color-error)' : 'var(--color-text-caption)' }}>
              {i === 0 ? '오늘' : day}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, fontFeatureSettings: '"tnum"', color: isSelected ? 'var(--color-primary-base)' : isHoliday ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
              {dt.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
