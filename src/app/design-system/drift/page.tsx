import { manifest } from '@/design-system'
import { Page, Section, Code, Table } from '../_ui/shell'

const KIND_LABEL: Record<string, { title: string; note: string }> = {
  'token-value': {
    title: '값이 다르다',
    note: '같은 이름인데 코드와 피그마 값이 어긋난다. 어느 쪽이 맞는지 정하고 즉시 맞출 것 — 이 목록은 0이어야 한다.',
  },
  'figma-only': {
    title: '피그마에만 있다',
    note: '피그마 변수에는 있는데 코드 토큰이 없다. 아직 안 쓰는 램프 단계이면 정상이고, 쓰기 시작하면 tokens.css에 내려야 한다.',
  },
  'type-scale': {
    title: '타입 스케일 밖',
    note: '2.0 텍스트 스타일에 없는 크기를 코드가 쓴다. 스타일을 만들거나 스케일 안 값으로 내릴 것.',
  },
  'component-unmapped': {
    title: '피그마 세트 없음',
    note: '코드에는 있는데 피그마 컴포넌트 세트가 없다. 시안을 그리든지, 이름만 다르면 FIGMA_ALIAS에 적는다.',
  },
}

export default function DriftPage() {
  const kinds = [...new Set(manifest.drift.map(d => d.kind))]

  return (
    <Page
      title="코드 ↔ 피그마 차이"
      lead={
        <>
          매니페스트를 만들 때 코드 토큰과 피그마 변수를 이름으로 짝지어 값을 견준다.
          이 페이지는 그 결과를 그대로 보여준다 — 손으로 관리하는 목록이 아니라 <Code>npm run ds:build</Code>의 산출물이다.
        </>
      }
    >
      {manifest.drift.length === 0 && (
        <Section title="차이 없음">
          <div style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-sub)' }}>코드와 피그마가 일치한다.</div>
        </Section>
      )}

      {kinds.map(kind => {
        const rows = manifest.drift.filter(d => d.kind === kind)
        const meta = KIND_LABEL[kind] ?? { title: kind, note: '' }
        return (
          <Section key={kind} title={`${meta.title} · ${rows.length}`} note={meta.note}>
            <Table
              head={['대상', '코드', '피그마', '메모']}
              rows={rows.map(d => [
                <Code key="i">{d.id}</Code>,
                d.code ?? '—',
                d.figma ?? '—',
                d.note,
              ])}
            />
          </Section>
        )
      })}
    </Page>
  )
}
