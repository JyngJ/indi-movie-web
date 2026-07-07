import React from 'react'

interface ScrollNavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction: 'left' | 'right'
}

export function ScrollNavButton({ direction, style, ...props }: ScrollNavButtonProps) {
  return (
    <button
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        backgroundColor: 'var(--color-surface-card)', // No glassmorphism
        color: 'var(--color-text-body)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)', // Tokenized shadow
        ...style,
      }}
      aria-label={direction === 'left' ? '이전' : '다음'}
      {...props}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  )
}
