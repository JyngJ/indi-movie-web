'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Group {
  title: string | null
  href: string | null
  items: { href: string; label: string }[]
}

/** 서비스에서 쓰는 접힘 표시와 같은 꺾쇠. 열리면 뒤집힌다. */
const IcoChevron = ({ open }: { open: boolean }) => (
  <svg
    width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export function Sidebar({ groups }: { groups: Group[] }) {
  const pathname = usePathname()

  /** 지금 보고 있는 페이지가 속한 그룹. 기본은 이 그룹만 열려 있다 —
   *  전부 펼쳐 두면 컴포넌트 26개가 목록을 삼킨다. */
  const activeGroup = groups.find(g =>
    g.title && (pathname === g.href || g.items.some(i => i.href === pathname)),
  )?.title ?? null

  // 손으로 연 그룹은 그 페이지에 머무는 동안만 유지한다. 페이지를 옮기면 다시
  // "지금 보는 페이지의 그룹"으로 돌아간다 — Prev/Next로 넘어가도 사이드바가 따라온다.
  const [manual, setManual] = useState<string | null | undefined>(undefined)
  useEffect(() => { setManual(undefined) }, [pathname])

  const openGroup = manual === undefined ? activeGroup : manual

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      {groups.map(group => {
        const key = group.title ?? '_'
        const open = group.title === null || openGroup === group.title
        const coverActive = !!group.href && pathname === group.href

        return (
          <div key={key}>
            {group.title && group.href && (
              <Link
                href={group.href}
                className="ds-nav-group"
                data-has-active={openGroup === group.title}
                data-active={coverActive}
                onClick={() => setManual(openGroup === group.title ? null : group.title)}
              >
                {group.title}
                {/* 딸린 페이지가 없으면 펼칠 것도 없다 — 꺾쇠를 두지 않는다 */}
                {group.items.length > 0 && <IcoChevron open={open} />}
              </Link>
            )}
            {/* 0fr → 1fr 그리드로 높이를 애니메이션한다. max-height 추정치가 필요 없다. */}
            <div className="ds-nav-collapse" data-open={open}>
              <div style={{ overflow: 'hidden' }}>
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
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
