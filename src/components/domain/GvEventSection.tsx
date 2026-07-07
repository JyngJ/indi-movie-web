'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { GvEvent } from '@/data/gv-events'
import { gvEventTypeColor } from '@/lib/gv/adapter'

const navBtn: React.CSSProperties = {
  position: 'absolute', top: '50%',
  transform: 'translateY(-50%)',
  width: 32, height: 32, borderRadius: '50%',
  border: 'none', cursor: 'pointer',
  backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 72%, transparent)',
  backdropFilter: 'blur(8px)',
  color: 'var(--color-text-body)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
  zIndex: 2,
  padding: 0,
  minHeight: 'auto',
}

function sortKey(time: string): number {
  const [datePart, timePart = '0:0'] = time.split(' ')
  const [m, d] = datePart.split('/').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  return m * 1000000 + d * 10000 + h * 100 + min
}

function gvTimeToIsoDate(time: string, refYear: number): string {
  const [datePart] = time.split(' ')
  const [m, d] = datePart.split('/').map(Number)
  return `${refYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function statusColor(status: GvEvent['status']): string {
  if (status === '매진') return '#b91c1c'
  if (status === '매진 임박') return '#ea580c'
  return '#16a34a'
}

interface GvEventSectionProps {
  events: GvEvent[]
  theaterName: string
  selectedIsoDate: string
  onGvOpen?: (id: string) => void
}

export function GvEventSection({ events: allEvents, theaterName, selectedIsoDate, onGvOpen }: GvEventSectionProps) {
  const year = selectedIsoDate ? Number(selectedIsoDate.split('-')[0]) : new Date().getFullYear()

  const events = allEvents
    .filter(ev => ev.theaterName === theaterName)
    .sort((a, b) => sortKey(a.time) - sortKey(b.time))

  const [open, setOpen] = useState(true)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const updateEdge = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    updateEdge()
  }, [open, updateEdge])

  useEffect(() => {
    const target = events.find(ev => gvTimeToIsoDate(ev.time, year) === selectedIsoDate)
    if (!target) return
    const card = cardRefs.current.get(target.id)
    const container = scrollRef.current
    if (!card || !container) return
    const offset = card.offsetLeft - 16
    container.scrollTo({ left: offset, behavior: 'smooth' })
  }, [selectedIsoDate]) // eslint-disable-line react-hooks/exhaustive-deps

  if (events.length === 0) return null

  const CARD_STEP = 148 + 8

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-bg)' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%',
          padding: '10px 16px 6px', gap: 'var(--spacing-1-5)',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
          이벤트
        </span>
        <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-caption)', marginRight: 4 }}>
          {events.length}개
        </span>
        <svg
          width={14} height={14} viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-caption)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Horizontal scroll + nav buttons */}
      {open && (
        <div style={{ position: 'relative' }}>
          {canLeft && (
            <button
              style={{ ...navBtn, left: 6 }}
              onClick={() => scrollRef.current?.scrollBy({ left: -CARD_STEP * 2, behavior: 'smooth' })}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          {canRight && (
            <button
              style={{ ...navBtn, right: 6 }}
              onClick={() => scrollRef.current?.scrollBy({ left: CARD_STEP * 2, behavior: 'smooth' })}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
          <div
            ref={scrollRef}
            onScroll={updateEdge}
            style={{
              display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto',
              padding: '2px 16px 10px',
              scrollbarWidth: 'none',
            }}
          >
            {events.map(ev => {
              const evIsoDate = gvTimeToIsoDate(ev.time, year)
              const isHighlighted = evIsoDate === selectedIsoDate
              const [datePart, timePart = ''] = ev.time.split(' ')
              const sc = statusColor(ev.status)
              return (
                <div
                  key={ev.id}
                  ref={el => { if (el) cardRefs.current.set(ev.id, el); else cardRefs.current.delete(ev.id) }}
                  onClick={() => onGvOpen?.(ev.id)}
                  style={{
                    flexShrink: 0,
                    width: 148,
                    borderRadius: 'var(--radius-xl)',
                    border: isHighlighted ? '1.5px solid #4A6380' : '1px solid var(--color-border)',
                    background: 'var(--color-surface-card)',
                    overflow: 'hidden',
                    boxShadow: isHighlighted
                      ? '0 0 0 2px rgba(74,99,128,0.22), 0 2px 8px rgba(0,0,0,0.10)'
                      : '0 1px 4px rgba(0,0,0,0.07)',
                    cursor: onGvOpen ? 'pointer' : 'default',
                  }}
                >
                  {/* Poster area */}
                  <div style={{
                    position: 'relative', height: 56,
                    background: `oklch(28% 0.07 ${ev.hue})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {ev.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.posterUrl}
                        alt={ev.movie}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-h2)', fontWeight: 900, color: 'rgba(255,255,255,0.15)',
                        userSelect: 'none',
                      }}>{ev.label}</span>
                    )}
                    <div style={{
                      position: 'absolute', top: 5, left: 5,
                      background: gvEventTypeColor(ev.type), color: '#fff',
                      fontSize: 'var(--text-badge)', fontWeight: 800, borderRadius: 'var(--radius-sm)', padding: '2px 5px', letterSpacing: '0.3px',
                    }}>{ev.type}</div>
                    <div style={{
                      position: 'absolute', bottom: 5, right: 5,
                      background: 'rgba(0,0,0,0.5)', color: '#fff',
                      fontSize: 'var(--text-badge)', fontWeight: 600, borderRadius: 'var(--radius-sm)', padding: '1.5px 5px',
                      backdropFilter: 'blur(4px)',
                      whiteSpace: 'nowrap',
                    }}>
                      {datePart}{timePart ? ` ${timePart}` : ''}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '6px 8px 7px' }}>
                    <div style={{
                      fontSize: 'var(--text-meta)', fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ev.movie}
                    </div>
                    {ev.subtitle && (
                      <div style={{
                        fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}>
                        — {ev.subtitle}
                      </div>
                    )}
                    {ev.guest && (
                      <div style={{
                        fontSize: 'var(--text-caption)', color: 'var(--color-text-caption)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}>
                        {ev.guest}
                      </div>
                    )}
                    <span style={{ fontSize: 'var(--text-badge)', fontWeight: 600, color: sc, whiteSpace: 'nowrap', display: 'block', marginTop: 4 }}>
                      ● {ev.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
