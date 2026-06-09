'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { PosterThumb } from './PosterThumb'
import { Badge } from '@/components/primitives/Badge'
import type { NewIndieFilm, RecentlyViewedEntry, RecentlyViewedKind, ReturningFilm } from '@/lib/curation/types'

/** 시트가 도달 가능한 2개 스냅 지점 — peek(최소, 기본값) / expanded(최대) */
export type CurationSnap = 'peek' | 'expanded'

/** expanded 상태에서 위로 남기는 여백 ≈ 검색바 + 필터칩 높이 (FilterBar를 가리지 않도록) */
const TOP_MARGIN = 132
/** peek 상태에서 보이는 높이 — 시트 위 로고 워터마크 위치 계산에도 사용(MapView에서 export해서 참조) */
export const CURATION_PEEK_HEIGHT = 120
const VELOCITY_THRESHOLD = 500   // px/s 이상이면 flick으로 간주
const SNAP_ORDER: CurationSnap[] = ['expanded', 'peek']

const IconSparkle = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)

interface CurationItem {
  id: string
  title: string
  posterUrl?: string
  badge?: string
  subtitle?: string
}

interface CurationSheetProps {
  snap: CurationSnap
  /** 드래그 제스처로 스냅 지점이 바뀔 때 — 부모가 snap 상태를 갱신하고, 함께 보고된 visibleHeight로 FAB 위치를 맞춤 */
  onSnapChange: (snap: CurationSnap, visibleHeight: number) => void
  returningFilms: ReturningFilm[]
  newIndieFilms: NewIndieFilm[]
  recentlyViewed: RecentlyViewedEntry[]
  onMovieSelect?: (movieId: string, title: string) => void
  onRemoveRecentlyViewed?: (kind: RecentlyViewedKind, id: string) => void
}

/** 모바일: 가로 스크롤 행 / 데스크톱(도크): 한 줄 3개 고정 그리드 — 도크 폭(352, 좌우 패딩 20) 기준 칸당 96px */
const POSTER_SIZE = { width: 92, height: 138 }
const POSTER_SIZE_DESKTOP = { width: 96, height: 144 }

