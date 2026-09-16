'use client'

import { usePathname } from 'next/navigation'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useEffect, useRef, useState } from 'react'
import { GLOBAL_NAV_DESKTOP_WIDTH } from '@/components/navigation/GlobalNav'

/** 공통 레이아웃에서 이동 시작부터 목적지 경로 반영까지 표시한다. */
export function navStart() {
  window.dispatchEvent(new CustomEvent('yh:nav-start'))
}

export function RouteProgressBar() {
  const isDesktop = useIsDesktopLayout()
  const pathname = usePathname()
  const [progress, setProgress] = useState<number | null>(null)   // null = 숨김
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setProgress(null)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [pathname])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const onStart = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      clearTimeout(timeout)
      timeout = setTimeout(() => { setProgress(null); if (timerRef.current) clearInterval(timerRef.current) }, 15000)
      setProgress(12)
      // 좌→우로 채워지되 85%에서 대기 — 완료(목적지 경로 반영)와 함께 사라짐
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p == null) return p
          if (p >= 85) return p
          return p + Math.max(1, (85 - p) * 0.12)
        })
      }, 120)
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.download || (anchor.target && anchor.target !== '_self')) return
      const url = new URL(anchor.href)
      if (url.origin === location.origin && url.pathname !== location.pathname) onStart()
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('yh:nav-start', onStart)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('yh:nav-start', onStart)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (progress == null) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        right: 0,
        height: 3,
        backgroundColor: 'var(--color-neutral-300)',
        /* r16 코너 마스크(z 1100)보다 아래 — 위로 가면 패널 라운드 밖으로 삐져나옴 */
        zIndex: 'var(--z-route-progress)',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        width: `${progress}%`,
        height: '100%',
        backgroundColor: 'var(--color-neutral-800)',
        borderRadius: 'var(--radius-poster)',
        transition: 'width 160ms ease-out',
      }} />
    </div>
  )
}
