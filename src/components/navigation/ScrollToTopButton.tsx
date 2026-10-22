'use client'

import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import { FabRound, Icon } from '@/components/primitives'

/** 문서 대신 실제 소식 본문을 올린다. 모바일 페이지와 레일 팝오버가 공유한다. */
export function ScrollToTopButton({ targetRef, enabled, style }: {
  targetRef: RefObject<HTMLElement | null>
  enabled: boolean
  style?: CSSProperties
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const target = targetRef.current
    if (!enabled || !target) return
    const update = () => setScrolled(target.scrollTop > 0)
    update()
    target.addEventListener('scroll', update, { passive: true })
    return () => target.removeEventListener('scroll', update)
  }, [enabled, targetRef])

  if (!enabled || !scrolled) return null

  return (
    <FabRound
      aria-label="맨 위로"
      title="맨 위로"
      onClick={() => targetRef.current?.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })}
      style={{ position: 'absolute', right: 'var(--gutter)', bottom: 'var(--gutter)', zIndex: 'var(--z-navigation)', ...style }}
    >
      <Icon name="arrow-up" size={20} />
    </FabRound>
  )
}
