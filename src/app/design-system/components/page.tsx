import Link from 'next/link'
import { manifest } from '@/design-system'
import { guideFor } from '@/design-system/guides'
import { DocPage, DocSection } from '../_ui/shell'

export default function ComponentsIndexPage() {
  const documented = manifest.components.filter(c => guideFor(c.name))
  const rest = manifest.components.filter(c => !guideFor(c.name))

  const Card = ({ name }: { name: string }) => {
    const c = manifest.components.find(x => x.name === name)!
    const guide = guideFor(name)
    return (
      <Link href={`/design-system/components/${name}`} style={{
        display: 'block', textDecoration: 'none', padding: 'var(--spacing-5)',
        background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-control)',
      }}>
        <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
        <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-mono)' }}>
          props {c.props.length}{c.figmaSet ? ` · ${c.figmaSet}` : ''}
        </div>
        {(guide?.intro || c.doc) && (
          <p style={{
            marginTop: 'var(--spacing-3)', fontSize: 'var(--text-meta)', lineHeight: 1.7,
            color: 'var(--color-text-sub)', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {guide?.intro ?? c.doc.split('\n')[0]}
          </p>
        )}
      </Link>
    )
  }

  const Grid = ({ names }: { names: string[] }) => (
    <div style={{
      display: 'grid', gap: 'var(--spacing-4)',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    }}>
      {names.map(n => <Card key={n} name={n} />)}
    </div>
  )

  return (
    <DocPage
      href="/design-system/components"
      title="Components"
      lead="컴포넌트는 정해진 규칙에 따라 재사용하는 UI 요소입니다. 각 페이지는 실제 컴포넌트를 렌더한 Anatomy, 조작 가능한 State, TypeScript에서 추출한 Properties, 피그마 실측 Spec, 사용 규칙(Usage)을 제공합니다."
      toc={[{ id: 'documented', label: '가이드' }, { id: 'rest', label: '레퍼런스' }]}
    >
      <DocSection id="documented" title={`가이드 · ${documented.length}`} lead="Anatomy · Spec · Usage까지 정리된 컴포넌트입니다.">
        <Grid names={documented.map(c => c.name)} />
      </DocSection>

      <DocSection
        id="rest"
        title={`레퍼런스 · ${rest.length}`}
        lead="렌더 견본과 Props, 피그마 실측을 확인할 수 있습니다."
      >
        <Grid names={rest.map(c => c.name)} />
      </DocSection>
    </DocPage>
  )
}
