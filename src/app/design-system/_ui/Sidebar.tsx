'use client'

import { usePathname } from 'next/navigation'
import { NavLink } from './shell'

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: '시작',
    items: [{ href: '/design-system', label: '개요' }],
  },
  {
    group: '파운데이션',
    items: [
      { href: '/design-system/tokens', label: '토큰' },
      { href: '/design-system/typography', label: '타이포그래피' },
    ],
  },
  {
    group: '컴포넌트',
    items: [{ href: '/design-system/components', label: '전체 목록' }],
  },
  {
    group: '유지보수',
    items: [{ href: '/design-system/drift', label: '코드 ↔ 피그마 차이' }],
  },
]

export function Sidebar({ components }: { components: string[] }) {
  const pathname = usePathname()

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {NAV.map(({ group, items }) => (
        <div key={group}>
          <div style={{
            fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.4px',
            color: 'var(--color-text-caption)', fontWeight: 600, padding: '0 var(--spacing-3)',
            marginBottom: 'var(--spacing-2)',
          }}>{group}</div>
          {items.map(i => (
            <NavLink key={i.href} href={i.href} label={i.label} active={pathname === i.href} />
          ))}
          {group === '컴포넌트' && (
            <div style={{ marginTop: 'var(--spacing-1)' }}>
              {components.map(name => (
                <NavLink
                  key={name}
                  href={`/design-system/components/${name}`}
                  label={name}
                  active={pathname === `/design-system/components/${name}`}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
