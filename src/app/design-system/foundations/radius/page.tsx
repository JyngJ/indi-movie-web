import { manifest } from '@/design-system'
import { DocPage, DocSection, Code, UsageCards } from '../../_ui/shell'

export default function RadiusPage() {
  const radius = manifest.tokenGroups.flatMap(g => g.tokens).filter(t => t.name.startsWith('--radius-'))

  return (
    <DocPage
      href="/design-system/foundations/radius"
      title="Radius"
      lead="반경은 크기가 아니라 역할로 이름 붙인다. sm/md/lg 같은 이름은 같은 이름에 다른 값이 들어가는 사고를 반복시켜 2.0에서 전부 삭제했다."
      toc={[{ id: 'roles', label: '역할' }, { id: 'usage', label: 'Usage' }]}
    >
      <DocSection id="roles" title="역할" lead="포스터가 가장 각지고(2), 시트가 가장 둥글다(20). 층이 위로 갈수록 둥글어진다.">
        <div style={{
          display: 'grid', gap: 'var(--spacing-4)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        }}>
          {radius.map(t => {
            const px = parseInt(t.resolved, 10)
            return (
              <div key={t.name} style={{
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)',
                padding: 'var(--spacing-4)', background: 'var(--color-surface-card)',
              }}>
                <div style={{
                  height: 72, background: 'var(--color-primary-100)',
                  border: '1px solid var(--color-primary-300)',
                  borderRadius: Math.min(px, 36),
                }} />
                <div style={{ marginTop: 'var(--spacing-3)' }}>
                  <Code>{t.name}</Code>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
                    {t.resolved}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
                    {t.comment || '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DocSection>

      <DocSection id="usage" title="Usage">
        <UsageCards
          items={[
            {
              kind: 'do',
              rule: '같은 층의 요소는 같은 반경을 쓴다. 카드·입력·칩은 control(12), 팝오버는 16.',
              visual: (
                <div style={{ display: 'flex', gap: 12 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 56, height: 40, borderRadius: 12, background: 'var(--color-surface-raised)' }} />
                  ))}
                </div>
              ),
            },
            {
              kind: 'dont',
              rule: '한 화면에서 반경을 섞지 않는다. 포스터(2)와 pill(9999)이 나란히 붙으면 둘 다 실수처럼 보인다.',
              visual: (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 40, borderRadius: 2, background: 'var(--color-surface-raised)' }} />
                  <div style={{ width: 56, height: 40, borderRadius: 9999, background: 'var(--color-surface-raised)' }} />
                  <div style={{ width: 56, height: 40, borderRadius: 20, background: 'var(--color-surface-raised)' }} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
