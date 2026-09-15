'use client'

import { useEffect, useRef } from 'react'
import { formatDateLabel } from '@/lib/date'
import type { MovieTheaterEntry } from '@/lib/supabase/queries'

/* ── SEO 전용 상영시간표 (JS 없이도 검색엔진·사용자에게 노출) ──
 * 본문은 선택한 날짜의 회차만 표시하므로 전체 날짜의 시간표를 함께 제공한다.
 * 이 섹션은 서버에서 항상 렌더되고, 하이드레이션 이후에만 본문과 중복되지
 * 않도록 스스로 숨는다 — JS 비활성 환경에선 계속 보인다. */
export function SeoShowtimesSection({ movieTitle, entries }: { movieTitle: string; entries: MovieTheaterEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.display = 'none'
  }, [])

  if (entries.length === 0) return null

  const sorted = [...entries].sort((a, b) => a.theaterName.localeCompare(b.theaterName, 'ko'))

  return (
    <div ref={ref}>
      <section aria-label={`${movieTitle} 상영 시간표`} style={{ padding: '20px var(--gutter) 0' }}>
        <h2 style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {movieTitle} 상영 시간표
        </h2>
        {sorted.map((entry) => (
          <div key={entry.theaterId} style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {entry.theaterName} — {entry.theaterAddress}
            </h3>
            <ul>
              {entry.dateGroups.map((group) => (
                <li key={group.date}>
                  {formatDateLabel(group.date)}: {group.showtimes.map((st) => st.showTime.slice(0, 5)).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
