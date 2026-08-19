import Link from 'next/link'
import { manifest } from '@/design-system'
import { Page, Section } from '../_ui/shell'

export default function ComponentsIndexPage() {
  return (
    <Page
      title="컴포넌트"
      lead="src/components/primitives의 프리미티브 전수. 각 페이지는 실제 컴포넌트를 렌더한 미리보기, TypeScript에서 뽑은 Props, 피그마 배리언트 실측을 나란히 보여준다."
    >
      <Section title={`프리미티브 ${manifest.components.length}`}>
        <div style={{
          display: 'grid', gap: 'var(--spacing-3)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        }}>
          {manifest.components.map(c => (
            <Link
              key={c.name}
              href={`/design-system/components/${c.name}`}
              style={{
                display: 'block', textDecoration: 'none', padding: 'var(--spacing-4)',
                background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {c.name}
              </div>
              <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', fontFamily: 'var(--font-mono)' }}>
                props {c.props.length} · {c.figmaSet ?? '피그마 세트 없음'}
              </div>
              {c.doc && (
                <div style={{
                  marginTop: 'var(--spacing-2)', fontSize: 'var(--text-badge)', lineHeight: 1.6,
                  color: 'var(--color-text-sub)', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {c.doc.split('\n')[0]}
                </div>
              )}
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  )
}
