import Image from 'next/image'
import { manifest } from '@/design-system'
import { DocPage, DocSection, SubHeading, Code, DefTable, UsageCards } from '../../_ui/shell'

const LEVEL: Record<string, string> = {
  '--shadow-sm': 'E1 — 카드, 버튼 hover',
  '--shadow-md': 'E2 — FAB, 드롭다운, 팝업',
  '--shadow-lg': 'E3 — 모달, 다이얼로그',
  '--shadow-sheet': '하단 고정 면입니다. 방향 없는 앰비언트 2겹을 사용합니다.',
  '--shadow-popover': '액센트 면 위 툴팁에 사용합니다. 면과 같은 계열의 그림자로 띄웁니다.',
  '--shadow-panel-left': '레일 위에 떠 있는 본문 카드의 왼쪽 경계입니다.',
  '--shadow-inset': '프로필 이미지 안쪽 링입니다. 떠오르는 것이 아니라 파인 면을 표현합니다.',
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
      lead="그림자는 2겹(direct + ambient)이며 색은 웜 브라운(#140F0A)으로 고정합니다. 미색 배경 위에서 탁해지지 않고 종이 위의 그림자처럼 보입니다."
    >
      <DocSection
        id="model"
        title="Elevation Model"
        lead="층은 세 단계뿐입니다. 한 단계 올라갈 때마다 그림자가 깊어지고, 같은 층끼리는 같은 그림자를 씁니다. sheet는 방향 없는 앰비언트라 이 계단에 넣지 않습니다."
      >
        {/* 피그마 "Elevation Model" 프레임(572×480)을 2x로 내보낸 그림.
            scripts/figma/export-elevation-20260819.js로 다시 뽑을 수 있다. */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* unoptimized — 옅은 그림자와 얇은 선이라 재인코딩하면 뭉갠다. 2x 원본을 그대로 내보낸다. */}
          <Image
            src="/design-system/elevation-model.png"
            alt="E0 페이지 면 위로 E1(sm) · E2(md) · E3(lg) 세 층이 쌓인 입체 도식"
            width={1144}
            height={960}
            style={{ width: '70%', maxWidth: 572, height: 'auto', borderRadius: 'var(--radius-popover)' }}
            unoptimized
            priority
          />
        </div>
      </DocSection>

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
        lead="코드 그림자와 이름으로 짝지어 대조합니다."
      >
        <DefTable rows={effects20.map(e => [e.name, `${e.effects.length}겹`])} />
        {legacyEffects.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-6)' }}>
            <SubHeading>이전 버전 스타일 · {legacyEffects.length}</SubHeading>
            <DefTable
              rows={legacyEffects.map(e => [
                e.name,
                `${e.effects.length}겹 — 2.0/shadow/* 로 이관 예정입니다.`,
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
              rule: '층이 올라갈 때만 그림자를 높입니다. 같은 층의 카드는 같은 그림자를 사용합니다.',
              visual: (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 72, height: 52, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }} />
                  <div style={{ width: 72, height: 52, borderRadius: 12, background: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }} />
                </div>
              ),
            },
            {
              kind: 'dont',
              rule: '순검정이나 1겹 그림자를 새로 만들지 않습니다. 종이 톤 위에서 탁해집니다.',
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
