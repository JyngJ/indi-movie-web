import React from 'react'

interface CardContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: string | number
  gap?: string | number
}

export function CardContainer({ children, padding, gap, style, ...props }: CardContainerProps) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--color-surface-card)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding,
        gap,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
