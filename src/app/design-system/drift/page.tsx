import { manifest } from '@/design-system'
import { DocPage, DocSection, Code } from '../_ui/shell'

const KIND: Record<string, { title: string; note: string }> = {
  'token-value': {
    title: '값이 다른 항목',
    note: '같은 이름의 코드 토큰과 피그마 변수가 서로 다른 값을 가리킵니다. 기준을 정해 한쪽으로 맞춥니다.',
  },
  'figma-only': {
    title: '피그마에만 정의된 값',
    note: '피그마 변수로는 정의돼 있으나 코드 토큰이 없는 항목입니다. 사용을 시작할 때 tokens.css에 추가합니다.',
  },
  'type-scale': {
    title: '타입 스케일 밖의 크기',
    note: '2.0 텍스트 스타일에 없는 크기를 코드가 사용합니다. 스타일을 추가하거나 스케일 안의 값으로 조정합니다.',
  },
  'legacy-figma-style': {
    title: '이전 버전 스타일',
    note: '2.0 접두사가 없는 피그마 텍스트·이펙트 스타일입니다. 사용 중인 노드를 2.0으로 옮긴 뒤 정리합니다.',
  },
  'component-unmapped': {
    title: '피그마 세트 미연결',
    note: '코드에는 있으나 대응하는 피그마 컴포넌트 세트가 없는 항목입니다.',
  },
}

export default function DriftPage() {
  const kinds = [...new Set(manifest.drift.map(d => d.kind))]

  return (
    <DocPage
      href="/design-system/drift"
      title="코드 ↔ 피그마 차이"
      lead={<>매니페스트를 만들 때 코드 토큰과 피그마 변수를 이름으로 짝지어 값을 대조합니다. 이 페이지는 <Code>npm run ds:build</Code>가 만든 결과를 그대로 보여줍니다.</>}
    >
      {manifest.drift.length === 0 && (
        <DocSection title="차이 없음">
          <div style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-sub)' }}>코드와 피그마가 일치합니다.</div>
        </DocSection>
      )}

      {kinds.map(kind => {
        const rows = manifest.drift.filter(d => d.kind === kind)
        const meta = KIND[kind] ?? { title: kind, note: '' }
        return (
          <DocSection key={kind} id={kind} title={`${meta.title} · ${rows.length}`} lead={meta.note}>
            <div>
              {rows.map((d, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: 'minmax(160px, 240px) minmax(0, 1fr)',
                  gap: 'var(--spacing-4)', padding: 'var(--spacing-3) 0',
                  borderTop: '1px solid var(--color-border)', fontSize: 'var(--text-meta)',
                }}>
                  <div>
                    <Code>{d.id}</Code>
                    {(d.code || d.figma) && (
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
                        {d.code ?? '—'} · {d.figma ?? '—'}
                      </div>
                    )}
                  </div>
                  <div style={{ color: 'var(--color-text-sub)', lineHeight: 1.7 }}>{d.note}</div>
                </div>
              ))}
            </div>
          </DocSection>
        )
      })}
    </DocPage>
  )
}
