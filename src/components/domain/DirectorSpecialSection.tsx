'use client'

import { useRef } from 'react'
import type { Movie, Theater } from '@/types/api'
import { Button } from '@/components/primitives'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { trackEvent } from '@/lib/analytics/client'
import { buildSectionAnalytics } from '@/lib/curation/sectionRuns'
import { Icon } from '@/components/primitives'

interface Props {
  directorName: string
  theater: Theater
  films: Movie[]
  distSuffix?: string
  isDesktop: boolean
  /** 화면에 몇 번째 특별전인지 (0 = run1 앞, 1 = 특별전 #1) — 두 슬롯의 성과를 갈라 보려면 필요 */
  slot?: number
  onTheaterClick?: (id: string) => void
  onMovieClick?: (id: string) => void
}

/* 2.0: 카드 2장(감독 카드+회색 블록) 폐기 — 맨 종이 위 플랫 헤더 + 포스터 행 (피그마 TOBE).
   포스터 행은 CurationSectionRow(noHeader)에 위임한다. 예전엔 MovieCard·HoverPopup·
   스크롤·마스크를 통째로 복사해 갖고 있었는데, 원본이 embla로 옮겨가고 화살표 마운트 정책이
   바뀌는 동안 이 복사본만 네이티브 스크롤에 남아 연타 거리 누적과 rage click을 그대로 안고 있었다. */
export function DirectorSpecialSection({
  directorName, theater, films, distSuffix, isDesktop, slot,
  onTheaterClick, onMovieClick,
}: Props) {
  /* run 순번 밖(상단 고정)이라 position이 없다 — slot으로 #0/#1을 구분한다 */
  const sectionRef = useRef<HTMLElement>(null)
  const analytics = {
    ...buildSectionAnalytics({
      listId: 'director_special', sectionTitle: `${directorName} 특별전`,
      run: 'fixed_top', movieCount: films.length,
    }),
    director: directorName,
    theater_id: theater.id,
    theater_name: theater.name,
    ...(slot != null ? { slot } : {}),
  }
  useSectionDwellTracking(sectionRef, films.length > 0 ? 'director_special' : undefined, analytics)

  if (films.length === 0) return null

  return (
    <section ref={sectionRef} style={{ paddingTop: isDesktop ? 48 : 32 }}>
      <h2 className="display-h2" style={{
        margin: 0, padding: '0 var(--gutter-sheet)',
        color: 'var(--color-text-primary)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {directorName} 특별전
      </h2>

      {/* 극장 헤더 — 모바일: 통짜 틴트 바(피그마 Frame 27), PC: 플랫 행 */}
      <div style={isDesktop ? { display: 'flex', alignItems: 'center', gap: 12, padding: '0 var(--gutter-sheet) 4px' } : {
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '0 var(--gutter-sheet) 4px',
        padding: 'var(--spacing-2) var(--spacing-4) var(--spacing-2) var(--spacing-2)',
        backgroundColor: 'var(--color-primary-subtle-l)',
        borderRadius: 'var(--radius-button)',
      }}>
        <span style={{
          width: 40, height: 40, flexShrink: 0, borderRadius: 'var(--radius-badge)',
          backgroundColor: isDesktop ? 'var(--color-primary-subtle-l)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="theater" size={21} strokeWidth={1.75} color="var(--color-primary-base)" />
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: isDesktop ? 'var(--text-title)' : 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {theater.name}
          </span>
          <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
            {theater.city} · {films.length}편 상영중{distSuffix ? ` ${distSuffix}` : ''}
          </span>
        </div>
        {onTheaterClick && (
          <Button variant="text" size="sm" onClick={() => {
            trackEvent('curation theater selected', { ...analytics })
            onTheaterClick(theater.id)
          }}>
            영화관 보기 ›
          </Button>
        )}
      </div>

      <CurationSectionRow
        title=""
        movies={films}
        isDesktop={isDesktop}
        onMovieClick={onMovieClick ? (movieId) => {
          trackEvent('curation movie selected', {
            ...analytics, movie_id: movieId,
            movie_title: films.find((f) => f.id === movieId)?.title,
          })
          onMovieClick(movieId)
        } : undefined}
        noHeader
      />
    </section>
  )
}
