'use client'

import Link from 'next/link'
import { EmptyState } from '@/components/primitives'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { FavoriteActionRow } from '@/components/domain/favorites/FavoriteActionRow'
import { trackEvent } from '@/lib/analytics/client'
import type { SimilarPick } from '@/lib/catalog/similarNowShowing'

const POSTER_W = 104
const POSTER_H = 156

/**
 * 예정된 상영이 없는 영화의 상영 영역 (2026-10).
 * 예전엔 빈 날짜 탭 + "이 날 상영 정보가 없어요"만 남아, 검색으로 들어온 사람이 할 일이 없었다.
 *  1) 관심 영화로 넣으면 다시 상영할 때 알림(new_screening 규칙 — src/lib/notifications/rules.ts)
 *  2) 지금 상영 중인 같은 감독·같은 국가 영화(pickSimilarNowShowing). 고를 게 없으면 칸을 비운다.
 * 목록은 서버가 골라 넘긴다 — HTML에 링크가 실려야 검색 로봇이 따라간다.
 */
export function NoScreeningPanel({
  movie, similar, isDesktop,
}: {
  movie: { id: string; title: string }
  similar: SimilarPick[]
  isDesktop: boolean
}) {
  const gutter = isDesktop ? 0 : 'var(--gutter)'
  return (
    <div style={{ padding: `0 ${isDesktop ? '0' : 'var(--gutter)'}` }}>
      <EmptyState
        variant="block"
        paddingY={32}
        message="지금은 예정된 상영이 없어요"
        description="관심 영화에 넣어 두면 다시 상영할 때 소식에서 알려 드려요"
        action={<FavoriteActionRow type="movie" id={movie.id} label={movie.title} style={{ width: 280, maxWidth: '100%' }} />}
      />

      {similar.length > 0 && (
        <section aria-labelledby="similar-now-showing" style={{ marginTop: 'var(--spacing-8)' }}>
          <h2 id="similar-now-showing" style={{ margin: `0 0 var(--spacing-3)`, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            지금 상영 중인 비슷한 영화
          </h2>
          <ul style={{
            listStyle: 'none', margin: isDesktop ? 0 : `0 calc(-1 * var(--gutter))`, padding: `0 ${gutter} var(--spacing-2)`,
            display: 'flex', gap: 'var(--spacing-3)', overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {similar.map((m) => (
              <li key={m.id} style={{ flex: `0 0 ${POSTER_W}px` }}>
                <Link
                  href={`/movie/${m.id}`}
                  onClick={() => trackEvent('similar movie selected', {
                    movie_id: movie.id, movie_title: movie.title, target_movie_id: m.id, target_movie_title: m.title, reason: m.reason,
                  })}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', textDecoration: 'none' }}
                >
                  <PosterThumb src={m.posterUrl ?? undefined} alt={`${m.title} 포스터`} width={POSTER_W} height={POSTER_H} lazy />
                  <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                    {m.reason === 'director' ? '같은 감독' : m.nation ?? '같은 국가'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
