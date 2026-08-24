'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { PosterThumb } from '@/components/domain/PosterThumb'
import { normalizeTitle } from '@/lib/text/normalizeTitle'
import { withFlag } from '@/lib/nations'
import type { Movie } from '@/types/api'
import { BubbleTail, bubbleTailReach, GenreChip, PosterChip, SectionHeader, CardContainer, ScrollNavButton, Divider } from '@/components/primitives'
import type { SectionAnalytics } from '@/lib/curation/sectionRuns'
import { useSectionDwellTracking } from '@/hooks/useSectionDwellTracking'
import { Carousel, CarouselContent, CarouselItem, useCarousel, RevealItem, RevealGroup } from '@/components/motion'

interface CurationSectionRowProps {
  title: string
  emoji?: React.ReactNode
  description?: string
  movies: Movie[]
  isDesktop?: boolean
  /** movieId → 남은 일수 (0 = 오늘이 마지막) — 포스터 우상단 D-N 배지 */
  posterBadges?: Map<string, number>
  /** movieId → 카드 하단 서브텍스트 (예: "오늘 19:30 에무시네마") — 있으면 감독 대신 표시 */
  movieCaptions?: Map<string, string>
  /** true면 포스터 좌하단에 1-based 순위(배열 순서)를 얹는다 — 랭킹 섹션용 */
  showRank?: boolean
  /** movieId → 개봉 주년(10의 배수) — 포스터 좌상단 칩. 섹션 종류와 무관하게 붙는다 */
  posterAnniversaries?: Map<string, number>
  /** movieId → 하단 정보 전체 커스텀 (감독, 장르, 연도 등 기본 렌더를 완전히 덮어씀) */
  customBottomInfos?: Map<string, React.ReactNode>
  onMovieClick?: (movieId: string) => void
  /** true면 h2 제목/설명 영역을 렌더하지 않음 (AnniversarySection 등 외부 헤더 사용 시) */
  noHeader?: boolean
  /** compact: 외부 여백 없이 flex item으로 렌더 — 1~2편 섹션을 2열로 묶을 때 사용 */
  compact?: boolean
  id?: string
  /** dwell 이벤트에 함께 실을 섹션 메타 (position·run·section_title·movie_count 등).
   *  클릭 이벤트에도 같은 값이 실리도록 호출부에서 동일 객체를 쓴다 — 두 이벤트의 속성이
   *  어긋나면 PostHog에서 join이 안 된다 (예전엔 dwell과 click의 position이 실제로 달랐다). */
  analytics?: SectionAnalytics
}

const POSTER_SIZE = {
  mobile: { width: 120, height: 180 },
  desktop: { width: 210, height: 315 },
}

