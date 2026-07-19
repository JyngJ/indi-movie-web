'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { SectionHeader } from '@/components/primitives'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { trackEvent } from '@/lib/analytics/client'
import { getFestivalDateLabel, getFestivalStatus } from '@/lib/festival/status'
import { isInstagramRecActiveNow, sortInstagramRecommendations } from '@/lib/curation/sortInstagramRecommendations'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import type { InstagramRecommendation } from '@/types/instagramRecommendation'

interface Props {
  recommendations: InstagramRecommendation[]
  activeMovieIds: ReadonlySet<string>
  today: string
  isDesktop: boolean
  /** run1/run2 배열 내 논리적 순번 — CurationSectionRow의 다른 섹션과 같은 계측 규칙 */
  position?: number
  onMovieClick: (movieId: string) => void
  onFestivalClick: (slug: string) => void
}

const MAX_VISIBLE = 3
/** DB(instagram_url)에 링크가 없으면 게시물 대신 프로필로 보낸다 */
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/indi.movie.map/'

/* ── 카드 하나 ──────────────────────────────────────────────────
   왼쪽엔 카드뉴스 이미지(완성본, 텍스트 포함) 그대로, 오른쪽으로 갈수록
   mask-image로 실제 투명해져 카드 배경(--color-surface-card, 테마별 흰/검)이
   드러난다. 그 드러난 영역에 포스터(영화)/배너(영화제)를 올린다.
   영화 여러 편이면 좌우로 스크롤되는 포스터 줄로 보여주고, 포스터 각각을
   눌러 바로 그 영화 상세로 갈 수 있다(카드 전체 클릭과는 별개 타깃). ── */
