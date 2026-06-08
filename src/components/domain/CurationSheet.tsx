'use client'

import { useEffect, useRef, useState } from 'react'
import { PosterThumb } from './PosterThumb'
import { Badge } from '@/components/primitives/Badge'
import type { HotIndieFilm, RecentlyViewedEntry, ReturningFilm } from '@/lib/curation/types'

/** 시트가 도달 가능한 3개 스냅 지점 — peek(최소) / default(진입 시 1/3) / expanded(최대) */
export type CurationSnap = 'peek' | 'default' | 'expanded'

/** expanded 상태에서 위로 남기는 여백 ≈ 검색바 + 필터칩 높이 (FilterBar를 가리지 않도록) */
const TOP_MARGIN = 132
/** peek 상태에서 보이는 높이 — 기존 COLLAPSED_HEIGHT(88)보다 살짝 크게 */
const PEEK_HEIGHT = 120
const VELOCITY_THRESHOLD = 500   // px/s 이상이면 flick으로 간주
const SNAP_ORDER: CurationSnap[] = ['expanded', 'default', 'peek']

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
}

interface CurationSheetProps {
  snap: CurationSnap
  /** 드래그 제스처로 스냅 지점이 바뀔 때 — 부모가 snap 상태를 갱신하고, 함께 보고된 visibleHeight로 FAB 위치를 맞춤 */
  onSnapChange: (snap: CurationSnap, visibleHeight: number) => void
  returningFilms: ReturningFilm[]
  hotIndieFilms: HotIndieFilm[]
  recentlyViewed: RecentlyViewedEntry[]
  onMovieSelect?: (movieId: string, title: string) => void
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
  if (items.length === 0) {
    return (
      <p style={{ margin: 0, paddingLeft: 20, paddingRight: 20, fontSize: 13, color: 'var(--color-text-caption)' }}>
        {emptyText}
      </p>
    )
  }
  const posterSize = desktop ? POSTER_SIZE_DESKTOP : POSTER_SIZE
  return (
    <div className={desktop ? undefined : 'themed-scrollbar'} style={desktop ? {
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
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.title}
          </span>
        </button>
      ))}
    </div>
  )
}

const SECTION_GAP = 22

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{
        margin: 0,
        paddingLeft: 20,
        paddingRight: 20,
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
      }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

interface CurationSectionsProps {
  returningFilms: ReturningFilm[]
  hotIndieFilms: HotIndieFilm[]
  recentlyViewed: RecentlyViewedEntry[]
  onMovieSelect?: (movieId: string, title: string) => void
  /** 데스크톱 도크에서 호출 시 true — 포스터 행을 가로 스크롤 대신 한 줄 3개 그리드로 표시 */
  desktop?: boolean
}

/** 큐레이션 섹션 3종(오랜만에 상영 / 핫한 독립영화 / 최근 찾아본) — 모바일 시트·데스크톱 도크가 공유하는 본문 */
export function CurationSections({ returningFilms, hotIndieFilms, recentlyViewed, onMovieSelect, desktop = false }: CurationSectionsProps) {
  const returningItems: CurationItem[] = returningFilms.map((film) => ({
    id: film.movie.id,
    title: film.movie.title,
    posterUrl: film.movie.posterUrl,
    badge: film.tagText,
  }))
  const hotIndieItems: CurationItem[] = hotIndieFilms.map((film) => ({
    id: film.movie.id,
    title: film.movie.title,
    posterUrl: film.movie.posterUrl,
    badge: film.soldOutTheaterCount > 0 ? `매진 ${film.soldOutTheaterCount}/${film.theaterCount}` : undefined,
  }))
  const recentItems: CurationItem[] = recentlyViewed.map((entry) => ({
    id: entry.id,
    title: entry.title,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SECTION_GAP }}>
      <Section title="오랜만에 상영하는 영화">
        <PosterRow items={returningItems} onSelect={onMovieSelect} emptyText="최근 다시 상영을 시작한 영화가 아직 없어요" desktop={desktop} />
      </Section>
      <Section title="이번주 가장 핫한 독립영화">
        <PosterRow items={hotIndieItems} onSelect={onMovieSelect} emptyText="이번주 매진 집계가 아직 모이지 않았어요" desktop={desktop} />
      </Section>
      <Section title="최근 찾아본">
        <PosterRow items={recentItems} emptyText="최근 찾아본 영화·영화관이 아직 없어요" desktop={desktop} />
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
  hotIndieFilms,
  recentlyViewed,
  onMovieSelect,
}: CurationSheetProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
  const defaultOffset  = Math.max(0, expandedHeight - viewportHeight / 3)
  const peekOffset     = Math.max(0, expandedHeight - PEEK_HEIGHT)
  const offsetFor = (s: CurationSnap): number =>
    s === 'expanded' ? 0 : s === 'default' ? defaultOffset : peekOffset

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

  /* ── 시트 영역 터치가 지도·페이지로 새지 않게 — 시트가 애매한(중간) 위치에 있을 때
   *  시트 바깥(스크롤 영역 제외)을 밀면 화면 전체가 같이 밀려 올라가는 현상 방지 ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: Event) => e.stopPropagation()
    const preventPageScroll = (e: TouchEvent) => {
      if (scrollAreaRef.current?.contains(e.target as Node)) return
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

  /* ── expanded 상태에서 본문 스크롤 최상단 + 아래로 드래그 → default(중간)로 한 단계 접기 ── */
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
      if (dy > 20) {                             // 20px 아래로 드래그 → 중간으로 한 단계 접기
        collapsing = true
        onSnapChange('default', expandedHeight - defaultOffset)
        e.preventDefault()
      }
    }
    el.addEventListener('touchstart', onDown, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove', onMove)
    }
  }, [snap, onSnapChange, expandedHeight, defaultOffset])

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button, a, input, select, textarea')) return
    // expanded 상태: 본문 스크롤 영역 터치는 네이티브 스크롤에 맡김
    if (snap === 'expanded') {
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

    // 이동 거리 8px 미만이면 tap으로 간주 — snap 없이 원위치
    if (Math.abs(e.clientY - dragStartY.current) < 8) {
      setDragOffset(0)
      velocityBuffer.current = []
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
        zIndex: 960,
        touchAction: snap === 'expanded' ? 'auto' : 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        paddingTop: 8,
        paddingBottom: 10,
        flexShrink: 0,
        pointerEvents: 'none',   // 컨테이너가 드래그 처리
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
      <div ref={scrollAreaRef} style={{ paddingTop: 4, paddingBottom: 24, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <CurationSections
          returningFilms={returningFilms}
          hotIndieFilms={hotIndieFilms}
          recentlyViewed={recentlyViewed}
          onMovieSelect={onMovieSelect}
        />
      </div>
    </div>
  )
}
