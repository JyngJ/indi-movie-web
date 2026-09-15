'use client'

import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedStyles = {
  sm: 'rounded-[var(--radius-badge)]',
  md: 'rounded-[var(--radius-poster)]',
  lg: 'rounded-[var(--radius-poster)]',
  full: 'rounded-[var(--radius-pill)]',
}

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`
        animate-pulse
        bg-[var(--color-border)]
        ${roundedStyles[rounded]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  )
}

// 영화 카드용 프리셋
export function MovieCardSkeleton() {
  // 실제 카드 문법과 동일: 포스터 2:3(r2) + 제목 14 + 메타 12 두 줄
  return (
    <div className="flex flex-col gap-2">
      <Skeleton width="100%" style={{ aspectRatio: '2 / 3' }} />
      <Skeleton width="75%" height={18} />
      <Skeleton width="50%" height={14} />
    </div>
  )
}

// 극장 카드용 프리셋 — 영화 상세의 "상영중인 영화관" 카드와 같은 문법:
// 카드 면(r12 + 보더) 안에 극장명 · 주소 · 상영 시간 칩 줄
export function TheaterCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 flex flex-col gap-3">
      <Skeleton width="55%" height={16} />
      <Skeleton width="35%" height={12} />
      <div className="flex gap-2">
        <Skeleton width={68} height={32} rounded="sm" />
        <Skeleton width={68} height={32} rounded="sm" />
        <Skeleton width={68} height={32} rounded="sm" />
      </div>
    </div>
  )
}

/* 상영 회차 셀용 프리셋 — 실제 ShowtimeCell과 규격을 맞춘다.
   높이는 실측값(102~105px)이다: 내부 여백 16×2 + 시간(16) + 종료시간(12+4) + 잔여석(12+4) + 보더 2.
   예전에는 호출부마다 height 60 / borderRadius 8 같은 리터럴을 따로 적어서 실제 셀보다
   40px 넘게 짧았고, 로딩이 끝나는 순간 시간표가 통째로 아래로 밀렸다. */
export function ShowtimeCellSkeleton() {
  return (
    <Skeleton
      height={102}
      style={{ borderRadius: 'var(--comp-showtime-radius)' }}
    />
  )
}