/* ── 포스터 하단 정보: 제목 / 감독 / 장르칩+연도 ───────────────── */
function MovieCardInfo({ movie, isDesktop, caption, customBottomInfo }: { movie: Movie; isDesktop: boolean; caption?: string; customBottomInfo?: React.ReactNode }) {
  const router = useRouter()
  const director = movie.director.length > 0 ? movie.director[0] : null
  /* 피그마 캡션(제목 14·보조 12)은 128 포스터 기준 — PC 210 포스터에선 한 단계 승격 */
  const fontSize = isDesktop ? 16 : 14

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 제목 */}
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color: 'var(--color-text-body)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.3,
        }}
      >
        {normalizeTitle(movie.title)}
      </span>

      {customBottomInfo ? (
        customBottomInfo
      ) : (
        <>
          {/* 서브텍스트(있으면) 또는 감독 — 감독은 통째 clickable → 감독 상세 */}
          <span
            className={!caption && director ? 'caption-link' : undefined}
            role={!caption && director ? 'button' : undefined}
            onClick={!caption && director ? (e) => { e.stopPropagation(); router.push(`/films/director/${encodeURIComponent(director)}`) } : undefined}
            style={{
              fontSize: isDesktop ? 'var(--text-body)' : 'var(--text-meta)',
              color: caption ? 'var(--color-text-body)' : 'var(--color-text-caption)',
              fontWeight: caption ? 600 : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              alignSelf: 'flex-start',
              maxWidth: '100%',
              minHeight: 'auto',
            }}
          >
            {caption ?? (director ?? '감독 미상')}
          </span>

          {/* 장르칩 + 연도 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexWrap: 'wrap' }}>
            {movie.genre.slice(0, 1).map((g) => (
              <GenreChip key={g}>{g}</GenreChip>
            ))}
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontWeight: 600 }}>
              {movie.year}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/* ── 호버 팝업 카드 ─────────────────────────────────────────────── */
/** 꼬리 세로 위치 — 카드 상단에서 이만큼. 포스터 상단 근처를 가리켜야 어느 포스터를
 *  가리키는지 헷갈리지 않는다(카드가 포스터보다 짧아 50%면 중앙이 어긋난다) */
const TAIL_TOP = 28

export function HoverPopup({ movie, x, y, posterWidth = 0 }: {
  movie: Movie
  /** 포스터의 시각적 오른쪽 끝 (hover scale 반영) */
  x: number
  y: number
  /** 왼쪽으로 뒤집힐 때 포스터 너비만큼 더 넘겨야 해서 필요 */
  posterWidth?: number
}) {
  const synopsis = movie.synopsis
    ? movie.synopsis.length > 90
      ? movie.synopsis.slice(0, 90) + '...'
      : movie.synopsis
    : null

  const tags = [
    ...movie.genre.slice(0, 2),
    ...(movie.nation ? [withFlag(movie.nation.split(/[,，/·]+/)[0].trim())] : []),
  ]

  const cardWidth = 220
  /* 꼬리 팁이 포스터 끝에 닿도록 꼬리 길이만큼 밀어 둔다 — x는 포스터의 시각적 가장자리다 */
  const reach = bubbleTailReach()
  /* 오른쪽에 자리가 없으면 포스터 왼쪽으로 넘긴다. 그때는 꼬리도 반대편으로.
     뷰포트 폭을 못 읽는 상황(SSR 직후 등)에선 뒤집지 않는다 — 0으로 읽혀 늘 뒤집히면
     멀쩡한 자리에서도 왼쪽으로 튄다 */
  const viewport = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : Infinity
  const flipped = x + reach + cardWidth > viewport - 16
  /* x는 hover로 1.1배 커진 포스터의 오른쪽 끝이라, 왼쪽 끝은 폭의 1.1배만큼 왼쪽이다 */
  const left = flipped ? x - posterWidth * 1.1 - reach - cardWidth : x + reach
  const border = '1px solid var(--color-border)'

  // position:fixed는 transform 있는 조상(도크 슬라이드 패널) 기준이 되어 잘리므로
  // body로 portal해 진짜 뷰포트 기준으로 띄운다
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: y,
        left,
        width: cardWidth,
        background: 'var(--color-surface-card)',
        border,
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.48)',
        zIndex: 999999,
        pointerEvents: 'none',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-2)',
      }}
    >
      {/* 꼬리 — 포스터 쪽을 가리킨다. 세로 위치는 포스터 상단에서 조금 내린 지점 */}
      <BubbleTail
        dir={flipped ? 'right' : 'left'}
        offset={TAIL_TOP}
        background="var(--color-surface-card)"
        border={border}
      />
      <span
        style={{
          fontSize: 'var(--text-subtitle)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {normalizeTitle(movie.title)}
      </span>

      {movie.director.length > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-text-caption)' }}>
          {movie.director[0]}
        </span>
      )}

      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 'var(--text-caption)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-body)',
                border: '1px solid var(--color-border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {synopsis && (
        <>
          <Divider />
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-text-caption)',
              lineHeight: 1.65,
            }}
          >
            {synopsis}
          </span>
        </>
      )}
    </div>,
    document.body,
  )
}

