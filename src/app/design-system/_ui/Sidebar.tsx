'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Group { title: string | null; items: { href: string; label: string }[] }

export function Sidebar({ groups }: { groups: Group[] }) {
  const pathname = usePathname()
  const [closed, setClosed] = useState<Record<string, boolean>>({})

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {groups.map(group => {
        const key = group.title ?? '_'
        const open = !closed[key]
        const hasActive = group.items.some(i => i.href === pathname)

        return (
          <div key={key}>
            {group.title && (
              <button
                type="button"
                className="ds-nav-group"
                data-has-active={hasActive}
                onClick={() => setClosed(c => ({ ...c, [key]: open }))}
              >
                {group.title}
                <span style={{
                  fontSize: 11, color: 'var(--color-text-placeholder)',
                  transform: open ? 'rotate(180deg)' : 'none',
                  transition: 'transform var(--transition-fast)',
                }}>▾</span>
              </button>
            )}
            {open && (
              <div className="ds-nav-items">
                {group.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="ds-nav-link"
                    data-active={pathname === item.href}
                    data-top={!group.title}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
