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
        /* 시트 면은 미색 종이(--color-surface-bg)다. raised(#EAE5E1)를 쓰면 핸들 색
           (--color-border, 같은 #EAE5E1)과 맞물려 핸들이 통째로 사라진다.
           제품의 실제 시트(TheaterSheet)도 이 면을 쓴다. */
        backgroundColor: 'var(--color-surface-bg)',
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