/* ── 개별 영화 카드 ─────────────────────────────────────────────── */
function MovieCard({
  movie,
  width,
  height,
  isDesktop,
  daysLeft,
  caption,
  customBottomInfo,
  onClick,
  rank,
  anniversaryAge,
  revealIndex,
}: {
  movie: Movie
  width: number
  height: number
  isDesktop: boolean
  daysLeft?: number
  caption?: string
  customBottomInfo?: React.ReactNode
  onClick?: () => void
  /** 1-based 순위 — 주면 포스터 좌하단에 스크림 + 큰 숫자를 얹는다 */
  rank?: number
  /** 개봉 주년(10의 배수) — 주면 포스터 좌상단에 칩 */
  anniversaryAge?: number
  /** 행 안에서의 순번 — 등장 모션 계단 간격용 */
  revealIndex: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [posterReady, setPosterReady] = useState(!movie.posterUrl)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hovered, setHovered] = useState(false)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)

  function onMouseEnter() {
    timerRef.current = setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect()
      if (rect) {
        setHovered(true)
        setPopupPos({ x: rect.right + width * 0.05, y: rect.top })
      }
    }, 400)
  }

  function onMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHovered(false)
    setPopupPos(null)
  }

  return (
    <>
      <RevealItem
        ref={cardRef}
        preset="slide"
        ready={posterReady}
        staggerIndex={revealIndex}
        onClick={onClick}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, width, flexShrink: 0, cursor: onClick ? 'pointer' : undefined }}
      >
        {/* 포스터: scale은 있으나 layout size 유지 → 부모 padding 안에서 visual overflow.
            호버 확대는 포스터 위에서만 — 캡션 호버로 커지면 오작동처럼 느껴짐 */}
        <div
          onMouseEnter={isDesktop ? onMouseEnter : undefined}
          onMouseLeave={isDesktop ? onMouseLeave : undefined}
          style={{
            transition: 'transform 130ms ease',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transformOrigin: 'center center',
            borderRadius: 'var(--radius-poster)',
            position: 'relative',
          }}
        >
          <PosterThumb src={movie.posterUrl} alt={movie.title} width={width} height={height} shadow={false} onReady={() => setPosterReady(true)} />

          {/* 순위 — 포스터 좌하단. 네 모서리 중 유일하게 비어 있는 자리라 기존 칩과 안 부딪힌다.
              스크림이 대비를 보장하므로 포스터 그림이 밝든 어둡든 숫자가 읽힌다
              (배경 바깥에 큰 숫자를 두는 방식은 포스터 시작선이 거터 24에서 밀려 못 쓴다). */}
          {rank != null && (
            <div
              aria-hidden
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                height: Math.round(height * 0.42),
                borderRadius: '0 0 var(--radius-poster) var(--radius-poster)',
                background: 'linear-gradient(to top, rgba(15,12,9,0.78), rgba(15,12,9,0))',
                pointerEvents: 'none',
              }}
            >
              <span style={{
                position: 'absolute', left: 8, bottom: 4,
                fontFamily: 'var(--font-display)',
                fontSize: Math.round(height * 0.31),
                fontWeight: 700,
                lineHeight: 0.85,
                color: 'var(--color-on-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {rank}
              </span>
            </div>
          )}
          {rank != null && <span className="sr-only">{rank}위</span>}

          {/* 개봉 주년 — 좌상단. films 탭 포스터에서 우상단은 D-N, 좌하단은 순위가 쓰므로
              남는 모서리가 여기다. 예전엔 "개봉 N주년, 다시 스크린에" 섹션을 통째로 차지했는데
              한 줄을 쓸 만한 정보가 아니라 칩으로 내렸다 — 대신 어느 섹션에 나오든 따라붙는다 */}
          {anniversaryAge != null && (
            <PosterChip corner="top-left" tone="primary" label={`개봉 ${anniversaryAge}주년`}>
              {anniversaryAge}주년
            </PosterChip>
          )}

          {daysLeft != null && (
            <PosterChip
              corner="top-right"
              tone={daysLeft === 0 ? 'error' : daysLeft === 1 ? 'warning' : 'neutral'}
            >
              {daysLeft === 0 ? '오늘' : `D-${daysLeft}`}
            </PosterChip>
          )}
        </div>

        <MovieCardInfo movie={movie} isDesktop={isDesktop} caption={caption} customBottomInfo={customBottomInfo} />
      </RevealItem>

      {popupPos && isDesktop && (
        <HoverPopup movie={movie} x={popupPos.x} y={popupPos.y} posterWidth={width} />
      )}
    </>
  )
}

