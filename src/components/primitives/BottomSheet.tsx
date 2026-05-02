'use client'

import { ReactNode } from 'react'

interface BottomSheetProps {
  children: ReactNode
  className?: string
}

export function BottomSheet({ children, className = '' }: BottomSheetProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderRadius: 'var(--comp-sheet-radius)',
        boxShadow: 'var(--shadow-sheet)',
        paddingTop: 8,
        paddingBottom: 20,
        overflow: 'hidden',   // 모서리 라운드 유지
      }}
    >
      {/* 핸들바 */}
      <div className="flex justify-center pb-3">
        <div
          style={{
            width: 'var(--comp-sheet-handle-width)',
            height: 'var(--comp-sheet-handle-height)',
            borderRadius: 'var(--comp-sheet-handle-radius)',
            backgroundColor: 'var(--color-border)',
          }}
        />
      </div>
      {children}
    </div>
  )
}
