import { manifest } from '@/design-system'
import { DocPage, DocSection, SubHeading, Code, DefTable, UsageCards } from '../../_ui/shell'

const LEVEL: Record<string, string> = {
  '--shadow-sm': 'E1 — 카드, 버튼 hover',
  '--shadow-md': 'E2 — FAB, 드롭다운, 팝업',
  '--shadow-lg': 'E3 — 모달, 다이얼로그',
  '--shadow-sheet': '하단 고정 면 — 방향 없는 앰비언트 2겹',
  '--shadow-popover': '액센트 면 위 툴팁 — 한류 계열 그림자',
  '--shadow-panel-left': '레일 위에 뜬 본문 카드의 왼쪽 경계',
  '--shadow-inset': '프로필 이미지 안쪽 링 — 유일한 inset. 뜨는 게 아니라 파인 것',
}

export default function ElevationPage() {
  const shadows = manifest.tokenGroups
    .flatMap(g => g.tokens)
    .filter(t => t.name.startsWith('--shadow-') && t.resolved.includes(' '))

  const effects20 = manifest.effects.filter(e => e.name.startsWith('2.0/'))
  const legacyEffects = manifest.effects.filter(e => !e.name.startsWith('2.0/'))

  return (
    <DocPage
      href="/design-system/foundations/elevation"
      title="Elevation"
      lead="그림자는 2겹(direct + ambient)이고 색은 웜 브라운(#140F0A) 고정이다. 순검정 그림자는 미색 종이 배경 위에서 회색 얼룩처럼 보인다."
      toc={[{ id: 'levels', label: '단계' }, { id: 'effects', label: '피그마 이펙트' }, { id: 'usage', label: 'Usage' }]}
    >
      <DocSection id="levels" title="단계">
        <div style={{
          display: 'grid', gap: 'var(--spacing-6)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        }}>
          {shadows.map(t => (
            <div key={t.name}>
              <div style={{
                height: 96, borderRadius: 'var(--radius-control)',
                background: 'var(--color-surface-card)', boxShadow: t.resolved,
              }} />
              <div style={{ marginTop: 'var(--spacing-4)' }}>
                <Code>{t.name}</Code>
                <div style={{ marginTop: 6, fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
                  {LEVEL[t.name] ?? t.comment ?? '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection
        id="effects"
        title="피그마 이펙트"
        lead="코드 그림자와 이름으로 짝지어 본다. 2.0은 2겹, 1.0은 1겹이라 같은 이름이 다른 값을 가리켰다 — 1.0은 걷어내는 중이다."
      >
        <DefTable rows={effects20.map(e => [e.name, `${e.effects.length}겹`])} />
        {legacyEffects.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-6)' }}>
            <SubHeading kicker="정리 대상">1.0 잔재 · {legacyEffects.length}</SubHeading>
            <DefTable
              rows={legacyEffects.map(e => [
                e.name,
                `${e.effects.length}겹 — scripts/figma/legacy-cleanup-20260819.js로 2.0/shadow/*에 옮기고 삭제한다`,
              ])}
            />
          </div>
        )}
      </DocSection>

      <DocSection id="usage" title="Usage">
        <UsageCards
          items={[
            {
              kind: 'do',
              rule: '층이 올라갈 때만 그림자를 올린다. 같은 층의 카드는 같은 그림자를 쓴다.',
              visual: (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 72, height: 52, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }} />
                  <div style={{ width: 72, height: 52, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }} />
                </div>
              ),
            },
            {
              kind: 'dont',
              rule: '순검정 그림자나 1겹 그림자를 새로 만들지 않는다. 종이 톤 위에서 탁해진다.',
              visual: (
                <div style={{ width: 96, height: 52, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }} />
              ),
            },
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