/* ── 섹션 행 ────────────────────────────────────────────────────── */
export function CurationSectionRow({
  title,
  emoji,
  description,
  movies,
  isDesktop = false,
  posterBadges,
  movieCaptions,
  showRank = false,
  posterAnniversaries,
  customBottomInfos,
  onMovieClick,
  noHeader = false,
  compact = false,
  id,
  analytics,
}: CurationSectionRowProps) {
  const { width, height } = isDesktop ? POSTER_SIZE.desktop : POSTER_SIZE.mobile
  const scaleBleed = Math.ceil(height * 0.04)
  const gap = isDesktop ? 16 : 10

  const sectionRef = useRef<HTMLElement | null>(null)
  const setSectionRef = (node: HTMLElement | null) => { sectionRef.current = node }
  useSectionDwellTracking(sectionRef, id, analytics)

  if (movies.length === 0) return null

  // compact 모드: flex item으로 렌더, 1~2편 inline 표시 (스크롤 없음)
  if (compact) {
    const AWARD_DECO: Record<string, string> = {
      festival_venice_lion: '/awards/venice-lion.svg',
      festival_cannes_palme: '/awards/cannes-palm.svg',
    }
    const decoSrc = id ? AWARD_DECO[id] : undefined
    return (
      <div ref={setSectionRef} style={{ flex: 1, minWidth: 0, display: 'flex' }}>
      <CardContainer style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
        {/* 수상 문양 워터마크 — 종이에 찍힌 도장 (저대비·회전·우측 블리드) */}
        {decoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={decoSrc} alt="영화제 수상 문양" aria-hidden
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            style={{
              position: 'absolute', right: '-16%', top: '64%',
              height: '150%', transform: 'translateY(-50%) rotate(-10deg)',
              opacity: 0.07, pointerEvents: 'none',
            }} />
        )}
        {/* 헤더 */}
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
          <SectionHeader title={title} description={description} isDesktop={isDesktop} />
        </div>
        {/* 영화 세로 스택 — 피그마 TOBE 카드 문법 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 16px', background: 'var(--color-surface-card)', flex: 1 }}>
          {movies.slice(0, 2).map((movie) => (
            <div
              key={movie.id}
              onClick={onMovieClick ? () => onMovieClick(movie.id) : undefined}
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1, minWidth: 0, cursor: onMovieClick ? 'pointer' : undefined }}
            >
              <div style={{ flexShrink: 0 }}>
                <PosterThumb src={movie.posterUrl} alt={movie.title} width={108} height={162} shadow={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, justifyContent: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                  {normalizeTitle(movie.title)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {movie.director.length > 0 ? movie.director[0] : '감독 미상'}
                </span>
                <div style={{ display: 'flex', gap: 'var(--spacing-1)', alignItems: 'center' }}>
                  {movie.genre.slice(0, 1).map((g) => (
                    <GenreChip key={g}>{g}</GenreChip>
                  ))}
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', fontWeight: 600 }}>{movie.year}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContainer>
      </div>
    )
  }

  // 2.0: 헤더 우측 버튼 폐기 — 스크롤 행 hover 시 좌/우 가장자리 오버레이 (PC 전용)
  const posterMidY = scaleBleed + 8 + height / 2

  return (
    <section ref={setSectionRef} id={id} style={{ paddingTop: noHeader ? 0 : (isDesktop ? 48 : 32) }}>
      {!noHeader && (
        <div>
          <SectionHeader title={title} description={description} isDesktop={isDesktop} />
        </div>
      )}
      {/* 가로 스크롤은 embla(Carousel)가 담당 — 드래그 관성 + 스냅.
          기존 네이티브 overflow 스크롤 대비: 버튼 연타 시 거리 누적 문제가 사라진다(embla가 진행 중 요청을 흡수) */}
      <Carousel
        options={{
          align: 'start',
          containScroll: 'trimSnaps',
          dragFree: true,      /* 자유 드래그 — 포스터 행은 칸 단위 스냅보다 훑는 느낌이 맞다 */
          slidesToScroll: 3,   /* 화살표 1회 = 3편 (기존 scrollAmount와 동일) */
        }}
      >
        <CurationRowTrack
          movies={movies}
          width={width}
          height={height}
          gap={gap}
          scaleBleed={scaleBleed}
          isDesktop={isDesktop}
          posterMidY={posterMidY}
          posterBadges={posterBadges}
          movieCaptions={movieCaptions}
          showRank={showRank}
          posterAnniversaries={posterAnniversaries}
          customBottomInfos={customBottomInfos}
          onMovieClick={onMovieClick}
        />
      </Carousel>
    </section>
  )
}

