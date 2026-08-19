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
      lead="전국 독립·예술영화관 상영 정보를 지도에서 보여주는 서비스의 디자인 시스템. 종이 같은 미색 배경 위에 흰 카드를 올리고, 인디고 하나로 행동을 가리키는 것이 전부다. 이 문서는 손으로 쓰지 않는다 — 코드와 피그마에서 생성한다."
      toc={[
        { id: 'principles', label: '원칙' },
        { id: 'stats', label: '현황' },
        { id: 'layers', label: '토큰 3계층' },
        { id: 'pipeline', label: '생성 방식' },
        { id: 'drift', label: '차이 요약' },
      ]}
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
              ['종이 위의 정보', '배경은 미색(#FAF9F8), 카드는 흰색. 층은 색 대비로 만들고 그림자는 정말 떠 있을 때만 쓴다.'],
              ['강조는 하나', '한 화면에 인디고 액센트는 한 곳. 나머지는 회색조로 내린다. 형광 계열은 2.0에서 전부 강등했다.'],
              ['작아도 읽혀야 한다', '포스터 위 칩은 10px에서 12px/700으로 키웠다. 읽히지 않는 정보는 없는 정보다.'],
              ['4의 배수', '간격·반경은 4배수만. 감사 스크립트가 이탈을 카운트하고 CI가 증가를 막는다.'],
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
        lead="컴포넌트를 만들 때는 2계층(역할)을 쓴다. 1계층을 직접 물리면 색을 바꿀 때 쓰인 곳을 하나씩 찾아다녀야 한다."
      >
        <DefTable
          rows={[
            [<span key="1">1 · 원시값</span>, <span key="a"><Code>--color-neutral-900</Code> · 피그마 “영화볼지도 색상 - 2.0” — 순수한 값, 의미 없음</span>],
            [<span key="2">2 · 역할</span>, <span key="b"><Code>--color-text-primary</Code> · 피그마 “영화볼지도 시멘틱 - 2.0” — 역할에 이름을 붙인다</span>],
            [<span key="3">3 · 컴포넌트</span>, <span key="c"><Code>--comp-btn-px-md</Code> — 컴포넌트 전용 값</span>],
          ]}
        />
      </DocSection>

      <DocSection
        id="pipeline"
        title="생성 방식"
        lead="피그마 상태는 Scripter 플러그인이 로컬로 쏜 덤프에서 읽는다(MCP 한도 우회). 그 덤프와 코드에서 매니페스트를 만들고, 이 사이트는 매니페스트만 렌더한다."
      >
        <DefTable
          rows={[
            ['1 · 덤프', 'Scripter에서 dump-state 실행 → state.json (변수·텍스트 스타일·컴포넌트 실측)'],
            ['2 · 빌드', <Code key="b">npm run ds:build</Code>],
            ['3 · 렌더', <span key="c">이 사이트. 컴포넌트 미리보기는 제품 코드를 그대로 import한다 — 문서용 사본을 두면 그 사본이 넷째 진실이 된다.</span>],
          ]}
        />
      </DocSection>

      <DocSection
        id="drift"
        title="차이 요약"
        lead={<>자세한 목록은 <Link href="/design-system/drift" style={{ color: 'var(--color-primary-base)' }}>코드 ↔ 피그마 차이</Link>에 있다.</>}
      >
        <DefTable
          rows={[
            ['token-value', `${kinds['token-value'] ?? 0}건 — 같은 이름인데 값이 다름. 0이어야 한다`],
            ['figma-only', `${kinds['figma-only'] ?? 0}건 — 피그마에만 있는 변수`],
            ['type-scale', `${kinds['type-scale'] ?? 0}건 — 2.0 타입 스케일 밖 크기`],
            ['component-unmapped', `${kinds['component-unmapped'] ?? 0}건 — 피그마 컴포넌트 세트 없음`],
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
