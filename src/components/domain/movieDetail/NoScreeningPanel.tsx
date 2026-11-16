'use client'

import Link from 'next/link'
import { CardContainer, EmptyState } from '@/components/primitives'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { FavoriteActionRow } from '@/components/domain/favorites/FavoriteActionRow'
import { trackEvent } from '@/lib/analytics/client'
import { similarReasonLabel, type SimilarPick } from '@/lib/catalog/similarNowShowing'
import type { PastScreeningView } from '@/lib/catalog/pastScreenings'

const POSTER_W = 104
const POSTER_H = 156

/**
 * 예정된 상영이 없는 영화의 상영 영역 (2026-10).
 * 예전엔 빈 날짜 탭 + "이 날 상영 정보가 없어요"만 남아, 검색으로 들어온 사람이 할 일이 없었다.
 *  1) 관심 영화로 넣으면 다시 상영할 때 알림(new_screening 규칙 — src/lib/notifications/rules.ts)
 *  2) 지난 상영 — 어느 극장에서 언제 상영했는지(screening_days, 2026-11). 이 사이트에만 있는 본문이라
 *     색인을 다시 여는 근거다(indexPolicy). 극장 이름은 극장 상세로 이어 검색 로봇이 따라가게 한다.
 *  3) 지금 상영 중인 영화 중 감독이 같거나 장르가 겹치는 것(pickSimilarNowShowing). 고를 게 없으면 칸을 비운다.
 * 목록은 서버가 골라 넘긴다 — HTML에 링크가 실려야 검색 로봇이 따라간다.
 */
export function NoScreeningPanel({
  movie, similar, past = null, isDesktop,
}: {
  movie: { id: string; title: string }
  similar: SimilarPick[]
  past?: PastScreeningView | null
  isDesktop: boolean
}) {
  const gutter = isDesktop ? 0 : 'var(--gutter)'
  return (
    <div style={{ padding: `0 ${isDesktop ? '0' : 'var(--gutter)'}` }}>
      {/* 알림 안내는 카드로 묶어 위 섹션 제목·아래 비슷한 영화와 떼어 보이게 한다 */}
      <CardContainer style={{ marginTop: 'var(--spacing-4)' }}>
        <EmptyState
          variant="block"
          paddingY={24}
          message="지금은 예정된 상영이 없어요"
          description="관심 영화에 넣어 두면 다시 상영할 때 소식에서 알려 드려요"
          action={<FavoriteActionRow type="movie" id={movie.id} label={movie.title} style={{ width: 280, maxWidth: '100%' }} />}
        />
      </CardContainer>

      {past && (
        <section aria-labelledby="past-screenings" style={{ marginTop: 'var(--spacing-8)' }}>
          <h2 id="past-screenings" style={{ margin: `0 0 var(--spacing-2)`, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            지난 상영
          </h2>
          <p style={{ margin: 0, fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', lineHeight: 1.5, wordBreak: 'keep-all' }}>
            {past.sentence}
          </p>
          <ul style={{ listStyle: 'none', margin: 'var(--spacing-3) 0 0', padding: 0 }}>
            {past.theaters.map((t, i) => (
              <li key={t.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                <Link
                  href={`/films/theater/${t.id}`}
                  onClick={() => trackEvent('past screening theater selected', {
                    movie_id: movie.id, movie_title: movie.title, theater_id: t.id, theater_name: t.name,
                  })}
                  style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--spacing-3)', padding: 'var(--spacing-3) 0', textDecoration: 'none' }}
                >
                  <span style={{ minWidth: 0, fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {t.name}
                    <span style={{ marginLeft: 'var(--spacing-2)', fontSize: 'var(--text-meta)', fontWeight: 400, color: 'var(--color-text-caption)' }}>{t.region}</span>
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontVariantNumeric: 'tabular-nums' }}>
                    {t.period}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {past.moreCount > 0 && (
            <p style={{ margin: 'var(--spacing-1) 0 0', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
              외 {past.moreCount}곳
            </p>
          )}
        </section>
      )}

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
                    movie_id: movie.id, movie_title: movie.title, target_movie_id: m.id, target_movie_title: m.title, reason: m.reason.kind,
                  })}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', textDecoration: 'none' }}
                >
                  <PosterThumb src={m.posterUrl ?? undefined} alt={`${m.title} 포스터`} width={POSTER_W} height={POSTER_H} lazy />
                  <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                    {similarReasonLabel(m.reason)}
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
