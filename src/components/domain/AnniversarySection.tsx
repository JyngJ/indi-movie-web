'use client'

import { useRef } from 'react'
import type { Movie } from '@/types/api'
import type { AnniversaryEventType } from '@/lib/curation/directorAnniversaries'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { RevealItem } from '@/components/motion'
import { trackEvent } from '@/lib/analytics/client'
import { GenreChip } from '@/components/primitives'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { buildSectionAnalytics } from '@/lib/curation/sectionRuns'
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

/* 액센트는 토큰만 — 하드코딩 헥사(#C8901A·#8A5F00·#2E4A65)를 쓰던 자리다.
   탄생일은 warning 램프(오커), 기일은 primary 램프. "틴트 배경 + deep 텍스트" 문법. */
function accentColors(eventType: AnniversaryEventType) {
  const isBirthday = eventType === 'birthday'
  return {
    tint: isBirthday ? 'var(--color-warning-tint)' : 'var(--color-primary-subtle)',
    text: isBirthday ? 'var(--color-warning-deep)' : 'var(--color-primary-text)',
  }
}

export function AnniversarySection({
  sectionTitle, sectionDesc, eventType,
  nameKo, nameEn, birthYear, deathYear,
  month, day,
  films, isDesktop, compact = false, onMovieClick,
}: Props) {
  /* 상단 고정 섹션이라 run 순번 밖이다. 순서 재배치 논의에 쓰려면 체류·클릭이 다른 행과
     같은 축으로 찍혀야 해서 같은 메타를 싣는다. */
  const sectionRef = useRef<HTMLDivElement>(null)
  const analytics = {
    ...buildSectionAnalytics({
      listId: 'anniversary', sectionTitle: sectionTitle,
      run: 'fixed_top', movieCount: films.length, compact,
    }),
    event_type: eventType,
    person: nameKo,
  }
  useSectionDwellTracking(sectionRef, films.length > 0 ? 'anniversary' : undefined, analytics)

  if (films.length === 0) return null

  const { tint, text } = accentColors(eventType)
  const years = deathYear ? `${birthYear} – ${deathYear}` : `b. ${birthYear}`
  const dateLabel = `${month}월 ${day}일`

  /* 2.0 섹션 문법 — 맨 종이 위 플랫 헤더(특별전·큐레이션 행과 동일).
     예전엔 액센트 테두리를 두른 틴트 상자라 이 섹션만 다른 시스템처럼 보였다.
     기념일 성격은 날짜 칩의 틴트 하나로만 드러낸다. */
  const header = (
    <div style={{
      padding: compact ? '0' : '0 var(--gutter-sheet)',
      display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)',
      marginBottom: 'var(--spacing-3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
        <h2 className="display-h2" style={{
          margin: 0, minWidth: 0, color: 'var(--color-text-primary)',
          fontSize: compact ? 'var(--text-title)' : undefined,
        }}>
          {sectionTitle}
        </h2>
        <span style={{
          fontSize: 'var(--text-caption)', fontWeight: 700, color: text,
          background: tint,
          borderRadius: 'var(--radius-pill)', padding: 'var(--spacing-1) var(--spacing-2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {dateLabel}
        </span>
      </div>
      <p style={{
        margin: 0, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.5,
      }}>
        {sectionDesc} · {nameEn} · {years}
      </p>
    </div>
  )

  if (compact) {
    // 1~2편 — 포스터 + 정보 inline (스크롤 없음)
    return (
      <div ref={sectionRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {header}
        <div style={{
          display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          {films.slice(0, 2).map((film, i) => (
            <RevealItem
              key={film.id}
              preset="slide"
              staggerIndex={i}
              onClick={onMovieClick ? () => {
                trackEvent('curation movie selected', { ...analytics, movie_id: film.id, movie_title: film.title })
                onMovieClick(film.id)
              } : undefined}
              style={{
                display: 'flex', gap: 'var(--spacing-3)', alignItems: 'flex-start', minWidth: 0,
                cursor: onMovieClick ? 'pointer' : undefined,
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <PosterThumb src={film.posterUrl} alt={film.title} width={120} height={180} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)', minWidth: 0, justifyContent: 'flex-start' }}>
                <span style={{
                  fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-body)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3,
                }}>
                  {normalizeTitle(film.title)}
                </span>
                <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {film.director[0] ?? '감독 미상'}
                </span>
                <div style={{ display: 'flex', gap: 'var(--spacing-1)', alignItems: 'center' }}>
                  {film.genre.slice(0, 1).map((g) => (
                    <GenreChip key={g}>{g}</GenreChip>
                  ))}
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontWeight: 600 }}>{film.year}</span>
                </div>
              </div>
            </RevealItem>
          ))}
        </div>
      </div>
    )
  }

  // 일반 모드 — 가로 스크롤
  return (
    /* 섹션 리듬은 모바일 32 · PC 48 — 다른 섹션(CurationSectionRow·특별전)과 같은 값.
       예전엔 모바일만 24라 기념일 위에서만 간격이 좁았다. */
    <div ref={sectionRef} style={{ paddingTop: isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)' }}>
      {header}
      <CurationSectionRow
        title=""
        movies={films} isDesktop={isDesktop}
        onMovieClick={onMovieClick ? (movieId) => {
          trackEvent('curation movie selected', {
            ...analytics, movie_id: movieId,
            movie_title: films.find((f) => f.id === movieId)?.title,
          })
          onMovieClick(movieId)
        } : undefined}
        noHeader
      />
    </div>
  )
}
