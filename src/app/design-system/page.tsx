import Link from 'next/link'
import { manifest } from '@/design-system'
import { DocPage, DocSection, Code, DefTable, Stage } from './_ui/shell'

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div style={{
      background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-control)', padding: 'var(--spacing-4)', minWidth: 128, flex: '1 1 128px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
        color: 'var(--color-text-primary)', lineHeight: 1,
      }}>{value}</div>
      <div style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{label}</div>
    </div>
  )
}

export default function OverviewPage() {
  const tokenCount = manifest.tokenGroups.reduce((n, g) => n + g.tokens.length, 0)
  const mapped = manifest.components.filter(c => c.figmaSet).length
  const kinds = manifest.drift.reduce<Record<string, number>>((a, d) => {
    a[d.kind] = (a[d.kind] ?? 0) + 1
    return a
  }, {})

  return (
    <DocPage
      href="/design-system"
      title="영화볼지도 디자인 시스템"
      lead="전국 독립·예술영화관의 상영 정보를 지도에서 안내하는 서비스의 디자인 시스템입니다. 미색 배경 위에 흰 카드를 올리고 인디고 한 가지로 행동을 가리키는 원칙 위에 세워져 있습니다. 이 문서의 값은 코드와 피그마에서 생성됩니다."
    >
      <DocSection id="principles" title="원칙">
        <Stage tone="tint" minHeight={200}>
          <div style={{
            display: 'flex', gap: 'var(--spacing-6)', flexWrap: 'wrap', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)',
          }}>
            <span>종이</span><span style={{ color: 'var(--color-text-placeholder)' }}>·</span>
            <span>한 가지 강조</span><span style={{ color: 'var(--color-text-placeholder)' }}>·</span>
            <span>읽히는 정보</span>
          </div>
        </Stage>
        <div style={{ marginTop: 'var(--spacing-6)' }}>
          <DefTable
            rows={[
              ['종이 위의 정보', '배경은 미색(#FAF9F8), 카드는 흰색입니다. 층은 색 대비로 만들고, 그림자는 실제로 떠 있는 요소에만 사용합니다.'],
              ['강조는 하나', '한 화면의 인디고 액센트는 한 곳으로 유지하고 나머지는 회색조로 낮춥니다. 채도가 높은 색은 종이 톤 위에서 튀므로 사용하지 않습니다.'],
              ['작아도 읽혀야 한다', '포스터 위 칩은 12px/700을 사용합니다. 읽히지 않는 정보는 없는 정보와 같습니다.'],
              ['4의 배수', '간격과 반경은 4의 배수만 사용합니다. 감사 스크립트가 이탈을 집계하고 CI가 증가를 막습니다.'],
            ]}
          />
        </div>
      </DocSection>

      <DocSection id="stats" title="현황">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
          <Stat value={tokenCount} label="코드 토큰" />
          <Stat value={manifest.typography.figma.length} label="텍스트 스타일" />
          <Stat value={manifest.components.length} label="프리미티브" />
          <Stat value={`${mapped}/${manifest.components.length}`} label="피그마 연결" />
          <Stat value={manifest.drift.length} label="코드↔피그마 차이" />
        </div>
      </DocSection>

      <DocSection
        id="layers"
        title="토큰 3계층"
        lead="컴포넌트는 2계층(역할)을 사용합니다. 역할 이름으로 값을 참조하면 색을 바꿀 때 한 곳만 고치면 됩니다."
      >
        <DefTable
          rows={[
            [<span key="1">1 · 원시값</span>, <span key="a"><Code>--color-neutral-900</Code> · 피그마 “영화볼지도 색상 - 2.0” — 의미를 담지 않은 순수한 값입니다.</span>],
            [<span key="2">2 · 역할</span>, <span key="b"><Code>--color-text-primary</Code> · 피그마 “영화볼지도 시멘틱 - 2.0” — 역할에 이름을 붙인 층입니다.</span>],
            [<span key="3">3 · 컴포넌트</span>, <span key="c"><Code>--comp-btn-px-md</Code> — 컴포넌트 전용 값입니다.</span>],
          ]}
        />
      </DocSection>

      <DocSection
        id="pipeline"
        title="생성 방식"
        lead="피그마 파일 상태는 Scripter 플러그인이 내보낸 덤프에서 읽습니다. 덤프와 코드에서 매니페스트를 만들고, 이 사이트는 매니페스트를 렌더합니다."
      >
        <DefTable
          rows={[
            ['1 · 덤프', 'Scripter에서 dump-state를 실행하면 변수·텍스트 스타일·컴포넌트 실측이 state.json으로 저장됩니다.'],
            ['2 · 빌드', <Code key="b">npm run ds:build</Code>],
            ['3 · 렌더', <span key="c">이 사이트가 매니페스트를 읽어 그립니다. 컴포넌트 미리보기는 제품 코드를 그대로 import하므로 문서와 제품이 항상 같은 것을 보여줍니다.</span>],
          ]}
        />
      </DocSection>

      <DocSection
        id="drift"
        title="차이 요약"
        lead={<>코드 토큰과 피그마 변수를 이름으로 짝지어 대조한 결과입니다. 자세한 목록은 <Link href="/design-system/drift" style={{ color: 'var(--color-primary-base)' }}>코드 ↔ 피그마 차이</Link>에서 확인할 수 있습니다.</>}
      >
        <DefTable
          rows={[
            ['token-value', `${kinds['token-value'] ?? 0}건 — 같은 이름의 값이 서로 다른 항목입니다.`],
            ['figma-only', `${kinds['figma-only'] ?? 0}건 — 피그마에만 정의된 변수입니다.`],
            ['type-scale', `${kinds['type-scale'] ?? 0}건 — 타입 스케일 밖의 크기입니다.`],
            ['component-unmapped', `${kinds['component-unmapped'] ?? 0}건 — 대응하는 피그마 컴포넌트 세트가 없습니다.`],
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
