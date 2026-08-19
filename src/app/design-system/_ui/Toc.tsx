'use client'

import { useEffect, useState } from 'react'

export interface TocItem { id: string; label: string; depth?: 0 | 1 }

/** 우측 스티키 목차 — 현재 보이는 섹션에 점 표시. 코드잇 ToC 자리. */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    const nodes = items
      .map(i => document.getElementById(i.id))
      .filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return

    const io = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    )
    nodes.forEach(n => io.observe(n))
    return () => io.disconnect()
  }, [items])

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map(item => {
        const on = active === item.id
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 0 4px ' + (item.depth ? '14px' : '0'),
              fontSize: item.depth ? 'var(--text-meta)' : 'var(--text-body)',
              fontWeight: on ? 700 : 500,
              color: on ? 'var(--color-primary-base)'
                : item.depth ? 'var(--color-text-caption)' : 'var(--color-text-sub)',
              textDecoration: 'none', lineHeight: 1.6,
            }}
          >
            <span style={{
              width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
              background: on ? 'var(--color-primary-base)' : 'transparent',
            }} />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
