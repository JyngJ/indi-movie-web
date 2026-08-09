'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react'
import type { EmblaOptionsType } from 'embla-carousel'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/components/primitives'

type EmblaApi = UseEmblaCarouselType[1]

interface CarouselContextValue {
  emblaRef: UseEmblaCarouselType[0]
  api: EmblaApi
  index: number
  snapCount: number
  canScrollPrev: boolean
  canScrollNext: boolean
  scrollPrev: () => void
  scrollNext: () => void
  scrollTo: (i: number) => void
}

const CarouselContext = createContext<CarouselContextValue | null>(null)

/** Carousel 내부에서 embla 상태(현재 인덱스·좌우 끝 도달)를 읽는다 */
export function useCarousel() {
  const ctx = useContext(CarouselContext)
  if (!ctx) throw new Error('Carousel 하위 컴포넌트는 <Carousel> 안에서만 사용할 수 있다')
  return ctx
}

export function Carousel({
  children,
  className,
  options,
  /** 외부에서 현재 인덱스를 알아야 할 때 */
  onIndexChange,
}: {
  children: ReactNode
  className?: string
  options?: EmblaOptionsType
  onIndexChange?: (index: number) => void
}) {
  const [emblaRef, api] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    ...options,
  })
  const [index, setIndex] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const sync = useCallback(
    (embla: NonNullable<EmblaApi>) => {
      const next = embla.selectedScrollSnap()
      setIndex(next)
      setCanScrollPrev(embla.canScrollPrev())
      setCanScrollNext(embla.canScrollNext())
      onIndexChange?.(next)
    },
    [onIndexChange],
  )

  useEffect(() => {
    if (!api) return
    setSnapCount(api.scrollSnapList().length)
    sync(api)
    api.on('select', sync).on('reInit', (embla) => {
      setSnapCount(embla.scrollSnapList().length)
      sync(embla)
    })
    return () => {
      api.off('select', sync)
    }
  }, [api, sync])

  const value = useMemo<CarouselContextValue>(
    () => ({
      emblaRef,
      api,
      index,
      snapCount,
      canScrollPrev,
      canScrollNext,
      scrollPrev: () => api?.scrollPrev(),
      scrollNext: () => api?.scrollNext(),
      scrollTo: (i: number) => api?.scrollTo(i),
    }),
    [emblaRef, api, index, snapCount, canScrollPrev, canScrollNext],
  )

  return (
    <CarouselContext.Provider value={value}>
      <div className={`relative ${className ?? ''}`} role="region" aria-roledescription="carousel">
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

export function CarouselContent({
  children,
  className,
  style,
  /** embla 뷰포트(overflow 컨테이너) — 마스크·여백을 여기에 건다 */
  viewportClassName,
  viewportStyle,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  viewportClassName?: string
  viewportStyle?: React.CSSProperties
}) {
  const { emblaRef } = useCarousel()
  return (
    <div ref={emblaRef} className={`overflow-hidden ${viewportClassName ?? ''}`} style={viewportStyle}>
      <div className={`flex ${className ?? ''}`} style={style}>{children}</div>
    </div>
  )
}

export function CarouselItem({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`min-w-0 shrink-0 grow-0 ${className ?? ''}`} style={style} role="group" aria-roledescription="slide">
      {children}
    </div>
  )
}

export function CarouselNavigation({
  className,
  classNameButton,
  /** 끝에 닿아도 버튼을 남길지 (기본은 비활성 처리 후 숨김) */
  alwaysShow = false,
}: {
  className?: string
  classNameButton?: string
  alwaysShow?: boolean
}) {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel()

  const stateStyle = (enabled: boolean): React.CSSProperties => ({
    backgroundColor: 'var(--color-surface-card)',
    boxShadow: 'var(--shadow-md)',
    opacity: enabled ? 1 : alwaysShow ? 0.4 : 0,
    visibility: !enabled && !alwaysShow ? 'hidden' : 'visible',
  })

  return (
    <div className={`pointer-events-none flex items-center gap-2 ${className ?? ''}`}>
      <IconButton
        aria-label="이전"
        shape="round"
        size={32}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        className={`pointer-events-auto ${classNameButton ?? ''}`}
        style={stateStyle(canScrollPrev)}
      >
        <ChevronLeft size={18} />
      </IconButton>
      <IconButton
        aria-label="다음"
        shape="round"
        size={32}
        onClick={scrollNext}
        disabled={!canScrollNext}
        className={`pointer-events-auto ${classNameButton ?? ''}`}
        style={stateStyle(canScrollNext)}
      >
        <ChevronRight size={18} />
      </IconButton>
    </div>
  )
}

export function CarouselIndicator({ className }: { className?: string }) {
  const { index, snapCount, scrollTo } = useCarousel()
  if (snapCount <= 1) return null

  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ''}`}>
      {Array.from({ length: snapCount }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i + 1}번째로 이동`}
          aria-current={i === index}
          onClick={() => scrollTo(i)}
          style={{
            width: i === index ? 16 : 6,
            height: 6,
            borderRadius: 'var(--radius-pill)',
            backgroundColor: i === index ? 'var(--color-primary-base)' : 'var(--color-border)',
            transition: 'var(--transition-fast)',
          }}
        />
      ))}
    </div>
  )
}
