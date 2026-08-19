import Link from 'next/link'
import { manifest } from '@/design-system'
import { Page, Section, Stat, Code, Table } from './_ui/shell'

export default function OverviewPage() {
  const tokenCount = manifest.tokenGroups.reduce((n, g) => n + g.tokens.length, 0)
  const mapped = manifest.components.filter(c => c.figmaSet).length
  const driftByKind = manifest.drift.reduce<Record<string, number>>((a, d) => {
    a[d.kind] = (a[d.kind] ?? 0) + 1
    return a
  }, {})

  return (
    <Page
      title="영화볼지도 디자인 시스템"
      lead={
        <>
          한국 독립·예술영화 상영정보 서비스의 디자인 시스템. 이 문서는 손으로 쓰지 않는다 —
          <Code>src/styles/tokens.css</Code>와 피그마 파일 덤프에서 값을 긁어 만든다.
          그래서 코드·시안이 어긋나면 <Link href="/design-system/drift" style={{ color: 'var(--color-primary-base)' }}>차이 페이지</Link>에 자동으로 쌓인다.
        </>
      }
    >
      <Section title="현황">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
          <Stat value={tokenCount} label="코드 토큰" />
          <Stat value={manifest.typography.figma.length} label="피그마 텍스트 스타일" />
          <Stat value={manifest.components.length} label="프리미티브" />
          <Stat value={`${mapped}/${manifest.components.length}`} label="피그마 세트 연결" />
          <Stat value={manifest.drift.length} label="코드↔피그마 차이" />
        </div>
      </Section>

      <Section
        title="토큰 3계층"
        note="컴포넌트를 만들 때는 2계층(역할)을 쓴다. 1계층을 직접 물리면 색을 바꿀 때 쓰인 곳을 하나씩 찾아다녀야 한다. 피그마도 같은 3계층으로 나뉜다."
      >
        <Table
          head={['계층', '코드', '피그마', '예']}
          rows={[
            ['1 · 원시값', <Code key="a">--color-neutral-900</Code>, '영화볼지도 색상 - 2.0', '순수한 값. 의미 없음'],
            ['2 · 역할', <Code key="b">--color-text-primary</Code>, '영화볼지도 시멘틱 - 2.0', '역할에 이름을 붙인다'],
            ['3 · 컴포넌트', <Code key="c">--comp-btn-px-md</Code>, '컴포넌트 세트 내부', '컴포넌트 전용 값'],
          ]}
        />
      </Section>

      <Section
        title="이 문서가 만들어지는 방법"
        note="피그마 무료 플랜의 MCP 한도를 피하려고, 피그마 상태는 Scripter 플러그인이 로컬로 쏜 덤프에서 읽는다."
      >
        <Table
          head={['단계', '무엇', '명령']}
          rows={[
            ['1', '피그마 파일 전체 덤프(변수·스타일·컴포넌트 실측)', 'Scripter에서 dump-state 실행'],
            ['2', '토큰·Props·배리언트를 긁어 매니페스트 생성', <Code key="d">npm run ds:build</Code>],
            ['3', '이 사이트가 매니페스트만 읽고 렌더', <Code key="e">/design-system</Code>],
          ]}
        />
        <p style={{ marginTop: 'var(--spacing-4)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.7 }}>
          컴포넌트 미리보기는 스크린샷이 아니라 제품이 쓰는 그 컴포넌트를 그대로 import해 렌더한다.
          문서용 사본을 따로 두면 그 사본이 넷째 진실이 되어 곧 낡는다.
        </p>
      </Section>

      <Section title="차이 요약">
        <Table
          head={['종류', '개수', '뜻']}
          rows={[
            ['figma-only', String(driftByKind['figma-only'] ?? 0), '피그마에만 있는 변수 — 코드에 아직 안 내려온 값'],
            ['token-value', String(driftByKind['token-value'] ?? 0), '같은 이름인데 값이 다름 — 즉시 고칠 것'],
            ['type-scale', String(driftByKind['type-scale'] ?? 0), '2.0 타입 스케일 밖의 크기'],
            ['component-unmapped', String(driftByKind['component-unmapped'] ?? 0), '피그마 컴포넌트 세트가 없는 코드 컴포넌트'],
          ]}
        />
      </Section>
    </Page>
  )
}
