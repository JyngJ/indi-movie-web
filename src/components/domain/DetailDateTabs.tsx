'use client'

import { calendarDayKind, type CalendarDayKind } from '@/lib/calendar/koreanHolidays'

/* 요일 글자 색 — 토요일은 DateBar와 같은 primary/500, 일·공휴일은 이 탭이 원래 쓰던 error */
const DOW_COLOR: Record<CalendarDayKind, string> = {
  weekday: 'var(--color-text-caption)',
  saturday: 'var(--color-primary-500)',
  sunday: 'var(--color-error)',
  holiday: 'var(--color-error)',
}
/* 숫자는 기존 규칙 그대로 — 일·공휴일만 빨강, 토요일은 요일 글자만 색을 입힌다 */
const NUM_COLOR: Record<CalendarDayKind, string> = {
  weekday: 'var(--color-text-primary)',
  saturday: 'var(--color-text-primary)',
  sunday: 'var(--color-error)',
  holiday: 'var(--color-error)',
}

/** 상세(영화·극장·영화제) 공용 날짜 탭 — 56×60 언더라인, 상영 있는 날만 활성.
 *  dates: ISO 날짜들, activeDates: 상영 있는 ISO 집합.
 *  labels: 요일 자리에 대신 쓸 글자(예: 영화제 "개막"·"폐막"). 없으면 첫 칸은 "오늘", 나머지는 요일.
 *  firstIsToday=false면 첫 칸도 요일로 쓴다 — 오늘부터 시작하지 않는 목록(영화제 회기)용. */
export function DetailDateTabs({
  dates,
  selectedDate,
  activeDates,
  onSelect,
  labels,
  firstIsToday = true,
}: {
  dates: string[]
  selectedDate: string
  activeDates: ReadonlySet<string>
  onSelect: (isoDate: string) => void
  labels?: Readonly<Record<string, string>>
  firstIsToday?: boolean
}) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  return (
    <div role="tablist" aria-label="날짜" style={{ display: 'flex', overflowX: 'auto', padding: '0 var(--spacing-1)' }} className="no-scrollbar">
      {dates.map((d, i) => {
        const dt = new Date(d + 'T00:00:00')
        const kind = calendarDayKind(d)
        const isSelected = d === selectedDate
        const hasShows = activeDates.has(d)
        const top = labels?.[d] ?? (i === 0 && firstIsToday ? '오늘' : DOW[dt.getDay()])
        return (
          <button
            key={d}
            role="tab"
            aria-selected={isSelected}
            onClick={() => hasShows && onSelect(d)}
            style={{
              /* 폭이 남으면 셀이 나눠 갖는다 — PC 본문 컬럼을 채운다(피그마 2026-09-17).
                 모바일(7×56 > 화면)에서는 56으로 남고 가로 스크롤 */
              flex: '1 0 56px', minWidth: 56, height: 60,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-1)',
              border: 'none', background: 'none', cursor: hasShows ? 'pointer' : 'default',
              opacity: hasShows ? 1 : 0.35,
              borderBottom: isSelected ? '2px solid var(--color-primary-base)' : '2px solid transparent',
              minHeight: 'auto',
            }}
            disabled={!hasShows}
          >
            <span style={{ fontSize: 'var(--text-badge)', fontWeight: labels?.[d] ? 700 : 500, color: isSelected ? 'var(--color-primary-base)' : DOW_COLOR[kind] }}>
              {top}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, fontFeatureSettings: '"tnum"', color: isSelected ? 'var(--color-primary-base)' : NUM_COLOR[kind] }}>
              {dt.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
