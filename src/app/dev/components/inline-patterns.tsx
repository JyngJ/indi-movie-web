/**
 * 갤러리 전용 — 프로덕션에 인라인으로 구현된 패턴을 스펙대로 재현한 샘플.
 * 프로덕션 코드는 수정하지 않고, 원본 파일을 캡션으로 표기한다.
 */
'use client'

import React from 'react'
import { PosterThumb } from '@/components/domain'
import { captionStyle } from './gallery-shared'

/* ── 포스터 오버레이 칩 정책: 11px/600 · 4px 8px · --radius-badge · offset 6px ── */

const overlayChipBase: React.CSSProperties = {
  position: 'absolute',
  padding: '4px 8px',
  borderRadius: 'var(--radius-badge)',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  color: 'var(--color-on-accent)',
}

function DDayChip({ daysLeft }: { daysLeft: number }) {
  return (
    <span style={{
      ...overlayChipBase,
      top: 6, right: 6,
      backgroundColor: daysLeft === 0 ? 'var(--color-error)' : daysLeft === 1 ? 'var(--color-warning)' : '#78716C',
      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
    }}>
      {daysLeft === 0 ? '오늘' : `D-${daysLeft}`}
    </span>
  )
}

function DistanceChip({ label }: { label: string }) {
  return (
    <span style={{
      ...overlayChipBase,
      top: 6, right: 6,
      backgroundColor: 'var(--color-primary-base)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    }}>
      {label}
    </span>
  )
}

function ScrimBadge({ label }: { label: string }) {
  return (
    <span style={{
      ...overlayChipBase,
      left: 6, bottom: 6,
      backgroundColor: 'rgba(20,15,10,0.72)',
      maxWidth: 'calc(100% - 12px)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'block',
    }}>
      {label}
    </span>
  )
}

export function PosterOverlayChips() {
  const posters: { caption: string; chip: React.ReactNode }[] = [
    { caption: '오늘 (error)',   chip: <DDayChip daysLeft={0} /> },
    { caption: 'D-1 (warning)',  chip: <DDayChip daysLeft={1} /> },
    { caption: 'D-5 (#78716C)',  chip: <DDayChip daysLeft={5} /> },
    { caption: '거리 (primary)', chip: <DistanceChip label="1.2km" /> },
    { caption: '정보 배지 (scrim)', chip: <ScrimBadge label="오늘 19:30" /> },
  ]
  return (
    <div className="flex gap-4 flex-wrap">
      {posters.map((p) => (
        <div key={p.caption} className="flex flex-col items-center gap-2">
          <div style={{ position: 'relative' }}>
            <PosterThumb width={90} height={135} alt="파과" />
            {p.chip}
          </div>
          <span style={{ ...captionStyle, textTransform: 'none' }}>{p.caption}</span>
        </div>
      ))}
    </div>
  )
}

/* ── TheaterSheet actionBtn — 길찾기/공유/인스타그램 pill ─────────── */

const actionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  minHeight: 30,
  padding: '0 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-surface-card)',
  color: 'var(--color-text-body)',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  flex: '0 0 36px',
  width: 36, height: 36,
  padding: 0,
  boxSizing: 'border-box',
  border: 'none',
  background: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-body)',
  minHeight: 'unset',
}

const IcoPin = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
  </svg>
)
const IcoShare = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
  </svg>
)
const IcoX = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export function ActionBtnRow() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button type="button" style={actionBtn}><IcoPin /> 길찾기</button>
      <button type="button" style={actionBtn}><IcoShare /> 공유</button>
      <button type="button" style={actionBtn}>인스타그램</button>
      <span style={captionStyle}>iconBtn 36px →</span>
      <button type="button" style={iconBtn} aria-label="닫기"><IcoX /></button>
    </div>
  )
}

/* ── CurationSheet 더보기/모두보기 버튼 ───────────────────────────── */

const moreBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-1)',
  padding: '8px 0', border: 'none', borderRadius: 'var(--radius-button)',
  background: 'var(--color-surface-bg)', color: 'var(--color-text-caption)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  minHeight: 'unset',
}

const IcoChevronDown = ({ up = false }: { up?: boolean }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: up ? 'rotate(180deg)' : 'none' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export function MoreButtonRow() {
  return (
    <div className="flex flex-col gap-2" style={{ maxWidth: 360 }}>
      <button type="button" style={moreBtn}>더보기 <IcoChevronDown /></button>
      <div className="flex gap-2">
        <button type="button" style={{ ...moreBtn, flex: 1 }}>접기 <IcoChevronDown up /></button>
        <span style={{
          ...moreBtn, flex: 1, textDecoration: 'none',
          background: 'var(--color-primary-subtle-l)', color: 'var(--filter-chip-value)',
        }}>모두보기 →</span>
      </div>
    </div>
  )
}

/* ── hover-lift (globals.css 전역 클래스) ─────────────────────────── */

export function HoverLiftDemo() {
  return (
    <div className="flex items-end gap-4">
      <div className="hover-lift" style={{ cursor: 'pointer' }}>
        <PosterThumb width={90} height={135} alt="괴물" />
      </div>
      <span style={{ ...captionStyle, textTransform: 'none' }}>
        포인터 기기에서 hover 시 scale(1.03) — prefers-reduced-motion 존중
      </span>
    </div>
  )
}

/* ── 지도 포스터 호버 카드 pm-tip (globals.css 전역 클래스) ───────── */

export function PmTipDemo() {
  return (
    <div className="flex items-start gap-4">
      <div className="pm-wrap" style={{ position: 'relative', width: 56, height: 84 }}>
        <PosterThumb width={56} height={84} radius={4} alt="기생충" />
        <div className="pm-tip" style={{ display: 'block', position: 'static', transform: 'none', marginTop: 0 }}>
          <div className="pm-tip-title">기생충</div>
          <div className="pm-tip-director">봉준호</div>
          <div className="pm-tip-genres">
            <span className="pm-tip-genre-tag">드라마</span>
            <span className="pm-tip-genre-tag">🇰🇷 한국</span>
          </div>
          <div className="pm-tip-today-label">오늘 상영</div>
          <div className="pm-tip-times">
            <span className="pm-tip-time">14:00</span>
            <span className="pm-tip-time--soldout pm-tip-time">17:30</span>
            <span className="pm-tip-time--past pm-tip-time">10:20</span>
          </div>
        </div>
      </div>
      <span style={{ ...captionStyle, textTransform: 'none', maxWidth: 220 }}>
        실제로는 데스크톱 지도에서 포스터 hover 시 옆에 뜨는 카드 — 여기선 정적 배치.
        시간 색: 기본 primary / 매진 error+취소선 없음 / 지난회차 placeholder+취소선
      </span>
    </div>
  )
}

/* ── Toast 정적 재현 (원본은 position:fixed) ──────────────────────── */

export function ToastStatic({ message }: { message: string }) {
  return (
    <div style={{
      display: 'inline-block',
      background: 'var(--color-neutral-900)',
      color: 'var(--color-neutral-100)',
      fontSize: 14,
      fontWeight: 600,
      padding: '12px 16px',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
      whiteSpace: 'nowrap',
      letterSpacing: '-0.01em',
    }}>
      {message}
    </div>
  )
}
