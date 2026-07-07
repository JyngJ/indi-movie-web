import React from 'react'

interface ScrollNavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction: 'left' | 'right'
}

export function ScrollNavButton({ direction, style, ...props }: ScrollNavButtonProps) {
  return (
    <button
      {...props}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [direction === 'left' ? 'left' : 'right']: 6,
        width: 32, height: 32, borderRadius: '50%',
        backgroundColor: 'var(--color-surface-bg)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 3, color: 'var(--color-text-primary)',
        minHeight: 'unset',
        ...style,
      }}
      aria-label={direction === 'left' ? '이전' : '다음'}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
