import Link from 'next/link'
import { manifest } from '@/design-system'
import { guideFor } from '@/design-system/guides'
import { DocPage, DocSection } from '../_ui/shell'
import { ComponentThumb } from '../_ui/thumbs'

/** 첫 문장만 잘라 카드 설명으로 쓴다 — 목록에서는 무엇인지만 알면 된다. */
function summarize(text: string) {
  const first = text.split(/(?<=다\.)\s/)[0] ?? text
  return first.length > 84 ? `${first.slice(0, 84)}…` : first
}

export default function ComponentsIndexPage() {
  const Grid = ({ names }: { names: string[] }) => (
    <div className="ds-cover-grid">
      {names.map(name => {
        const c = manifest.components.find(x => x.name === name)!
        const guide = guideFor(name)
        const desc = guide?.intro ? summarize(guide.intro) : c.doc.split('\n')[0]

        return (
          <Link key={name} href={`/design-system/components/${name}`} className="ds-cover-card">
            <div className="ds-grid-surface" data-tone="card" style={{
              position: 'relative',
              height: 168, borderRadius: 'var(--radius-popover)',
              border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', padding: 'var(--spacing-4)',
            }}>
              <ComponentThumb name={name} />
            </div>
            <div style={{
              marginTop: 'var(--spacing-4)', fontSize: 'var(--text-title)', fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}>{name}</div>
            {desc && (
              <p style={{
                marginTop: 6, fontSize: 'var(--text-meta)', lineHeight: 1.7,
                color: 'var(--color-text-sub)',
              }}>{desc}</p>
            )}
          </Link>
        )
      })}
    </div>
  )

  return (
    <DocPage
      href="/design-system/components"
      title="Components"
      lead="컴포넌트는 정해진 규칙에 따라 재사용하는 UI 요소입니다. 각 페이지는 실제 컴포넌트를 렌더한 Anatomy, 조작 가능한 State, TypeScript에서 추출한 Properties, 피그마 실측 Spec, 사용 규칙(Usage)을 제공합니다."
    >
      <DocSection id="list" title={`전체 · ${manifest.components.length}`}>
        <Grid names={manifest.components.map(c => c.name)} />
      </DocSection>
    </DocPage>
  )
}
