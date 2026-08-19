'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Group { title: string | null; items: { href: string; label: string }[] }

export function Sidebar({ groups }: { groups: Group[] }) {
  const pathname = usePathname()
  const [closed, setClosed] = useState<Record<string, boolean>>({})

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      {groups.map(group => {
        const key = group.title ?? '_'
        const open = !closed[key]
        const hasActive = group.items.some(i => i.href === pathname)

        return (
          <div key={key}>
            {group.title && (
              <button
                type="button"
                onClick={() => setClosed(c => ({ ...c, [key]: open }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px var(--spacing-3)', background: 'transparent', border: 0,
                  cursor: 'pointer', minHeight: 'unset',
                  fontSize: 'var(--text-body)', fontWeight: 700,
                  color: hasActive ? 'var(--color-text-primary)' : 'var(--color-text-body)',
                }}
              >
                {group.title}
                <span style={{
                  fontSize: 10, color: 'var(--color-text-placeholder)',
                  transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)',
                }}>▾</span>
              </button>
            )}
            {open && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: group.title ? 2 : 0 }}>
                {group.items.map(item => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        padding: '5px var(--spacing-3)', borderRadius: 'var(--radius-button)',
                        fontSize: group.title ? 'var(--text-meta)' : 'var(--text-body)',
                        textDecoration: 'none', lineHeight: 1.7,
                        /* 선택 항목은 어두운 그레이 면 + 흰 글씨 — 액센트(인디고)는 제품 쪽 언어라
                           문서 내비게이션까지 쓰면 강조가 두 곳이 된다. */
                        color: active ? 'var(--color-text-inverse)'
                          : group.title ? 'var(--color-text-caption)' : 'var(--color-text-primary)',
                        fontWeight: active ? 700 : group.title ? 500 : 700,
                        background: active ? 'var(--color-neutral-800)' : 'transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