function PosterRow({ items, onSelect, emptyText, desktop = false }: {
  items: CurationItem[]
  onSelect?: (id: string, title: string) => void
  emptyText: string
  desktop?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (desktop) return
    const el = scrollRef.current
    if (!el) return

    let dirLock: 'h' | 'v' | null = null
    let startX = 0, startY = 0, startScrollLeft = 0
    let touching = false

    const onDown = (e: TouchEvent) => {
      touching = true
      dirLock = null
      startX = e.touches[0].pageX
      startY = e.touches[0].clientY
      startScrollLeft = el.scrollLeft
    }
    const onMove = (e: TouchEvent) => {
      if (!touching) return
      const dx = Math.abs(e.touches[0].pageX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (dirLock === null) {
        if (dx < 8 && dy < 8) return
        dirLock = dx > dy * 1.2 ? 'h' : 'v'
      }
      if (dirLock === 'v') { touching = false; return }
      e.preventDefault()
      e.stopPropagation()
      el.scrollLeft = startScrollLeft - (e.touches[0].pageX - startX)
    }
    const onUp = () => { touching = false; dirLock = null }

    el.addEventListener('touchstart', onDown, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onUp)
    el.addEventListener('touchcancel', onUp)
    return () => {
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onUp)
      el.removeEventListener('touchcancel', onUp)
    }
  }, [desktop])

  if (items.length === 0) {
    return (
      <p style={{ margin: 0, paddingLeft: 20, paddingRight: 20, fontSize: 13, color: 'var(--color-text-caption)' }}>
        {emptyText}
      </p>
    )
  }
  const posterSize = desktop ? POSTER_SIZE_DESKTOP : POSTER_SIZE
  return (
    <div ref={desktop ? undefined : scrollRef} className={desktop ? undefined : 'themed-scrollbar'} style={desktop ? {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
      paddingLeft: 20,
      paddingRight: 20,
    } : {
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 4,
    }}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect?.(item.id, item.title)}
          style={{
            flexShrink: desktop ? undefined : 0,
            width: desktop ? '100%' : posterSize.width,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            border: 'none',
            background: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: onSelect ? 'pointer' : 'default',
            minHeight: 'unset',
          }}
        >
          <div style={{ position: 'relative' }}>
            <PosterThumb src={item.posterUrl} alt={item.title} width={posterSize.width} height={posterSize.height} size="lg" />
            {item.badge && (
              <Badge
                variant="info"
                style={{
                  position: 'absolute',
                  left: 6,
                  bottom: 6,
                  backgroundColor: 'rgba(20,15,10,0.72)',
                  color: '#fff',
                  maxWidth: 'calc(100% - 12px)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {item.badge}
              </Badge>
            )}
          </div>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3,
          }}>
            {item.title}
          </span>
          {item.subtitle && (
            <span style={{
              fontSize: 11,
              color: 'var(--color-text-caption)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.subtitle}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

const SECTION_GAP = 16

function Section({ title, icon, withLine, style, children }: { title: string; icon?: string; withLine?: boolean; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 20, paddingRight: 20, gap: 6 }}>
        {icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
        <h3 style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          flexShrink: 0,
        }}>
          {title}
        </h3>
        {withLine && (
          <div style={{
            flex: 1,
            height: 1,
            backgroundColor: 'var(--color-border)',
            marginLeft: 4,
          }} />
        )}
      </div>
      {children}
    </section>
  )
}

const KIND_LABEL: Record<RecentlyViewedKind, string> = {
  movie: '영화',
  theater: '극장',
  director: '감독',
}

function RecentList({
  items,
  onRemove,
}: {
  items: RecentlyViewedEntry[]
  onRemove?: (kind: RecentlyViewedKind, id: string) => void
}) {
  const router = useRouter()

  function handleItemClick(item: RecentlyViewedEntry) {
    if (!item.kind) return
    if (item.kind === 'movie') router.push(`/movie/${item.id}`)
    else if (item.kind === 'theater') router.push(`/theater/${item.id}`)
    else if (item.kind === 'director') router.push(`/director/${encodeURIComponent(item.id)}`)
  }

  if (items.length === 0) {
    return (
      <p style={{ margin: 0, paddingLeft: 20, paddingRight: 20, fontSize: 13, color: 'var(--color-text-caption)' }}>
        최근 찾아본 영화·극장·감독이 아직 없어요
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 20, paddingRight: 20 }}>
      {items.map(item => (
        <div
          key={`${item.kind}-${item.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            backgroundColor: 'var(--color-surface-card)',
            borderRadius: 8,
            gap: 10,
          }}
        >
          <button
            onClick={() => handleItemClick(item)}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 8,
              border: 'none', background: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
            }}
          >
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.title}
            </span>
            {item.kind && (
              <span style={{ fontSize: 11, color: 'var(--color-text-caption)', flexShrink: 0 }}>
                {KIND_LABEL[item.kind]}
              </span>
            )}
          </button>
          {onRemove && item.kind && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.kind!, item.id) }}
              style={{
                flexShrink: 0,
                width: 20, height: 20,
                border: 'none', background: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-caption)',
                padding: 0,
                fontSize: 13,
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

interface CurationSectionsProps {
  returningFilms: ReturningFilm[]
  newIndieFilms: NewIndieFilm[]
  recentlyViewed: RecentlyViewedEntry[]
  onMovieSelect?: (movieId: string, title: string) => void
  onRemoveRecentlyViewed?: (kind: RecentlyViewedKind, id: string) => void
  /** 데스크톱 도크에서 호출 시 true — 포스터 행을 가로 스크롤 대신 한 줄 3개 그리드로 표시 */
  desktop?: boolean
}

function formatOpeningBadge(firstShowDate: string): string {
  const [, m, d] = firstShowDate.split('-')
  return `${Number(m)}/${Number(d)} 개봉`
}

/** 큐레이션 섹션 3종(오랜만에 상영 / 이번 주 새로 개봉 / 최근 찾아본) — 모바일 시트·데스크톱 도크가 공유하는 본문 */
export function CurationSections({ returningFilms, newIndieFilms, recentlyViewed, onMovieSelect, onRemoveRecentlyViewed, desktop = false }: CurationSectionsProps) {
  const returningItems: CurationItem[] = returningFilms.map((film) => ({
    id: film.movie.id,
    title: film.movie.title,
    posterUrl: film.movie.posterUrl,
    badge: film.tagText,
    subtitle: film.movie.director.join(', ') || undefined,
  }))
  const newIndieItems: CurationItem[] = newIndieFilms.map((film) => ({
    id: film.movie.id,
    title: film.movie.title,
    posterUrl: film.movie.posterUrl,
    badge: formatOpeningBadge(film.firstShowDate),
    subtitle: film.movie.director.join(', ') || undefined,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SECTION_GAP }}>
      {returningItems.length > 0 && (
        <Section title="오랜만에 상영하는 영화">
          <PosterRow items={returningItems} onSelect={onMovieSelect} emptyText="" desktop={desktop} />
        </Section>
      )}
      <Section title="이번 주 새로 개봉" icon="🎬" withLine>
        <PosterRow items={newIndieItems} onSelect={onMovieSelect} emptyText="이번 주 새로 개봉한 영화가 아직 없어요" desktop={desktop} />
      </Section>
      <Section title="최근 찾아본" icon="🔎" withLine style={{ marginTop: SECTION_GAP }}>
        <RecentList items={recentlyViewed} onRemove={onRemoveRecentlyViewed} />
      </Section>
    </div>
  )
}

/** 큐레이션 시트 — 모바일 전용 하단 시트. 핸들/본문을 드래그해 peek·default·expanded 3단 스냅 지점을 오감.
 *  데스크톱은 좌측 상시 도크에서 CurationSections를 직접 사용 */
export function CurationSheet({
  snap,
  onSnapChange,
  returningFilms,
  newIndieFilms,
  recentlyViewed,
  onMovieSelect,
  onRemoveRecentlyViewed,
}: CurationSheetProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const handleAreaRef = useRef<HTMLDivElement>(null)

  /* ── 뷰포트 높이 — 마운트 전엔 0이라 잘못된 값이 나와 마운트 후 직접 측정 ── */
  const [viewportHeight, setViewportHeight] = useState(900)
  useEffect(() => {
    setViewportHeight(window.innerHeight)
    const handleResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /* ── 스냅 지점별 translateY 오프셋 (0 = 완전 펼침) ── */
  const expandedHeight = Math.max(0, viewportHeight - TOP_MARGIN)
  const peekOffset     = Math.max(0, expandedHeight - CURATION_PEEK_HEIGHT)
  const offsetFor = (s: CurationSnap): number =>
    s === 'expanded' ? 0 : peekOffset

  const minOffset  = 0
  const maxOffset  = peekOffset
  const baseOffset = offsetFor(snap)

  /* ── 수직 드래그 (핸들 + 시트 전체가 대상) ── */
  const dragActive      = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartOffset = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging]     = useState(false)
  const velocityBuffer = useRef<Array<{ t: number; y: number }>>([])

  const effectiveOffset = Math.max(minOffset, Math.min(maxOffset, baseOffset + dragOffset))

  /* ── 부모(MapView)에 현재 스냅·보이는 높이 보고 — +/- · 현위치 FAB가 시트 위치를 따라가도록 ── */
  useEffect(() => {
    onSnapChange(snap, expandedHeight - offsetFor(snap))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedHeight, snap])

  /* ── 시트 영역 터치가 지도·페이지로 새지 않게 ──
   *  peek/default: 시트 어디를 잡아도 드래그(시트 이동)만 인식 — 본문(포스터 가로 스크롤 포함)이
   *  세로 제스처를 가로채 페이지 전체가 스크롤되는 현상을 막는다.
   *  expanded: 스크롤 영역 터치는 네이티브 스크롤에 맡기고, 그 외 영역만 차단 */
  const snapRef = useRef(snap)
  snapRef.current = snap
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: Event) => e.stopPropagation()
    const preventPageScroll = (e: TouchEvent) => {
      if (snapRef.current === 'expanded' && scrollAreaRef.current?.contains(e.target as Node)) return
      e.preventDefault()
    }
    el.addEventListener('wheel', stop, { passive: false })
    el.addEventListener('mousedown', stop)
    el.addEventListener('touchstart', stop, { passive: false })
    el.addEventListener('touchmove', preventPageScroll, { passive: false })
    return () => {
      el.removeEventListener('wheel', stop)
      el.removeEventListener('mousedown', stop)
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('touchmove', preventPageScroll)
    }
  }, [])

  /* ── expanded 상태에서 본문 스크롤 최상단 + 아래로 드래그 → peek(최소)로 접기 ── */
  useEffect(() => {
    if (snap !== 'expanded') return
    const el = scrollAreaRef.current
    if (!el) return
    let startY = 0
    let startScrollTop = 0
    let collapsing = false

    const onDown = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startScrollTop = el.scrollTop
      collapsing = false
    }
    const onMove = (e: TouchEvent) => {
      if (collapsing) { e.preventDefault(); return }
      if (startScrollTop > 2) return            // 스크롤 중이면 무시
      const dy = e.touches[0].clientY - startY
      if (dy > 20) {                             // 20px 아래로 드래그 → 최소로 접기
        collapsing = true
        onSnapChange('peek', expandedHeight - peekOffset)
        e.preventDefault()
      }
    }
    el.addEventListener('touchstart', onDown, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove', onMove)
    }
  }, [snap, onSnapChange, expandedHeight, peekOffset])

  const handlePointerDown = (e: React.PointerEvent) => {
    // expanded 상태에서만 버튼/링크/스크롤 영역을 드래그 대상에서 제외 — 본문 클릭·스크롤이 자연스럽게 동작하도록
    // peek/default: 포스터 카드 위에서 시작해도 드래그로 인식 (8px 미만 이동은 handlePointerUp에서 탭으로 처리되어 클릭은 그대로 동작)
    if (snap === 'expanded') {
      if ((e.target as Element).closest('button, a, input, select, textarea')) return
      const scrollEl = scrollAreaRef.current
      if (scrollEl?.contains(e.target as Element)) return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    dragActive.current      = true
    dragStartY.current      = e.clientY
    dragStartOffset.current = effectiveOffset
    velocityBuffer.current  = [{ t: e.timeStamp, y: e.clientY }]
    setDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    const delta    = e.clientY - dragStartY.current
    const newTrans = Math.max(minOffset, Math.min(maxOffset, dragStartOffset.current + delta))
    setDragOffset(newTrans - baseOffset)

    const buf = velocityBuffer.current
    buf.push({ t: e.timeStamp, y: e.clientY })
    if (buf.length > 5) buf.shift()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    dragActive.current = false
    setDragging(false)

    // 이동 거리 8px 미만이면 tap으로 간주
    if (Math.abs(e.clientY - dragStartY.current) < 8) {
      setDragOffset(0)
      velocityBuffer.current = []
      // peek 상태에서 핸들·타이틀 영역(상단부)을 탭하면 expanded까지 펼침
      const handleEl = handleAreaRef.current
      if (snap === 'peek' && handleEl) {
        const rect = handleEl.getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          onSnapChange('expanded', expandedHeight)
        }
      }
      return
    }

    // ── 속도 계산 (px/ms → px/s) ──
    const buf = velocityBuffer.current
    let velocityPxPerSec = 0
    if (buf.length >= 2) {
      const first = buf[0]
      const last  = buf[buf.length - 1]
      const dt    = last.t - first.t
      if (dt > 0) velocityPxPerSec = ((last.y - first.y) / dt) * 1000
    }

    // ── snap 판단: flick은 인접 단계로 한 칸, 그 외엔 가장 가까운 스냅 지점 ──
    const isFlickUp   = velocityPxPerSec < -VELOCITY_THRESHOLD   // 위로 flick → 펼치는 방향
    const isFlickDown = velocityPxPerSec >  VELOCITY_THRESHOLD   // 아래로 flick → 접는 방향
    const currentIndex = SNAP_ORDER.indexOf(snap)

    let targetIndex: number
    if (isFlickUp) {
      targetIndex = Math.max(0, currentIndex - 1)
    } else if (isFlickDown) {
      targetIndex = Math.min(SNAP_ORDER.length - 1, currentIndex + 1)
    } else {
      targetIndex = 0
      let nearestDist = Infinity
      SNAP_ORDER.forEach((s, i) => {
        const dist = Math.abs(effectiveOffset - offsetFor(s))
        if (dist < nearestDist) { nearestDist = dist; targetIndex = i }
      })
    }

    const nextSnap = SNAP_ORDER[targetIndex]
    setDragOffset(0)
    velocityBuffer.current = []
    if (nextSnap !== snap) onSnapChange(nextSnap, expandedHeight - offsetFor(nextSnap))
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: expandedHeight,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface-raised)',
        borderRadius: 'var(--comp-sheet-radius)',
        boxShadow: 'var(--shadow-sheet)',
        overflow: 'hidden',
        transform: `translateY(${effectiveOffset}px)`,
        transition: dragging ? 'none' : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
        // expanded일 때는 검색바·필터칩(지역 설정 팝업 포함, zIndex 1001)보다 위로 올라와 가려야 함 — 글로벌 탭바(1150)보다는 아래로 유지
        zIndex: snap === 'expanded' ? 1010 : 960,
        touchAction: snap === 'expanded' ? 'auto' : 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        ref={handleAreaRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          paddingTop: 8,
          paddingBottom: 10,
          flexShrink: 0,
          pointerEvents: 'none',   // 컨테이너가 드래그·탭 처리 (handlePointerUp에서 영역 판정)
        }}>
        <div style={{
          width: 'var(--comp-sheet-handle-width)',
          height: 'var(--comp-sheet-handle-height)',
          borderRadius: 'var(--comp-sheet-handle-radius)',
          backgroundColor: 'var(--color-border)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-primary)' }}>
          <span style={{ color: 'var(--color-primary-base)', display: 'flex' }}><IconSparkle /></span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>큐레이션</span>
        </div>
      </div>
      <div ref={scrollAreaRef} style={{
        paddingTop: 4,
        // 하단 글로벌 탭바(고정, 시트보다 위 z-index)에 본문 끝부분이 가려지지 않도록 그 높이만큼 여백 확보
        paddingBottom: `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + 24px)`,
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}>
        <CurationSections
          returningFilms={returningFilms}
          newIndieFilms={newIndieFilms}
          recentlyViewed={recentlyViewed}
          onMovieSelect={onMovieSelect}
          onRemoveRecentlyViewed={onRemoveRecentlyViewed}
        />
      </div>
    </div>
  )
}
