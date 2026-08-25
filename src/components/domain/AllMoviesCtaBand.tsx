'use client'

import { useRef } from 'react'
import { Button, Icon } from '@/components/primitives'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { trackEvent } from '@/lib/analytics/client'
import { buildSectionAnalytics } from '@/lib/curation/sectionRuns'

/**
 * 전체 상영작 그리드로 내려가는 진입점 밴드.
 *
 * 왜 있나 — 30일 CTR에서 all_movies_grid가 55%(40명 노출/22클릭)로 전 섹션 1위인데
 * 도달은 꼴찌였다. 끝까지 스크롤한 사람은 절반이 그리드에서 고른다는 뜻이라, 그 수요를
 * 페이지 중간에서 미리 받는다.
 *
 * 왜 포스터가 없나 — 페이지 전체가 가로 포스터 캐러셀의 반복이라, 포스터 없는 텍스트 밴드가
 * 리듬을 끊으면서 오히려 눈에 띈다. 여기까지 스크롤한 사람은 이미 "목록을 보고 싶다"는
 * 상태여서 유혹할 그림이 아니라 진입점만 있으면 된다.
 *
 * 왜 화살표가 아래를 보나 — 그리드는 같은 페이지 맨 아래에 있다. 이동이 아니라 스크롤이다.
 * 오른쪽 화살표를 쓰면 새 페이지를 기대했다가 같은 페이지 하단에 떨어져 기대가 어긋난다.
 */
export function AllMoviesCtaBand({
  movieCount,
  regionLabel,
  isDesktop,
  position,
  onClick,
}: {
  movieCount: number
  regionLabel?: string
  isDesktop: boolean
  /** run 체계 안의 순번 — dwell·click 이벤트가 같은 값을 싣도록 호출부에서 받는다 */
  position?: number
  onClick: () => void
}) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const regionText = regionLabel ? `${regionLabel}에서 ` : ''
  /* 편수가 이 밴드의 전부다. 목록이 로딩 중이면 "0편"이라고 써 놓고 잠시 뒤 216편이 되는데,
     0편은 "상영작이 없다"는 말이라 순간적으로 거짓말을 한다. 셀 게 생길 때까지 안 그린다. */
  const empty = movieCount <= 0
  const title = `지금 ${regionText}상영 중인 영화 ${movieCount}편`

  const analytics = buildSectionAnalytics({
    listId: 'all_movies_cta',
    sectionTitle: title,
    run: 'run2',
    position,
    movieCount,
    layout: 'band',
  })

  /* 훅은 조기 반환 앞에 둔다 — 순서가 렌더마다 같아야 한다 */
  useSectionDwellTracking(sectionRef, empty ? undefined : 'all_movies_cta', analytics)

  if (empty) return null

  return (
    <div
      ref={sectionRef}
      style={{ padding: isDesktop ? '48px var(--gutter-sheet) 0' : '32px var(--gutter-sheet) 0' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 16,
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-button)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-title)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {title}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-caption)',
            }}
          >
            상영관 많은 순·최신순으로 한 번에 훑어봐요
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          onClick={() => {
            trackEvent('curation grid entered', analytics)
            onClick()
          }}
        >
          전체 보기
          <Icon name="arrow-down" size="md" />
        </Button>
      </div>
    </div>
  )
}