/* ── 캐러셀 트랙 — embla 상태(끝 도달)를 읽어 가장자리 페이드·화살표를 그린다 ── */
function CurationRowTrack({
  movies, width, height, gap, scaleBleed, isDesktop, posterMidY,
  posterBadges, movieCaptions, showRank, posterAnniversaries, customBottomInfos, onMovieClick,
}: {
  movies: Movie[]
  width: number
  height: number
  gap: number
  scaleBleed: number
  isDesktop: boolean
  posterMidY: number
  posterBadges?: Map<string, number>
  movieCaptions?: Map<string, string>
  showRank?: boolean
  posterAnniversaries?: Map<string, number>
  customBottomInfos?: Map<string, React.ReactNode>
  onMovieClick?: (movieId: string) => void
}) {
  const { canScrollPrev, canScrollNext, scrollPrev, scrollNext } = useCarousel()
  const [rowHovered, setRowHovered] = useState(false)

  // PC: 더 스크롤할 방향만 가장자리 페이드 — 좁게(24px) 모서리만 눅임 (넓으면 캡션이 유령글자 됨)
  const rowMask = isDesktop
    ? `linear-gradient(90deg, ${canScrollPrev ? 'transparent 0, #000 24px' : '#000 0'}, ${canScrollNext ? '#000 calc(100% - 24px), transparent 100%' : '#000 100%'})`
    : undefined

  return (
    <div
      style={{ position: 'relative', overflowX: 'clip' }}   /* 음수 마진 행이 페이지 가로 스크롤 안 만들게 */
      onMouseEnter={isDesktop ? () => setRowHovered(true) : undefined}
      onMouseLeave={isDesktop ? () => setRowHovered(false) : undefined}
    >
      {/* 호버로 마운트/언마운트하면 커서가 버튼 위로 들어오는 순간 행을 벗어나 언마운트되거나
          클릭 직전에 사라져 첫 클릭이 통째로 증발한다(rage click 2위 원인).
          항상 마운트해두고 opacity/pointer-events로만 감춘다. */}
      {isDesktop && canScrollPrev && (
        <ScrollNavButton
          direction="left"
          style={{
            top: posterMidY, transform: 'translateY(-50%)', zIndex: 3,
            opacity: rowHovered ? 1 : 0,
            pointerEvents: rowHovered ? 'auto' : 'none',
            transition: 'opacity 140ms ease',
          }}
          onClick={scrollPrev}
        />
      )}
      {isDesktop && canScrollNext && (
        <ScrollNavButton
          direction="right"
          style={{
            top: posterMidY, transform: 'translateY(-50%)', zIndex: 3,
            opacity: rowHovered ? 1 : 0,
            pointerEvents: rowHovered ? 'auto' : 'none',
            transition: 'opacity 140ms ease',
          }}
          onClick={scrollNext}
        />
      )}
      <RevealGroup>
      <CarouselContent
        viewportStyle={{
          /* 호버 스케일 여유(scaleBleed)는 음수 마진으로 상쇄 — 포스터 시작선 = 거터 24 */
          padding: `${scaleBleed + 8}px calc(${scaleBleed}px + var(--gutter-sheet))`,
          margin: `0 ${-scaleBleed}px`,
          WebkitMaskImage: rowMask, maskImage: rowMask,
        }}
        style={{ gap }}
      >
        {movies.map((movie, i) => (
          <CarouselItem key={movie.id}>
            <MovieCard
              movie={movie}
              revealIndex={Math.min(i, 5)}
              width={width}
              height={height}
              isDesktop={isDesktop}
              daysLeft={posterBadges?.get(movie.id)}
              caption={movieCaptions?.get(movie.id)}
              rank={showRank ? i + 1 : undefined}
              anniversaryAge={posterAnniversaries?.get(movie.id)}
              customBottomInfo={customBottomInfos?.get(movie.id)}
              onClick={onMovieClick ? () => onMovieClick(movie.id) : undefined}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      </RevealGroup>
    </div>
  )
}
