import { useState } from 'react'
import { DOW, today, fmtMD, isSameDay } from './dateHelpers'
import { IcoNavPrev, IcoNavNext } from './icons'

/* -- CalendarPicker (범위 선택) ----------------------------------- */
export function CalendarPicker({ startDate, endDate, onApply, onCancel, style }: {
  startDate: Date | null
  endDate: Date | null
  onApply: (start: Date, end: Date) => void
  onCancel: () => void
  style?: React.CSSProperties
}) {
  const todayDate = today()
  const [rangeStart, setRangeStart] = useState<Date | null>(startDate)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(endDate)
  const [hovered, setHovered] = useState<Date | null>(null)
  const [viewMonth, setViewMonth] = useState(() => {
    const base = startDate ?? todayDate
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const previewEnd = rangeStart && !rangeEnd && hovered ? hovered : rangeEnd
  const lo = rangeStart && previewEnd ? (rangeStart <= previewEnd ? rangeStart : previewEnd) : rangeStart
  const hi = rangeStart && previewEnd ? (rangeStart <= previewEnd ? previewEnd : rangeStart) : null
  const canApply = !!rangeStart && !!rangeEnd
  const hint = !rangeStart ? '시작일을 선택하세요'
    : !rangeEnd ? '종료일을 선택하세요'
    : `${fmtMD(rangeStart)} (${DOW[rangeStart.getDay()]}) - ${fmtMD(rangeEnd)} (${DOW[rangeEnd.getDay()]})`

  function handleDayClick(d: Date) {
    if (d < todayDate) return
    if (!rangeStart || rangeEnd) {
      setRangeStart(d)
      setRangeEnd(null)
      return
    }
    const [s, e] = d >= rangeStart ? [rangeStart, d] : [d, rangeStart]
    setRangeStart(s)
    setRangeEnd(e)
  }

  const navBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    background: 'transparent', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--color-text-body)', minHeight: 'unset',
  }

  return (
    <div style={{
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.72)',
      ...style,
    }}>
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button style={navBtn} onClick={() => setViewMonth(new Date(year, month - 1, 1))}>
            <IcoNavPrev />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {year}년 {month + 1}월
          </span>
          <button style={navBtn} onClick={() => setViewMonth(new Date(year, month + 1, 1))}>
            <IcoNavNext />
          </button>
        </div>
        <div style={{
          textAlign: 'center', fontSize: 13,
          color: rangeStart && !rangeEnd ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
          marginBottom: 12, fontWeight: rangeStart && !rangeEnd ? 600 : 400,
          minHeight: 18,
        }}>
          {hint}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DOW.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 600,
              color: i === 0 ? '#E30613' : i === 6 ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
              padding: '3px 0',
            }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} style={{ height: 38 }} />

            const cellDate = new Date(year, month, day)
            const isPast = cellDate < todayDate
            const isToday = isSameDay(cellDate, todayDate)
            const isStart = !!rangeStart && isSameDay(cellDate, rangeStart)
            const isEnd = !!rangeEnd && isSameDay(cellDate, rangeEnd)
            const isEndPreview = !rangeEnd && !!hovered && !!rangeStart
              && isSameDay(cellDate, hovered >= rangeStart ? hovered : rangeStart)
            const isStartPreview = !rangeEnd && !!hovered && !!rangeStart
              && hovered < rangeStart && isSameDay(cellDate, rangeStart)
            const inRange = !!lo && !!hi && cellDate > lo && cellDate < hi
            const colIdx = (firstDow + day - 1) % 7
            const isSun = colIdx === 0
            const isSat = colIdx === 6
            const barActive = isStart || isEnd || isStartPreview || isEndPreview || inRange
            const isRangeStart = isStart || isStartPreview
            const isRangeEnd = isEnd || isEndPreview
            const isDot = isStart || isEnd || isStartPreview || isEndPreview

            let textColor = 'var(--color-text-body)'
            if (isPast) textColor = 'var(--color-text-placeholder)'
            else if (isSun) textColor = '#E30613'
            else if (isSat) textColor = 'var(--color-primary-base)'
            if (isDot) textColor = '#fff'

            return (
              <div
                key={i}
                onMouseEnter={() => !isPast && setHovered(cellDate)}
                onMouseLeave={() => setHovered(null)}
                style={{ position: 'relative', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {barActive && (
                  <div style={{
                    position: 'absolute', top: 4, bottom: 4,
                    left: isRangeStart ? '50%' : 0,
                    right: isRangeEnd ? '50%' : 0,
                    background: 'var(--color-primary-subtle-l)',
                    pointerEvents: 'none',
                  }} />
                )}
                <button
                  disabled={isPast}
                  onClick={() => handleDayClick(cellDate)}
                  style={{
                    position: 'relative', zIndex: 1,
                    width: 34, height: 34, borderRadius: '50%',
                    background: isDot ? 'var(--color-primary-base)' : 'transparent',
                    color: textColor,
                    fontWeight: isDot ? 700 : isToday ? 700 : 400,
                    fontSize: 14,
                    border: isToday && !isDot ? '1.5px solid var(--color-primary-base)' : 'none',
                    cursor: isPast ? 'default' : 'pointer',
                    minHeight: 'unset', flexShrink: 0,
                    transition: 'background 100ms',
                  }}
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 8,
        padding: '12px 14px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-raised)',
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, height: 40, borderRadius: 999,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            fontSize: 14, fontWeight: 500,
            color: 'var(--color-text-body)',
            cursor: 'pointer', minHeight: 'unset',
          }}
        >
          취소
        </button>
        <button
          disabled={!canApply}
          onClick={() => canApply && onApply(rangeStart!, rangeEnd!)}
          style={{
            flex: 2, height: 40, borderRadius: 999,
            background: canApply ? 'var(--color-primary-base)' : 'var(--color-surface-raised)',
            border: canApply ? 'none' : '1px solid var(--color-border)',
            fontSize: 14, fontWeight: 600,
            color: canApply ? '#fff' : 'var(--color-text-placeholder)',
            cursor: canApply ? 'pointer' : 'default',
            transition: 'background 150ms, color 150ms',
            minHeight: 'unset',
          }}
        >
          적용
        </button>
      </div>
    </div>
  )
}
