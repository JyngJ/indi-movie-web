import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { manifest } from '@/design-system'
import './design-system.css'
import { Wordmark } from '@/components/primitives'
import { Sidebar } from './_ui/Sidebar'
import { NAV_GROUPS } from './_ui/nav'

/* 내부 문서 사이트. 포트폴리오로 공개할 때 robots를 열면 된다. */
export const metadata: Metadata = {
  title: '영화볼지도 디자인 시스템',
  description: '코드와 피그마에서 생성한 영화볼지도 디자인 시스템 문서.',
  robots: { index: false, follow: false },
}

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ds-root">
      <div className="ds-shell">
        <aside className="ds-aside">
          <Link href="/design-system" style={{ textDecoration: 'none', display: 'block', marginBottom: 'var(--spacing-8)', padding: '0 var(--spacing-3)' }}>
            {/* 제품이 쓰는 그 워드마크(2.0/logo/wordmark)를 그대로 쓴다 — 문서용 약자를 따로 만들면
                로고가 두 개가 된다. */}
            <Wordmark style={{ height: 28, width: 'auto', display: 'block' }} />
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginTop: 'var(--spacing-2)' }}>
              디자인 시스템 2.0
            </div>
          </Link>
          <Sidebar groups={NAV_GROUPS()} />
          <div style={{
            marginTop: 'var(--spacing-8)', paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid var(--color-neutral-300)',
            fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', lineHeight: 1.7,
            padding: 'var(--spacing-4) var(--spacing-3) 0',
          }}>
            생성 {manifest.generatedAt.slice(0, 10)}
            <br />
            피그마 덤프 {manifest.figmaDumpAt ? manifest.figmaDumpAt.slice(0, 10) : '없음'}
          </div>
        </aside>
        <div className="ds-card">{children}</div>
      </div>
    </div>
  )
}
