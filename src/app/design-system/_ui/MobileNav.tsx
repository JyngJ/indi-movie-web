'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Wordmark } from '@/components/primitives'
import { Sidebar } from './Sidebar'
import { NAV_GROUPS, flatPages } from './nav'

/** 좁은 화면 전용 — 상단 바에 현재 위치를 적고, 내비는 드로어로 연다.
 *  1024 이상에서는 CSS로 감춘다(사이드바가 그 역할을 한다). */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 페이지를 옮기면 닫는다. 링크를 눌러 이동한 뒤 드로어가 남아 있으면 갇힌 것처럼 보인다.
  useEffect(() => { setOpen(false) }, [pathname])

  // 드로어가 열린 동안 뒤 본문이 스크롤되지 않게 잠근다.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = flatPages().find(p => p.href === pathname)?.label ?? '디자인 시스템'

  return (
    <>
      <div className="ds-topbar">
        <Wordmark style={{ height: 20, width: 'auto', flexShrink: 0 }} title="영화볼지도" />
        <span className="ds-topbar__title">{current}</span>
        <button
          type="button"
          className="ds-topbar__btn"
          aria-label="문서 목차 열기"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="ds-drawer" role="dialog" aria-modal="true" aria-label="문서 목차">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 'var(--spacing-4)',
          }}>
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>목차</span>
            <button
              type="button"
              className="ds-topbar__btn"
              aria-label="닫기"
              onClick={() => setOpen(false)}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <Sidebar groups={NAV_GROUPS()} />
        </div>
      )}
    </>
  )
}
