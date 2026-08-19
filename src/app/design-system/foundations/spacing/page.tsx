import { manifest } from '@/design-system'
import { DocPage, DocSection, Code, Stage, DefTable, UsageCards } from '../../_ui/shell'

const USE: Record<string, string> = {
  '--spacing-1': '칩·배지 내부, 아이콘과 글자 사이',
  '--spacing-2': '요소 간 기본 간격',
  '--spacing-3': '카드 내부 요소 사이',
  '--spacing-4': '카드 패딩, 거터',
  '--spacing-6': '카드 내부 그룹 사이',
  '--spacing-8': '카드 사이, 큰 패딩',
  '--spacing-12': '섹션 사이',
  '--spacing-16': '큰 섹션, 화면 상하',
  '--spacing-24': '히어로 위아래',
  '--spacing-32': '특대 — 엠티 스테이트·랜딩',
}

export default function SpacingPage() {
  const all = manifest.tokenGroups.flatMap(g => g.tokens)
  const spacing = all.filter(t => t.name.startsWith('--spacing-'))
  const gutters = all.filter(t => t.name.startsWith('--gutter'))

  return (
    <DocPage
      href="/design-system/foundations/spacing"
      title="Spacing"
      lead="모든 간격은 4의 배수입니다. n = px ÷ 4 로 읽으며, 스케일을 벗어난 값은 감사 스크립트가 집계해 관리합니다."
    >
      <DocSection id="scale" title="Scale" lead="피그마 컬렉션 “영화볼지도 스페이싱 - 2.0”과 같은 단계를 사용합니다.">
        <div>
          {spacing.map(t => {
            const px = parseInt(t.resolved, 10)
            return (
              <div key={t.name} style={{
                display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) 64px minmax(0, 1fr)',
                alignItems: 'center', gap: 'var(--spacing-4)',
                padding: 'var(--spacing-3) 0', borderTop: '1px solid var(--color-border)',
              }}>
                <Code>{t.name}</Code>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)', color: 'var(--color-text-body)' }}>{t.resolved}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                  <div style={{ height: 14, width: Math.min(px, 260), background: 'var(--color-primary-300)', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
                    {USE[t.name] ?? t.comment}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </DocSection>

      <DocSection
        id="gutter"
        title="Gutter"
        lead="좌우 여백은 중첩 깊이에 따라 줄입니다 — 최상위 16, 그 안쪽 12, 더 안쪽 8입니다."
      >
        <Stage minHeight={200}>
          <div style={{ width: '100%', maxWidth: 320, background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', padding: 16 }}>
            <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>--gutter 16</div>
            <div style={{ marginTop: 8, background: 'var(--color-surface-bg)', borderRadius: 'var(--radius-button)', padding: 12 }}>
              <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>--gutter-md 12</div>
              <div style={{ marginTop: 8, background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-badge)', padding: 8 }}>
                <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>--gutter-sm 8</div>
              </div>
            </div>
          </div>
        </Stage>
        <div style={{ marginTop: 'var(--spacing-6)' }}>
          <DefTable rows={gutters.map(t => [<Code key={t.name}>{t.name}</Code>, `${t.resolved}${t.comment ? ` — ${t.comment}` : ''}`])} />
        </div>
      </DocSection>

      <DocSection id="usage" title="Usage">
        <UsageCards
          items={[
            {
              kind: 'do',
              rule: '인접한 단계는 최소 한 칸 이상 차이를 둡니다. 12와 16을 나란히 쓰면 정렬 오류처럼 보입니다.',
              visual: (
                <div style={{ display: 'grid', gap: 24, width: 200 }}>
                  <div style={{ height: 28, background: 'var(--color-surface-raised)', borderRadius: 8 }} />
                  <div style={{ height: 28, background: 'var(--color-surface-raised)', borderRadius: 8 }} />
                </div>
              ),
            },
            {
              kind: 'dont',
              rule: '4의 배수가 아닌 값(10 · 14 · 18)은 사용하지 않습니다. 감사에서 하드코딩으로 집계됩니다.',
              visual: (
                <div style={{ display: 'grid', gap: 14, width: 200 }}>
                  <div style={{ height: 26, background: 'var(--color-surface-raised)', borderRadius: 8 }} />
                  <div style={{ height: 26, background: 'var(--color-surface-raised)', borderRadius: 8 }} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
