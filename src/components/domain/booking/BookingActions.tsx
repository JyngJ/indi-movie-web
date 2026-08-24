'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { IconButton, Icon } from '@/components/primitives'
import { trackEvent } from '@/lib/analytics/client'

/**
 * 예매 CTA 통일 스펙 (2026-07 디자인 핸드오프).
 * "바"(BookingBar — 시트/상세 모바일/GV패널)와 "카드"(BookingCard — 데스크톱 사이드바/플로팅)
 * 두 변형만 존재한다. 화면마다 높이·radius·문구가 제각각이던 걸 이 컴포넌트로 고정한다.
 */
type Variant = 'bar' | 'card'

/* 높이는 Button 스케일(md 44 · lg 52) 위에만 둔다. 바와 카드 안에서 CTA와 아이콘 버튼이
   같은 높이를 쓰지 않으면 나란히 섰을 때 어긋나 보인다 — actionBtn이 선언만 되고
   쓰이지 않아 공유 버튼이 44로 남아 있던 게 그 사고다. */
const SPEC = {
  bar:  { height: 52, font: 16, radius: 12, gap: 8, extIcon: 18, actionBtn: 52, shareIcon: 20, closeIcon: 15 },
  card: { height: 44, font: 15, radius: 12, gap: 8, extIcon: 17, actionBtn: 44, shareIcon: 18, closeIcon: 13 },
} as const

/** 새 탭이 뜨기까지의 공백 동안 재클릭을 막는 시간 — 이 사이 연타가 중복 handoff의 원인이었다 */
const OPENING_MS = 2200

export function BookingCtaButton({
  variant, bookingUrl, onClick,
}: {
  variant: Variant
  bookingUrl?: string | null
  onClick?: () => void
}) {
  const s = SPEC[variant]

  /* idle → opening(새 탭 뜨는 중, 재클릭 차단) → returned(외부 사이트에서 복귀) */
  const [phase, setPhase] = useState<'idle' | 'opening' | 'returned'>('idle')
  const leftAtRef = useRef<number | null>(null)
  /* 탭이 실제로 가려진 적이 있어야 "다녀왔다"고 본다 — 링크가 안 열린 경우까지
     복귀로 세면 away_seconds가 오염된다 */
  const wentAwayRef = useRef(false)
  const openingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlRef = useRef(bookingUrl)
  urlRef.current = bookingUrl

  useEffect(() => () => {
    if (openingTimerRef.current) clearTimeout(openingTimerRef.current)
  }, [])

  // 예매 링크가 바뀌면(다른 상영 선택) 상태를 초기화한다
  useEffect(() => {
    setPhase('idle')
    leftAtRef.current = null
    wentAwayRef.current = false
  }, [bookingUrl])

  /* 외부 사이트에 다녀온 복귀를 감지한다. 지금까지는 아무 피드백이 없어
     "예매가 된 건가?" 하고 홈으로 나가거나 같은 영화를 처음부터 다시 탐색했다. */
  useEffect(() => {
    if (leftAtRef.current === null) return
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        wentAwayRef.current = true
        return
      }
      const leftAt = leftAtRef.current
      if (leftAt === null || !wentAwayRef.current) return
      wentAwayRef.current = false
      leftAtRef.current = null
      setPhase('returned')
      trackEvent('booking returned', {
        away_seconds: Math.round((Date.now() - leftAt) / 1000),
        booking_url_host: (() => {
          try { return new URL(urlRef.current ?? '').hostname } catch { return null }
        })(),
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [phase])

  const handleClick = useCallback(() => {
    onClick?.()
    leftAtRef.current = Date.now()
    setPhase('opening')
    if (openingTimerRef.current) clearTimeout(openingTimerRef.current)
    openingTimerRef.current = setTimeout(() => {
      setPhase((p) => (p === 'opening' ? 'idle' : p))
    }, OPENING_MS)
  }, [onClick])

  if (bookingUrl) {
    const label =
      phase === 'opening'  ? '예매 사이트 여는 중…'
      : phase === 'returned' ? '예매 사이트 다시 열기'
      : '예매하러 가기'

    return (
      <a
        data-rc="booking-cta"
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-busy={phase === 'opening'}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: s.gap,
          height: s.height, borderRadius: s.radius,
          backgroundColor: 'var(--color-primary-base)', color: 'var(--color-on-accent)',
          fontSize: s.font, fontWeight: 700, letterSpacing: '-0.2px', textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(74,99,128,0.27)',
          /* 여는 동안은 눌러도 소용없다 — 아예 못 누르게 막고 진행 중임을 보여준다 */
          pointerEvents: phase === 'opening' ? 'none' : 'auto',
          opacity: phase === 'opening' ? 0.72 : 1,
          transition: 'opacity 140ms ease',
        }}
      >
        {label}
        {phase === 'opening'
          ? <Icon name="loader-circle" size={s.extIcon} strokeWidth={2} className="booking-cta-spin" />
          : <Icon name="external-link" size={s.extIcon} strokeWidth={1.75} />}
      </a>
    )
  }

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: s.height, borderRadius: s.radius,
      backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-caption)',
      border: '1px solid var(--color-border)',
      fontSize: s.font, fontWeight: 700,
    }}>
      예매 링크 없음
    </div>
  )
}

export function ShareScheduleButton({ variant, onClick }: { variant: Variant; onClick: () => void }) {
  const s = SPEC[variant]
  return (
    <IconButton variant="overlay" size={s.actionBtn} onClick={onClick} aria-label="상영 시간표 공유" title="상영 시간표 공유">
      <Icon name="share-2" size={s.shareIcon} strokeWidth={1.75} />
    </IconButton>
  )
}

export function CloseRoundButton({ variant, onClick, label = '선택 해제' }: { variant: Variant; onClick: () => void; label?: string }) {
  const s = SPEC[variant]
  return (
    <IconButton variant="overlay" size={32} onClick={onClick} aria-label={label}>
      <Icon name="x" size={s.closeIcon} strokeWidth={1.75} />
    </IconButton>
  )
}