function InstagramRecCard({
  rec,
  activeMovieIds,
  today,
  onClick,
  onPosterClick,
}: {
  rec: InstagramRecommendation
  activeMovieIds: ReadonlySet<string>
  today: string
  onClick: () => void
  onPosterClick: (movieId: string) => void
}) {
  const activeNow = isInstagramRecActiveNow(rec, activeMovieIds, today)
  const moviesWithPoster = rec.movies.filter((m) => m.movie?.posterUrl)

  let badge: { text: string; tone: 'active' | 'neutral' } = { text: '인스타에서 보기', tone: 'neutral' }
  let festivalBannerUrl: string | undefined

  if (rec.targetType === 'movie' && moviesWithPoster.length > 0) {
    if (activeNow) badge = { text: '상영 중', tone: 'active' }
  } else if (rec.targetType === 'festival' && rec.festival) {
    festivalBannerUrl = rec.festival.bannerUrl ?? undefined
    if (activeNow) {
      const status = getFestivalStatus(rec.festival.startDate, rec.festival.endDate, today)
      badge = { text: status === 'ongoing' ? '진행 중' : getFestivalDateLabel(status, rec.festival.startDate, rec.festival.endDate, today), tone: 'active' }
    }
  }

  const title = normalizeTitle(rec.festival?.name ?? rec.titleSnapshot)

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: 0, margin: 0, border: 'none',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative',
        aspectRatio: '2/1', backgroundColor: 'var(--color-surface-card)',
        cursor: 'pointer', minHeight: 'auto',
      }}
      aria-label={title}
    >
      {/* 카드뉴스 이미지 — 오른쪽으로 실제 투명해짐(색으로 덮는 게 아니라 mask) */}
      <div
        style={{
          position: 'absolute', inset: 0,
          WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 45%, transparent 78%)',
          maskImage: 'linear-gradient(90deg, #000 0%, #000 45%, transparent 78%)',
        }}
      >
        <Image src={rec.cardImageUrl} alt={title} fill sizes="(max-width: 1280px) 100vw, 600px" style={{ objectFit: 'cover' }} />
      </div>

      {/* 드러난 오른쪽 영역 — 영화 포스터(1편이면 고정, 여러 편이면 좌우 스크롤)/영화제 배너.
          연결 끊겨 이미지가 하나도 없으면 생략 */}
      {rec.targetType === 'movie' && moviesWithPoster.length === 1 && (
        <div style={{
          position: 'absolute', top: '50%', right: '6%', transform: 'translateY(-50%)',
          width: '20%', aspectRatio: '2/3',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        }}>
          <Image src={moviesWithPoster[0].movie!.posterUrl!} alt={title} fill sizes="200px" style={{ objectFit: 'cover' }} />
        </div>
      )}

      {rec.targetType === 'movie' && moviesWithPoster.length > 1 && (
        <div
          className="no-scrollbar"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '12%', bottom: '12%', left: '46%', right: '4%',
            display: 'flex', gap: 8, overflowX: 'auto',
          }}
        >
          {moviesWithPoster.map((m) => (
            <div
              key={m.id}
              onClick={m.movieId ? () => onPosterClick(m.movieId!) : undefined}
              style={{
                position: 'relative', height: '100%', aspectRatio: '2/3', flexShrink: 0,
                borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                cursor: m.movieId ? 'pointer' : 'default',
              }}
            >
              <Image src={m.movie!.posterUrl!} alt={normalizeTitle(m.movie!.title)} fill sizes="120px" style={{ objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {rec.targetType === 'festival' && festivalBannerUrl && (
        <div style={{
          position: 'absolute', top: '50%', right: '6%', transform: 'translateY(-50%)',
          width: '38%', aspectRatio: '21/4',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        }}>
          <Image src={festivalBannerUrl} alt={title} fill sizes="200px" style={{ objectFit: 'cover' }} />
        </div>
      )}

      {/* 상태 뱃지 */}
      <div
        style={{
          position: 'absolute', bottom: 10, right: 10, padding: '4px 10px', borderRadius: 99,
          fontSize: 11, fontWeight: 700,
          backgroundColor: badge.tone === 'active' ? 'var(--color-success)' : 'rgba(0,0,0,0.55)',
          color: '#fff',
        }}
      >
        {badge.text}
      </div>
    </button>
  )
}

/* ── 섹션 ─────────────────────────────────────────────────────── */
export function InstagramRecsSection({
  recommendations,
  activeMovieIds,
  today,
  isDesktop,
  position,
  onMovieClick,
  onFestivalClick,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null)
  useSectionDwellTracking(sectionRef, recommendations.length > 0 ? 'instagram_recs' : undefined, position != null ? { position } : undefined)

  if (recommendations.length === 0) return null

  const sorted = sortInstagramRecommendations(recommendations, activeMovieIds, today).slice(0, MAX_VISIBLE)

  function handleClick(rec: InstagramRecommendation) {
    const linkedMovieIds = rec.movies.map((m) => m.movieId).filter((id): id is string => !!id)

    trackEvent('curation movie selected', {
      list_id: 'instagram_recs',
      source: 'films_tab',
      target_type: rec.targetType,
      movie_ids: linkedMovieIds.join(','),
      movie_count: linkedMovieIds.length,
      festival_id: rec.festivalId ?? undefined,
      is_active_now: isInstagramRecActiveNow(rec, activeMovieIds, today),
      ...(position != null ? { position } : {}),
    })

    // 영화 1편만 연결돼 있으면 그 영화 상세로, 여러 편이면(개별 상세 하나로 대표할 수 없음)
    // 원본 게시물로. 영화제는 상세로. 링크가 DB에 없으면 게시물 대신 프로필로 보낸다.
    if (rec.targetType === 'movie' && rec.movies.length === 1 && rec.movies[0].movieId) {
      onMovieClick(rec.movies[0].movieId)
      return
    }
    if (rec.targetType === 'festival' && rec.festival) {
      onFestivalClick(rec.festival.slug)
      return
    }
    window.open(rec.instagramUrl ?? INSTAGRAM_PROFILE_URL, '_blank', 'noopener,noreferrer')
  }

  // 여러 편 카드에서 포스터 하나를 콕 집어 눌렀을 때 — 카드 전체 클릭(handleClick)과는
  // 별도 타깃이라 계측도 따로(어떤 편이 눌렸는지 movie_ids가 1개짜리로 남는다)
  function handlePosterClick(rec: InstagramRecommendation, movieId: string) {
    trackEvent('curation movie selected', {
      list_id: 'instagram_recs',
      source: 'films_tab',
      target_type: rec.targetType,
      movie_ids: movieId,
      movie_count: 1,
      is_active_now: activeMovieIds.has(movieId),
      ...(position != null ? { position } : {}),
    })
    onMovieClick(movieId)
  }

  return (
    <section ref={sectionRef} style={{ paddingTop: isDesktop ? 48 : 32 }}>
      <SectionHeader
        title="인스타그램에서 추천한 그 영화"
        isDesktop={isDesktop}
        trailing={<ChevronRight size={18} strokeWidth={1.75} color="var(--color-text-caption)" />}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
        {sorted.map((rec) => (
          <InstagramRecCard
            key={rec.id}
            rec={rec}
            activeMovieIds={activeMovieIds}
            today={today}
            onClick={() => handleClick(rec)}
            onPosterClick={(movieId) => handlePosterClick(rec, movieId)}
          />
        ))}
      </div>
    </section>
  )
}
