'use client'

import { useEffect, useRef, useState } from 'react'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'

/** 라우트 전환 진행 표시 — navStart() 호출로 시작.
 *  피그마 확정: 3px, 트랙 neutral/300 · 바 neutral/800, 프로그레스바 방식(좌→우 채움).
 *  실제 완료 시점은 목적지 페이지 렌더 = 이 컴포넌트 언마운트라, 그때까지 85%에서 대기. */
export function navStart() {
  window.dispatchEvent(new CustomEvent('yh:nav-start'))
}

export function RouteProgressBar({ isDesktop }: { isDesktop: boolean }) {
  const [progress, setProgress] = useState<number | null>(null)   // null = 숨김
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const onStart = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      setProgress(12)
      // 좌→우로 채워지되 85%에서 대기 — 완료(새 화면 렌더)와 함께 사라짐
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p == null) return p
          if (p >= 85) return p
          return p + Math.max(1, (85 - p) * 0.12)
        })
      }, 120)
    }
    window.addEventListener('yh:nav-start', onStart)
    return () => {
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
        // 모바일: 바텀 탭바 바로 위에 밀착 / 웹: 본문(레일 제외) 상단
        ...(isDesktop
          ? { top: 0 }
          : { bottom: `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))` }),
        left: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        right: 0,
        height: 3,
        backgroundColor: 'var(--color-neutral-300)',
        /* r16 코너 마스크(z 1100)보다 아래 — 위로 가면 패널 라운드 밖으로 삐져나옴 */
        zIndex: 1050,
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
