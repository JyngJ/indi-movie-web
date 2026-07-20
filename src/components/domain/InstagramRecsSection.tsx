'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { SectionHeader, ScrollNavButton } from '@/components/primitives'
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

/** 상위 후보 몇 개 중에서 1개를 랜덤으로 골라 보여준다(매번 전부 노출하지 않음) */
const CANDIDATE_POOL = 3
const DESKTOP_CARD_HEIGHT = 260
/** 웹: 카드뉴스 이미지 자체는 이 폭 고정 — 카드가 넓어져도 사진은 안 커지고
    오른쪽 여백(포스터가 앉는 배경 영역)만 늘어난다 */
const DESKTOP_IMAGE_WIDTH = 480
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
  isDesktop,
  onClick,
  onPosterClick,
}: {
  rec: InstagramRecommendation
  activeMovieIds: ReadonlySet<string>
  today: string
  isDesktop: boolean
  onClick: () => void
  onPosterClick: (movieId: string) => void
}) {
  const activeNow = isInstagramRecActiveNow(rec, activeMovieIds, today)
  const moviesWithPoster = rec.movies.filter((m) => m.movie?.posterUrl)
  const posterStripRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollEdge() {
    const el = posterStripRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => {
    updateScrollEdge()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moviesWithPoster.length])

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

  function scrollPosters(dir: -1 | 1) {
    posterStripRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' })
  }

  // 웹: 카드뉴스 이미지는 고정 폭(DESKTOP_IMAGE_WIDTH)이라 카드가 넓어져도 사진 크기는
  // 그대로고, 그만큼 오른쪽 배경 여백만 늘어난다. 모바일: 기존처럼 카드 전체 폭에 걸쳐
  // mask로 페이드(뷰포트가 좁아 "남는 공간" 개념이 없음).
  const imageBoxStyle: React.CSSProperties = isDesktop
    ? { position: 'absolute', left: 0, top: 0, bottom: 0, width: DESKTOP_IMAGE_WIDTH }
    // 모바일: 카드 폭의 3/4만 채우고 나머지 1/4은 카드 배경(#000) 그대로 노출
    : { position: 'absolute', left: 0, top: 0, bottom: 0, width: '75%' }
  const imageMaskStyle: React.CSSProperties = isDesktop
    ? {
        WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 72%, transparent 100%)',
        maskImage: 'linear-gradient(90deg, #000 0%, #000 72%, transparent 100%)',
      }
    : {
        WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 60%, transparent 100%)',
        maskImage: 'linear-gradient(90deg, #000 0%, #000 60%, transparent 100%)',
      }

  // 모바일: 포스터 1개일 때도 여러 개일 때(strip 안 포스터)와 같은 top/bottom 12% 기준
  // 크기로 맞춤 — 이전엔 위/아래 값이 달라 1개/여러개일 때 포스터 크기가 서로 달랐음.
  const singlePosterStyle: React.CSSProperties = isDesktop
    ? { position: 'absolute', top: '50%', right: 28, transform: 'translateY(-50%)', height: '76%', aspectRatio: '2/3' }
    : { position: 'absolute', top: '12%', bottom: '12%', right: '4%', aspectRatio: '2/3' }

  const stripStyle: React.CSSProperties = isDesktop
    ? { position: 'absolute', top: '12%', bottom: '12%', left: DESKTOP_IMAGE_WIDTH + 24, right: 20 }
    // 포스터 2개 이상 보이려면 사진 페이드 구간(60~100%) 위로 겹쳐야 폭이 나옴 —
    // 페이드가 이미 투명해지는 구간이라 사진을 가리는 느낌 없이 자연스럽게 올라감.
    : { position: 'absolute', top: '12%', bottom: '12%', left: '52%', right: '4%' }

  // top/transform은 ScrollNavButton 기본값(50% 중앙정렬)을 그대로 씀 — 포스터 줄 자체가
  // 카드 세로 중앙에 대칭 배치(top/bottom 12%)라 카드 중앙 = 포스터 줄 중앙과 일치한다.
  const navButtonDarkStyle: React.CSSProperties = {
    backgroundColor: '#000', border: 'none', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  }
  const stripNavLeftStyle: React.CSSProperties = {
    ...navButtonDarkStyle,
    left: isDesktop ? DESKTOP_IMAGE_WIDTH + 24 : '52%',
  }
  const stripNavRightStyle: React.CSSProperties = {
    ...navButtonDarkStyle,
    right: isDesktop ? 20 : '4%',
  }

  // 포스터 줄 가장자리 페이드 — 더 스크롤할 방향에만 준다(첫/마지막 포스터는 딱 잘림 없이
  // 페이드도 없음, 안 그러면 "더 있다"는 착시가 생김)
  const stripMaskStops = [
    canScrollLeft ? 'transparent 0%, #000 8%' : '#000 0%',
    canScrollRight ? '#000 92%, transparent 100%' : '#000 100%',
  ]
  const stripMaskImage = `linear-gradient(90deg, ${stripMaskStops.join(', ')})`

  const festivalStyle: React.CSSProperties = isDesktop
    ? { position: 'absolute', top: '50%', right: 28, transform: 'translateY(-50%)', width: 320, aspectRatio: '21/4' }
    : { position: 'absolute', top: '50%', right: '6%', transform: 'translateY(-50%)', width: '38%', aspectRatio: '21/4' }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: 0, margin: 0, border: 'none',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative',
        // 웹: 세로 높이 고정, 가로만 컨테이너 폭에 맞춰 늘어남. 모바일: "사진이 너무 큼"은
        // 박스 크기가 아니라 cover 크롭이 과하게 확대돼 보이는 문제였음 — 박스를 덜 납작하게
        // (세로 여유를 더 줘서) 잘리는 비율을 줄이는 쪽으로 수정, 원래 2:1로 되돌림.
        ...(isDesktop ? { height: DESKTOP_CARD_HEIGHT } : { aspectRatio: '2/1' }),
        // 카드뉴스 원본이 흰/검 배경 섞여있어 var(--color-surface-card)(라이트/다크 테마 따라 바뀜)로
        // 두면 mask 페이드 경계에서 사진 자체 배경색과 안 맞아 이질감 생김 — 항상 검정 고정.
        backgroundColor: '#000',
        cursor: 'pointer', minHeight: 'auto',
      }}
      aria-label={title}
    >
      {/* 카드뉴스 이미지 — 오른쪽 끝에서 실제 투명해짐(색으로 덮는 게 아니라 mask).
          objectPosition을 아래쪽으로 당겨서 카드뉴스 하단 카피 문구까지 보이게 함 */}
      <div style={{ ...imageBoxStyle, ...imageMaskStyle }}>
        <Image src={rec.cardImageUrl} alt={title} fill sizes="(max-width: 1280px) 100vw, 480px" style={{ objectFit: 'cover', objectPosition: 'center 78%' }} />
      </div>

      {/* 드러난 오른쪽 영역 — 영화 포스터(1편이면 고정, 여러 편이면 좌우 스크롤)/영화제 배너.
          연결 끊겨 이미지가 하나도 없으면 생략 */}
      {rec.targetType === 'movie' && moviesWithPoster.length === 1 && (
        <div style={{ ...singlePosterStyle, borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
          <Image src={moviesWithPoster[0].movie!.posterUrl!} alt={title} fill sizes="200px" style={{ objectFit: 'cover' }} />
        </div>
      )}

      {rec.targetType === 'movie' && moviesWithPoster.length > 1 && (
        <>
          <div
            ref={posterStripRef}
            className="no-scrollbar"
            onClick={(e) => e.stopPropagation()}
            onScroll={updateScrollEdge}
            style={{
              ...stripStyle, display: 'flex', gap: 8, overflowX: 'auto',
              WebkitMaskImage: stripMaskImage, maskImage: stripMaskImage,
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
          {/* 좌우로 더 있다는 걸 알리는 넘김 버튼 — 다른 섹션(design.md)과 같은 ScrollNavButton,
              포스터 줄 세로 중앙. 그 방향으로 더 스크롤할 게 없으면 버튼 자체를 숨긴다 */}
          {canScrollLeft && (
            <ScrollNavButton
              direction="left"
              size={28}
              onClick={(e) => { e.stopPropagation(); scrollPosters(-1) }}
              style={stripNavLeftStyle}
            />
          )}
          {canScrollRight && (
            <ScrollNavButton
              direction="right"
              size={28}
              onClick={(e) => { e.stopPropagation(); scrollPosters(1) }}
              style={stripNavRightStyle}
            />
          )}
        </>
      )}

      {rec.targetType === 'festival' && festivalBannerUrl && (
        <div style={{ ...festivalStyle, borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
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

  const candidates = sortInstagramRecommendations(recommendations, activeMovieIds, today).slice(0, CANDIDATE_POOL)

  // 매번 후보 중 1개만 랜덤으로 보여준다. SSR엔 window/Math.random 결과가 클라이언트와
  // 어긋나면 하이드레이션 에러가 나므로(다른 곳의 isDesktop mounted 게이트와 동일 원리),
  // 마운트 후에만 뽑는다 — 그 전엔 섹션 자체를 안 그림.
  const [mounted, setMounted] = useState(false)
  const [pick, setPick] = useState<InstagramRecommendation | null>(null)
  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    if (!mounted || candidates.length === 0) { setPick(null); return }
    setPick(candidates[Math.floor(Math.random() * candidates.length)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, candidates.map((c) => c.id).join(',')])

  useSectionDwellTracking(sectionRef, pick ? 'instagram_recs' : undefined, position != null ? { position } : undefined)

  if (!mounted || !pick) return null

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
        trailing={
          // "더보기" 화살표가 아니라 우리 인스타 프로필로 나가는 외부 링크 — 이 섹션 자체가
          // 인스타 콘텐츠 소개라 "더 보려면 인스타로" 쪽이 맞음
          <button
            onClick={() => window.open(INSTAGRAM_PROFILE_URL, '_blank', 'noopener,noreferrer')}
            aria-label="인스타그램에서 더 보기"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, minHeight: 'auto', padding: 0,
              border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-caption)',
            }}
          >
            <ExternalLink size={16} strokeWidth={1.75} color="currentColor" />
          </button>
        }
      />
      <div style={{ padding: '12px 16px' }}>
        <InstagramRecCard
          rec={pick}
          activeMovieIds={activeMovieIds}
          today={today}
          isDesktop={isDesktop}
          onClick={() => handleClick(pick)}
          onPosterClick={(movieId) => handlePosterClick(pick, movieId)}
        />
      </div>
    </section>
  )
}
