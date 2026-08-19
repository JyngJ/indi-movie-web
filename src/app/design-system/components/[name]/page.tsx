import { notFound } from 'next/navigation'
import { manifest } from '@/design-system'
import { guideFor, hasPlayground } from '@/design-system/guides'
import { DocPage, DocSection, Code, DefTable } from '../../_ui/shell'
import { ComponentDoc } from '../../_ui/componentDocs'
import type { TocItem } from '../../_ui/Toc'

export function generateStaticParams() {
  return manifest.components.map(c => ({ name: c.name }))
}

export default async function ComponentPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const c = manifest.components.find(x => x.name === name)
  if (!c) notFound()

  const guide = guideFor(name)
  // 배리언트가 많은 세트는 앞쪽만 표로 싣고 나머지는 총계로 알린다.
  const VARIANT_LIMIT = 24
  const variants = c.figma?.variants.slice(0, VARIANT_LIMIT) ?? []
  const hiddenVariants = (c.figma?.variants.length ?? 0) - variants.length
  const toc: TocItem[] = [
    { id: 'anatomy', label: 'Anatomy' },
    ...(hasPlayground(name) ? [{ id: 'state', label: 'State' } as TocItem] : []),
    { id: 'properties', label: 'Properties' },
    ...(guide?.specs ? [{ id: 'spec', label: 'Spec' } as TocItem] : []),
    ...(guide?.usage ? [{ id: 'usage', label: 'Usage' } as TocItem] : []),
    { id: 'figma', label: '피그마' },
    { id: 'source', label: '소스' },
  ]

  return (
    <DocPage
      href={`/design-system/components/${name}`}
      title={name}
      lead={guide?.intro ?? c.doc ?? undefined}
      toc={toc}
    >
      <ComponentDoc name={name} />

      <DocSection
        id="properties"
        title="Properties"
        lead="TypeScript 타입에서 추출합니다. HTML 기본 속성은 제외했으며, 축(axes) 항목은 피그마 컴포넌트 세트에서 가져옵니다."
      >
        <DefTable
          rows={[
            ...Object.entries(c.figma?.axes ?? {}).map(([axis, values]) => [
              <span key={axis}>{axis} <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>· 피그마</span></span>,
              values.join(', '),
            ] as [React.ReactNode, React.ReactNode]),
            ...c.props.map(p => [
              <span key={p.name}>
                <Code>{p.name}</Code>
                {!p.optional && <span style={{ color: 'var(--color-error)' }}> *</span>}
              </span>,
              <span key="v">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)' }}>{p.type}</span>
                {p.default && <> · 기본값 <Code>{p.default}</Code></>}
                {p.doc && <div style={{ marginTop: 4, color: 'var(--color-text-caption)' }}>{p.doc}</div>}
              </span>,
            ] as [React.ReactNode, React.ReactNode]),
          ]}
        />
      </DocSection>

      <DocSection
        id="figma"
        title="피그마"
        lead={c.figma
          ? `${c.figma.name} — 배리언트 ${c.figma.variants.length}개입니다. 아래 수치는 피그마 노드 실측값입니다.`
          : '대응하는 피그마 컴포넌트 세트가 없습니다.'}
      >
        {c.figma && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-meta)' }}>
              <thead>
                <tr>
                  {['배리언트', 'W×H', 'radius', 'padding', 'gap', 'fill'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-3) var(--spacing-3) 0',
                      color: 'var(--color-text-caption)', fontWeight: 600, whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--color-border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--spacing-3) var(--spacing-3) var(--spacing-3) 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-body)' }}>
                      {Object.entries(v.props).map(([k, val]) => `${k}=${val}`).join(' · ') || '—'}
                    </td>
                    <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-text-sub)' }}>
                      {v.w != null && v.h != null ? `${Math.round(v.w)}×${Math.round(v.h)}` : '—'}
                    </td>
                    <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-text-sub)' }}>{v.radius ?? '—'}</td>
                    <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-text-sub)' }}>{v.pad ? v.pad.join(' ') : '—'}</td>
                    <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-text-sub)' }}>{v.gap ?? '—'}</td>
                    <td style={{ padding: 'var(--spacing-3)', color: 'var(--color-text-sub)' }}>{v.fill ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hiddenVariants > 0 && (
              <p style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                외 {hiddenVariants}개 — 축 조합 전체 중 앞의 {VARIANT_LIMIT}개를 싣습니다.
              </p>
            )}
          </div>
        )}
      </DocSection>

      <DocSection id="source" title="소스">
        <Code>{c.file}</Code>
      </DocSection>
    </DocPage>
  )
}
