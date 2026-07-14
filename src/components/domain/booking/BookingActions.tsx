'use client'

import { ExternalLink, Share2, X } from 'lucide-react'

/**
 * 예매 CTA 통일 스펙 (2026-07 디자인 핸드오프).
 * "바"(BookingBar — 시트/상세 모바일/GV패널)와 "카드"(BookingCard — 데스크톱 사이드바/플로팅)
 * 두 변형만 존재한다. 화면마다 높이·radius·문구가 제각각이던 걸 이 컴포넌트로 고정한다.
 */
type Variant = 'bar' | 'card'

const SPEC = {
  bar:  { height: 52, font: 16, radius: 12, gap: 8, extIcon: 18, actionBtn: 52, shareIcon: 20, closeBtn: 30, closeIcon: 15 },
  card: { height: 48, font: 15, radius: 12, gap: 8, extIcon: 17, actionBtn: 48, shareIcon: 18, closeBtn: 22, closeIcon: 13 },
} as const

export function BookingCtaButton({
  variant, bookingUrl, onClick,
}: {
  variant: Variant
  bookingUrl?: string | null
  onClick?: () => void
}) {
  const s = SPEC[variant]

  if (bookingUrl) {
    return (
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: s.gap,
          height: s.height, borderRadius: s.radius,
          backgroundColor: 'var(--color-primary-base)', color: '#fff',
          fontSize: s.font, fontWeight: 700, letterSpacing: '-0.2px', textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(74,99,128,0.27)',
        }}
      >
        예매하러 가기
        <ExternalLink size={s.extIcon} strokeWidth={2} />
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
    <button
      type="button"
      onClick={onClick}
      aria-label="상영 시간표 공유"
      title="상영 시간표 공유"
      style={{
        flexShrink: 0, width: s.actionBtn, height: s.actionBtn, borderRadius: s.radius,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
        color: 'var(--color-text-sub)', cursor: 'pointer', padding: 0, minHeight: 'unset',
      }}
    >
      <Share2 size={s.shareIcon} strokeWidth={1.7} />
    </button>
  )
}

export function CloseRoundButton({ variant, onClick, label = '선택 해제' }: { variant: Variant; onClick: () => void; label?: string }) {
  const s = SPEC[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        flexShrink: 0, width: s.closeBtn, height: s.closeBtn, borderRadius: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-caption)',
        cursor: 'pointer', padding: 0, minHeight: 'unset',
      }}
    >
      <X size={s.closeIcon} strokeWidth={2.5} />
    </button>
  )
}
