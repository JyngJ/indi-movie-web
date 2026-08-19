import { notFound } from 'next/navigation'
import { manifest } from '@/design-system'
import { Page, Section, Code, Table } from '../../_ui/shell'
import { Demo } from '../../_ui/demos'

export function generateStaticParams() {
  return manifest.components.map(c => ({ name: c.name }))
}

export default async function ComponentPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const c = manifest.components.find(x => x.name === name)
  if (!c) notFound()

  const axes = c.figma ? Object.entries(c.figma.axes) : []

  return (
    <Page title={c.name} lead={c.doc || undefined}>
      <Section title="미리보기" note="제품 코드의 컴포넌트를 그대로 import해 렌더한 것이다. 스크린샷이 아니라 실물이다.">
        <Demo name={c.name} />
      </Section>

      <Section title="Props" note="TypeScript 타입에서 추출한다. HTML 기본 속성 상속분은 뺐다.">
        {c.props.length ? (
          <Table
            head={['이름', '타입', '기본값', '설명']}
            rows={c.props.map(p => [
              <span key="n">
                <Code>{p.name}</Code>{!p.optional && <span style={{ color: 'var(--color-error)' }}> *</span>}
              </span>,
              <span key="t" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)' }}>{p.type}</span>,
              p.default ? <Code key="d">{p.default}</Code> : '—',
              p.doc || '—',
            ])}
          />
        ) : (
          <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>선언된 props 없음</div>
        )}
      </Section>

      <Section
        title="피그마"
        note={c.figma
          ? `${c.figma.name} — 배리언트 ${c.figma.variants.length}개. 크기·패딩·래디우스는 피그마 노드 실측값이다.`
          : '대응하는 피그마 컴포넌트 세트가 없다. 시안에 없는 컴포넌트이거나, 이름이 다르면 build-manifest.mjs의 FIGMA_ALIAS에 적어야 한다.'}
      >
        {c.figma && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
              {axes.map(([axis, values]) => (
                <div key={axis}>
                  <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', marginBottom: 4 }}>{axis}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {values.map(v => (
                      <span key={v} style={{
                        fontSize: 'var(--text-badge)', fontFamily: 'var(--font-mono)',
                        padding: '4px 8px', borderRadius: 'var(--radius-badge)',
                        background: 'var(--color-surface-raised)', color: 'var(--color-text-body)',
                      }}>{v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Table
              head={['배리언트', 'W×H', 'radius', 'padding', 'gap', 'fill']}
              rows={c.figma.variants.map(v => [
                <span key="v" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)' }}>
                  {Object.entries(v.props).map(([k, val]) => `${k}=${val}`).join(' · ') || '—'}
                </span>,
                v.w != null && v.h != null ? `${Math.round(v.w)}×${Math.round(v.h)}` : '—',
                v.radius != null ? `${v.radius}` : '—',
                v.pad ? v.pad.join(' ') : '—',
                v.gap != null ? `${v.gap}` : '—',
                v.fill ?? '—',
              ])}
            />
          </>
        )}
      </Section>

      <Section title="소스">
        <Code>{c.file}</Code>
      </Section>
    </Page>
  )
}
