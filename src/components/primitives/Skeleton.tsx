'use client'

import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedStyles = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-[var(--radius-full)]',
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
  return (
    <div className="flex flex-col gap-2">
      <Skeleton width="100%" height={220} rounded="lg" />
      <Skeleton width="75%" height={16} />
      <Skeleton width="50%" height={13} />
    </div>
  )
}

// 극장 카드용 프리셋
export function TheaterCardSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton width={48} height={48} rounded="lg" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="80%" height={13} />
        <Skeleton width="40%" height={13} />
      </div>
    </div>
  )
}
