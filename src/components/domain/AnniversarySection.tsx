'use client'

import type { Movie } from '@/types/api'
import type { AnniversaryEventType } from '@/lib/curation/directorAnniversaries'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { normalizeTitle } from '@/lib/text/normalizeTitle'

interface Props {
  sectionTitle: string
  sectionDesc: string
  eventType: AnniversaryEventType
  nameKo: string
  nameEn: string
  birthYear: number
  deathYear?: number
  month: number
  day: number
  films: Movie[]
  isDesktop: boolean
  /** compact: 외부 여백 없이 반반 2열 레이아웃용 (1편짜리) */
  compact?: boolean
  onMovieClick?: (id: string) => void
}

function accentColors(eventType: AnniversaryEventType) {
  const isBirthday = eventType === 'birthday'
  return {
    bg: isBirthday
      ? 'color-mix(in srgb, #C8901A 12%, var(--color-surface-card))'
      : 'color-mix(in srgb, #4A6380 14%, var(--color-surface-card))',
    border: isBirthday ? '#C8901A' : '#4A6380',
    text: isBirthday ? '#8A5F00' : '#2E4A65',
  }
}

export function AnniversarySection({
  sectionTitle, sectionDesc, eventType,
  nameKo, nameEn, birthYear, deathYear,
  month, day,
  films, isDesktop, compact = false, onMovieClick,
}: Props) {
  if (films.length === 0) return null

  const { bg, border, text } = accentColors(eventType)
  const years = deathYear ? `${birthYear} – ${deathYear}` : `b. ${birthYear}`
  const dateLabel = `${month}월 ${day}일`

  const header = (
    <div style={{
      padding: compact ? '12px 14px' : '14px 16px',
      borderRadius: '10px 10px 0 0',
      background: bg,
      borderTop: `3px solid ${border}`,
      borderLeft: `1px solid color-mix(in srgb, ${border} 30%, transparent)`,
      borderRight: `1px solid color-mix(in srgb, ${border} 30%, transparent)`,
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: compact ? 'var(--text-body)' : (isDesktop ? 18 : 16),
          fontWeight: 700, fontFamily: 'var(--font-display)', color: text,
        }}>
          {sectionTitle}
        </span>
        <span style={{
          fontSize: 'var(--text-caption)', fontWeight: 700, color: text,
          background: `color-mix(in srgb, ${border} 18%, transparent)`,
          border: `1px solid color-mix(in srgb, ${border} 35%, transparent)`,
          borderRadius: 'var(--radius-full)', padding: '2px 8px',
          whiteSpace: 'nowrap',
        }}>
          {dateLabel}
        </span>
        <span style={{
          fontSize: 'var(--text-caption)', color: text, opacity: 0.7,
          fontStyle: 'italic', fontFamily: 'var(--font-serif-en)',
        }}>
          {nameEn} · {years}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: compact ? 12 : 'var(--text-meta)', color: text, opacity: 0.85, lineHeight: 1.5 }}>
        {sectionDesc}
      </p>
    </div>
  )

  const filmBorder = `1px solid color-mix(in srgb, ${border} 25%, transparent)`

  if (compact) {
    // 1~2편 — 포스터 + 정보 inline (스크롤 없음)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {header}
        <div style={{
          display: 'flex', gap: 'var(--spacing-2-5)', alignItems: 'flex-start',
          padding: '12px 14px',
          border: filmBorder, borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          background: 'var(--color-surface-card)',
          flex: 1,
        }}>
          {films.slice(0, 2).map((film) => (
            <div
              key={film.id}
              onClick={onMovieClick ? () => onMovieClick(film.id) : undefined}
              style={{
                display: 'flex', gap: 'var(--spacing-2-5)', alignItems: 'flex-start', flex: 1, minWidth: 0,
                cursor: onMovieClick ? 'pointer' : undefined,
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <PosterThumb src={film.posterUrl} alt={film.title} width={52} height={78} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--color-text-body)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3,
                }}>
                  {normalizeTitle(film.title)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {film.director[0] ?? '감독 미상'}
                </span>
                <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
                  {film.genre.slice(0, 1).map((g) => (
                    <span key={g} style={{
                      fontSize: 10, padding: '2px 5px', borderRadius: 'var(--radius-full)',
                      background: 'var(--color-surface-raised)', color: 'var(--color-text-caption)',
                      border: '1px solid var(--color-border)',
                    }}>{g}</span>
                  ))}
                  <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontWeight: 600 }}>{film.year}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 일반 모드 — 가로 스크롤
  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ margin: '0 16px' }}>{header}</div>
      <div style={{
        margin: '0 16px',
        borderRadius: '0 0 10px 10px',
        border: filmBorder, borderTop: 'none',
        overflow: 'hidden',
      }}>
        <CurationSectionRow
          title="" emoji="" displayMode="default"
          movies={films} isDesktop={isDesktop}
          onMovieClick={onMovieClick}
          noHeader
        />
      </div>
    </div>
  )
}
