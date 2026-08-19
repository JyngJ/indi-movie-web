import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { manifest } from '@/design-system'
import './design-system.css'
import { Sidebar } from './_ui/Sidebar'

/* 내부 문서 사이트. 포트폴리오로 공개할 때 robots를 열면 된다. */
export const metadata: Metadata = {
  title: '영화볼지도 디자인 시스템',
  description: '코드와 피그마에서 생성한 영화볼지도 디자인 시스템 문서.',
  robots: { index: false, follow: false },
}

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  const components = manifest.components.map(c => c.name)

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--color-surface-bg)',
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)',
    }}>
      <div className="ds-shell">
        <aside className="ds-aside">
          <Link href="/design-system" style={{ textDecoration: 'none', display: 'block', marginBottom: 'var(--spacing-6)' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)', fontWeight: 700,
              color: 'var(--color-text-primary)', letterSpacing: '0.02em',
            }}>영화볼지도</div>
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginTop: 2 }}>
              디자인 시스템 2.0
            </div>
          </Link>
          <Sidebar components={components} />
          <div style={{
            marginTop: 'var(--spacing-8)', paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', lineHeight: 1.6,
          }}>
            생성 {manifest.generatedAt.slice(0, 10)}
            <br />
            피그마 덤프 {manifest.figmaDumpAt ? manifest.figmaDumpAt.slice(0, 10) : '없음'}
          </div>
        </aside>
        <main className="ds-main">{children}</main>
      </div>
    </div>
  )
}
