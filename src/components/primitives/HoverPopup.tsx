import React from 'react'

interface HoverPopupProps {
  x: number
  y: number
  title: React.ReactNode
  subtitle?: React.ReactNode
  tags?: React.ReactNode[]
  synopsis?: React.ReactNode
}

export function HoverPopup({ x, y, title, subtitle, tags, synopsis }: HoverPopupProps) {
  const cardWidth = 220
  const adjustedX = x + cardWidth > window.innerWidth - 16 ? x - cardWidth - 156 : x

  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: adjustedX,
        width: cardWidth,
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 9999,
        pointerEvents: 'none',
        padding: 'var(--spacing-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-2)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-subtitle)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </span>

      {subtitle && (
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
          {subtitle}
        </span>
      )}

      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)' }}>
          {tags.map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: 'var(--text-caption)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-body)',
                border: '1px solid var(--color-border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {synopsis && (
        <>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <span
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-caption)',
              lineHeight: 1.65,
            }}
          >
            {synopsis}
          </span>
        </>
      )}
    </div>
  )
}
