import type { ReactNode } from 'react'
import uiBaseline from '../../../../scripts/audit/baseline.json'
import writingBaseline from '../../../../scripts/audit/writing-baseline.json'
import feedbackBaseline from '../../../../scripts/audit/feedback-baseline.json'
import pkg from '../../../../package.json'
import { DocPage, DocSection, SubHeading, DefTable, Code } from '../_ui/shell'

/* CI(.github/workflows/ui-audit.yml)가 PR마다 돌리는 검사를 사람이 읽는 문서로 옮긴다.
   현재 값은 기준선 JSON과 package.json에서 직접 읽는다 — 손으로 적으면 숫자가 곧 어긋난다. */

/* ── 현재 기준선 ─────────────────────────────────────────────────── */

const UI_RISK: Record<string, string> = {
  BUG: '정의되지 않은 var(--토큰) 참조',
  LOSSLESS: '렌더가 같은 무손실 교체 (radius 99 → 9999)',
  LOW: '4배수로 맞추면 2px 이하로 바뀌는 값',
  MED: '4배수로 맞추면 3~4px 바뀌는 값',
  REVIEW: '사람이 판단해야 하는 값 (색 리터럴·좌우 여백 등)',
}
const UI_SUMMARY: Record<string, string> = {
  gutter: '좌우 여백 16px이 아닌 padding 축약',
  color: '색 리터럴 (#hex·rgba·hsl)',
  fontSize: '타입 스케일(--text-*) 밖의 글자 크기',
  asymmetryLR: '좌우 padding·margin이 다른 곳',
  asymmetryTB: '상하 padding·margin이 다른 곳',
  gutterKinds: '쓰이는 좌우 여백 값의 종류 수',
  primitiveAdoptionPct: '공용 컴포넌트 채택률 (%) — 이 값만 내려가면 실패',
}
const WRITING: Record<string, string> = {
  formal: '합니다체 어미 (~습니다·~입니다·~됩니다)',
  attached: '붙여 쓴 보조 용언 (해주세요·해보세요)',
  dataword: '"데이터 … 중" 로딩 문구',
  dots: '말줄임표를 마침표 세 개(...)로 쓴 것',
  doeeoyo: '"되어요" (→ 돼요)',
  booked: '"잡힌 상영" (→ 예정된 상영)',
}
const FEEDBACK: Record<string, string> = {
  navNoProgress: '진행 표시 없이 router.push로 이동하는 곳',
}

/* ── 브라우저 계약 테스트 ─────────────────────────────────────────── */

/** 파일별로 무엇을 지키는지. package.json 스크립트에 새 파일이 생겼는데 여기 없으면 "설명 없음"으로 드러난다. */
const CONTRACTS: Record<string, { guard: string; why: string }> = {
  'src/components/map/mapLayers.browser.test.tsx': {
    guard: '지도 포스터의 호버 팝업이 같은 마커의 코너 칩보다 위에 그려진다',
    why: '마커 내부 겹침 순서(포스터 < 코너 칩 < 호버 팝업)가 부모의 stacking context 때문에 뒤집힌 적이 있다',
  },
  'src/components/navigation/RailPopover.browser.test.tsx': {
    guard: '낮은 창에서도 MY 팝오버 메뉴 행이 줄어들지 않고 마지막 행까지 스크롤된다',
    why: '본문에 flex column을 걸어 메뉴 카드가 축소되고 아래 행이 잘렸다',
  },
  'src/components/primitives/FavoriteToggle.browser.test.tsx': {
    guard: '관심 토글의 상태색·aria-pressed·폭 유지·reduced motion에서 애니메이션 끄기',
    why: '상세 화면마다 따로 만들던 관심 버튼을 FavoriteToggle 하나로 묶으면서, 상태색·폭·모션을 한 곳에서 보장하도록 붙였다',
  },
  'src/lib/navigation/filmsPath.test.ts': {
    guard: '상세 경로에서도 하단 메뉴의 "상영작" 선택이 유지된다',
    why: '대표 영화 주소(/movie/…)가 상영작 영역으로 판정되지 않아 메뉴 선택과 뒤로가기가 어긋났다',
  },
  'src/components/domain/RouteProgressBar.browser.test.ts': {
    guard: '이동 진행 표시가 뜨고 도착하면 사라진다. 모바일은 하단 메뉴 바 바로 위, 데스크톱은 본문 상단',
    why: '리팩터링 중 모바일 위치가 상단으로 바뀌었는데 데스크톱만 검사해서 못 잡았다',
  },
}
const contractFiles = (pkg.scripts['test:ui-contracts'] ?? '').split(/\s+/).filter(t => /\.test\.tsx?$/.test(t))

/* ── 조각 ─────────────────────────────────────────────────────── */

function Value({ n, fail }: { n: number | string; fail?: boolean }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)', whiteSpace: 'nowrap',
      color: fail ? 'var(--color-error)' : 'var(--color-text-primary)',
    }}>{n}</span>
  )
}

/** 항목 이름·설명·현재 기준선 한 줄. 좁은 화면에서도 가로로 넘치지 않게 grid 두 칸. */
function BaselineRows({ rows }: { rows: [key: string, label: string, value: number][] }) {
  return (
    <div>
      {rows.map(([key, label, value]) => (
        <div key={key} style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--spacing-4)',
          alignItems: 'baseline', padding: 'var(--spacing-3) 0', borderTop: '1px solid var(--color-border)',
        }}>
          <div>
            <Code>{key}</Code>
            <div style={{ marginTop: 4, fontSize: 'var(--text-meta)', lineHeight: 1.7, color: 'var(--color-text-sub)' }}>{label}</div>
          </div>
          <Value n={value} />
        </div>
      ))}
    </div>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{
      margin: 0, paddingLeft: '1.1em', listStyle: 'disc',
      fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)',
      display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)',
    }}>
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--spacing-8)' }}>
      <div style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-caption)', marginBottom: 'var(--spacing-3)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

/* ── 페이지 ────────────────────────────────────────────────────── */

export default function ChecksPage() {
  const uiRows = [
    ...Object.entries(uiBaseline.risk).map(([k, v]) => [`risk.${k}`, UI_RISK[k] ?? '설명 없음', v] as [string, string, number]),
    ...Object.entries(uiBaseline.summary).map(([k, v]) => [`summary.${k}`, UI_SUMMARY[k] ?? '설명 없음', v] as [string, string, number]),
  ]
  const writingRows = Object.entries(writingBaseline).map(([k, v]) => [k, WRITING[k] ?? '설명 없음', v] as [string, string, number])
  const feedbackRows = Object.entries(feedbackBaseline).map(([k, v]) => [k, FEEDBACK[k] ?? '설명 없음', v] as [string, string, number])

  return (
    <DocPage
      href="/design-system/checks"
      title="CI 검사"
      lead="PR을 올리면 CI가 네 가지 검사를 돌립니다. 이 문서의 규칙이 코드에 실제로 지켜지는지를 사람이 리뷰로 기억하는 대신 명령어가 확인합니다. 무엇을 세는지, 어떻게 세는지, 왜 그렇게 정했는지를 정리합니다."
    >
      <DocSection
        id="overview"
        title="한눈에"
        lead="워크플로는 .github/workflows/ui-audit.yml 하나이고 잡은 두 개입니다. 감사 세 가지는 Node 내장 모듈만 써서 설치 없이 몇 초 안에 끝나고, 계약 테스트는 실제 Chromium을 띄웁니다."
      >
        <DefTable rows={[
          [<>UI 하드코딩 감사</>, <>
            <Code>npm run audit:ui:check</Code> · 잡 <Code>ui-audit-regression</Code><br />
            토큰 대신 적은 숫자·색, 공용 컴포넌트 대신 쓴 raw 태그를 셉니다.
          </>],
          [<>문구 감사</>, <>
            <Code>npm run audit:writing:check</Code> · 잡 <Code>ui-audit-regression</Code><br />
            화면 문구에서 기계로 판정할 수 있는 라이팅 규범 위반을 셉니다.
          </>],
          [<>누른 뒤 반응 감사</>, <>
            <Code>npm run audit:feedback:check</Code> · 잡 <Code>ui-audit-regression</Code><br />
            눌러도 화면이 바로 안 바뀌는 이동 코드를 셉니다.
          </>],
          [<>브라우저 계약 테스트</>, <>
            <Code>npm run test:ui-contracts</Code> · 잡 <Code>ui-interaction-regression</Code><br />
            겹침·스크롤·위치처럼 코드만 읽어서는 알 수 없는 것을 실제 브라우저에서 잽니다.
          </>],
        ]} />
      </DocSection>

      <DocSection
        id="ratchet"
        title="공통 원리 — 기준선 래칫"
        lead="감사 세 가지는 위반을 0으로 만들라고 요구하지 않습니다. 지금 있는 건수를 기준선(baseline)으로 적어 두고, 그보다 늘어나는 PR만 실패시킵니다. 한 방향으로만 도는 톱니바퀴(ratchet)와 같습니다."
      >
        <Bullets items={[
          <><b style={{ color: 'var(--color-text-primary)' }}>늘면 실패</b> · 새 하드코딩·새 위반이 들어오면 CI가 빨갛게 됩니다. 채택률처럼 높을수록 좋은 값은 내려가면 실패입니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>줄면 기준선을 낮춰 같이 커밋</b> · 통과하면서 &quot;baseline을 낮추라&quot;고 안내합니다. 낮춘 기준선이 다음 PR의 새 한도가 됩니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>기준선을 올려서 통과시키지 않기</b> · 올리는 순간 검사가 아무것도 지키지 못합니다. 늘어난 이유가 정당해 보여도 먼저 토큰·공용 컴포넌트로 풀 수 있는지 봅니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>예외 하나</b> · 여러 호출부를 공용 컴포넌트로 묶으면 채택률의 분자·분모가 같이 줄어 비율이 떨어질 수 있습니다. 코드는 좋아졌는데 지표만 나빠진 경우라, 커밋 메시지에 이유를 적고 기준선을 조정합니다. 관계없는 파일을 고쳐 숫자를 메우지 않습니다.</>,
        ]} />
        <Block title="왜 0이 아니라 래칫인가">
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' }}>
            규칙이 생기기 전에 쓴 코드가 이미 있습니다. 0을 요구하면 규칙을 도입하는 날 모든 PR이 막히고, 결국 검사를 끄게 됩니다.
            래칫은 이미 있는 빚은 그대로 두고 새 빚만 막습니다. 빚을 갚으면 기준선이 내려가 되돌아갈 수 없게 잠깁니다.
          </p>
        </Block>
      </DocSection>

      <DocSection id="ui" title="UI 하드코딩 감사" lead="Foundations에 정한 토큰·스케일을 코드가 지키는지 셉니다.">
        <SubHeading kicker="원리">어떻게 세는가</SubHeading>
        <Bullets items={[
          <><Code>src/</Code>의 .tsx·.ts 파일에서 인라인 스타일 블록(<Code>{'style={{ … }}'}</Code>, <Code>React.CSSProperties</Code> 객체)만 잘라 냅니다. 정규식으로 읽으므로 코드를 실행하지 않습니다.</>,
          <>숫자 리터럴을 규칙과 비교합니다. spacing·radius는 <Code>max(4, round(n/4)*4)</Code>로 4배수에 맞춘 값과, 글자 크기는 가장 가까운 <Code>--text-*</Code> 값과 비교해 차이를 LOW·MED로 나눕니다.</>,
          <>따옴표 안의 <Code>#hex</Code>·<Code>rgba()</Code>·<Code>hsl()</Code>은 모두 색 하드코딩(REVIEW)으로 셉니다. 그림자(<Code>boxShadow</Code>)처럼 문자열 중간에 든 색은 세지 않습니다.</>,
          <>CSS 파일에 정의되지 않은 <Code>var(--이름)</Code>은 BUG입니다. 오타 난 토큰은 브라우저가 조용히 무시해서 눈으로는 잘 안 보입니다.</>,
          <>공용 컴포넌트 채택률은 <Code>{'<Button>'}</Code> 같은 공용 컴포넌트 사용 수 ÷ (공용 + raw <Code>{'<button>'}</Code>·<Code>{'<input>'}</Code> 등)입니다. 공용 컴포넌트 목록은 <Code>primitives/index.ts</Code>의 export에서 자동으로 뽑습니다.</>,
        ]} />
        <Block title="현재 기준선 — scripts/audit/baseline.json">
          <BaselineRows rows={uiRows} />
        </Block>
        <Block title="의도">
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' }}>
            값이 파일마다 따로 적혀 있으면 조금씩 흘러갑니다. 사진 위 어두운 면이 0.45·0.55·0.62·0.72·0.92로 제각각이었던 것이 그 예입니다(2026-09 스크림 토큰으로 정리).
            토큰 한 곳을 고치면 전부 따라오게 하려면, 먼저 토큰 밖에 적힌 값을 셀 수 있어야 합니다.
          </p>
        </Block>
        <Block title="검사하지 않는 곳">
          <Bullets items={[
            <>지도 핀 HTML(<Code>MapPin</Code>·<Code>GvPin</Code>·<Code>subwayUtils</Code>), 온보딩 일러스트, OG 이미지 렌더러(<Code>src/lib/og</Code> — CSS 변수를 못 읽음), 관리자·dev 화면, 이 문서 사이트(<Code>src/app/design-system</Code> — 토큰 값 자체를 전시함)</>,
          ]} />
        </Block>
      </DocSection>

      <DocSection id="writing" title="문구 감사" lead="Foundations › Writing 규범 가운데 기계로 판정할 수 있는 것만 셉니다. 톤·어휘 선택처럼 판단이 필요한 것은 리뷰 몫입니다.">
        <SubHeading kicker="원리">어떻게 세는가</SubHeading>
        <Bullets items={[
          <>코드에서 한글이 든 문자열 리터럴과 JSX 텍스트만 뽑습니다. 주석·식별자는 대상이 아니라 오탐이 거의 없습니다.</>,
          <>뽑은 조각에 항목별 정규식을 겁니다. 예를 들어 합니다체는 조각 끝에서 닫히는 <Code>~습니다</Code>·<Code>~입니다</Code>만 잡습니다.</>,
          <>약관·개인정보, SEO 메타·JSON-LD, 관리자, 서버 알림, 이 문서 사이트(나쁜 예문을 일부러 싣습니다)는 제외합니다. 문어체가 맞는 줄에는 <Code>{'// writing-audit-ignore'}</Code>를 답니다.</>,
        ]} />
        <Block title="현재 기준선 — scripts/audit/writing-baseline.json">
          <BaselineRows rows={writingRows} />
        </Block>
        <Block title="의도">
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' }}>
            어미가 섞이면 화면이 여러 사람이 쓴 것처럼 읽힙니다. 기준선이 모두 0이라 이 검사는 사실상 &quot;새 위반 금지&quot;입니다.
          </p>
        </Block>
      </DocSection>

      <DocSection id="feedback" title="누른 뒤 반응 감사" lead="눌렀는데 화면이 바로 바뀌지 않으면 사람은 다시 누릅니다. 그런 코드를 찾습니다.">
        <SubHeading kicker="원리">어떻게 세는가</SubHeading>
        <Bullets items={[
          <><Code>next/navigation</Code>의 <Code>useRouter()</Code>로 받은 라우터에서 <Code>.push(</Code>를 찾습니다. <Code>useProgressRouter()</Code>로 받은 라우터는 진행 표시가 붙어 있으므로 대상이 아닙니다.</>,
          <>push 앞 240자 안에 <Code>navStart()</Code>나 <Code>startTransition(</Code>이 있으면 반응이 있는 것으로 봅니다. 없으면 한 건입니다.</>,
          <>쿼리만 바꾸는 같은 경로 이동처럼 진행 표시가 필요 없는 곳에는 <Code>feedback-audit-ignore</Code> 주석을 답니다.</>,
        ]} />
        <Block title="현재 기준선 — scripts/audit/feedback-baseline.json">
          <BaselineRows rows={feedbackRows} />
        </Block>
        <Block title="의도">
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' }}>
            2026-09 운영 로그에서 영화제 바로가기가 이동에 2~7초 걸리는 동안 세션마다 3번, 많게는 14번 눌렸습니다.
            원인은 이 바로가기만 공통 진행 표시를 부르지 않은 것이었습니다. 이동을 새로 짤 때는 <Code>useProgressRouter</Code>를 씁니다.
          </p>
        </Block>
      </DocSection>

      <DocSection
        id="contracts"
        title="브라우저 계약 테스트"
        lead="겹침 순서, 스크롤, 요소 위치는 코드를 읽어서는 판정할 수 없습니다. 컴포넌트를 실제 Chromium에 띄워 계산된 스타일과 크기를 잽니다."
      >
        <SubHeading kicker="원리">어떻게 재는가</SubHeading>
        <Bullets items={[
          <>검사할 컴포넌트만 빈 페이지에 올리고 <Code>tokens.css</Code>를 주입합니다. 모양만 보면 되는 것은 정적 HTML로 굽고(<Code>renderToStaticMarkup</Code>), 동작을 봐야 하는 것은 esbuild로 묶어 실행합니다. Next.js 라우터처럼 테스트가 제어해야 하는 부분만 가짜로 바꾸고 나머지는 제품 코드 그대로입니다.</>,
          <><Code>getComputedStyle</Code>·<Code>getBoundingClientRect</Code>로 실제 결과를 확인합니다. 예를 들어 &quot;팝업이 칩 위에 있다&quot;는 두 요소가 겹치는 점에서 맨 위 요소가 무엇인지로 판정합니다.</>,
          <>로컬에서는 <Code>RUN_BROWSER_TESTS=1</Code>일 때만 실행됩니다(<Code>npm run test:ui-contracts</Code>가 켭니다). 평소 <Code>npm test</Code>에서는 건너뜁니다.</>,
        ]} />
        <Block title="지키는 계약">
          <DefTable rows={contractFiles.map(f => {
            const c = CONTRACTS[f]
            return [
              <Code key={f}>{f.split('/').pop()}</Code>,
              c ? <>{c.guard}<br /><span style={{ color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)' }}>계기 — {c.why}</span></> : '설명 없음 — 이 페이지의 CONTRACTS에 추가해 주세요',
            ] as [ReactNode, ReactNode]
          })} />
        </Block>
        <Block title="의도">
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' }}>
            여기 있는 테스트는 대부분 실제로 한 번 어긋났던 동작입니다. 규칙 원본은 <Code>src/design-system/interactionRules.ts</Code>이고, Elevation 문서가 같은 원본을 보여 줍니다.
            그 동작을 바꾸면 이 테스트를 함께 고칩니다.
          </p>
        </Block>
      </DocSection>

      <DocSection id="limits" title="알려진 한계" lead="정규식으로 세는 감사라 합성과 계산을 보지 못합니다. 숫자가 통과해도 아래는 사람이 봐야 합니다.">
        <Bullets items={[
          <><b style={{ color: 'var(--color-text-primary)' }}>gutter 오탐</b> · <Code>{"padding: '4px 8px'"}</Code> 같은 축약을 모두 좌우 여백으로 셉니다. 칩·배지·버튼 안쪽 padding까지 잡혀, 현재 32건 중 실제 화면 좌우 여백은 없습니다. 여기에 <Code>--gutter-sm</Code>을 넣어 숫자를 맞추지 않습니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>식 안의 값은 안 보임</b> · <Code>isDesktop ? 32 : 64 + 24</Code>, <Code>calc(…)</Code>, 템플릿 문자열 속 숫자는 세지 않습니다. 식을 풀어 리터럴이 되는 순간 그동안 가려져 있던 값이 새로 잡힐 수 있습니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>className·CSS 파일은 대부분 대상 밖</b> · 인라인 스타일만 셉니다. CSS 파일에서는 정의되지 않은 <Code>var()</Code>만 봅니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>하단 메뉴 바 비키기</b> · <Code>var(--nav-mobile-offset)</Code> 대신 <Code>64 + 32</Code>를 적어도 잡지 못합니다. 지금은 규칙(Elevation 문서·AGENTS.md)으로만 지킵니다.</>,
          <><b style={{ color: 'var(--color-text-primary)' }}>공용 컴포넌트를 흉내 낸 코드</b> · 장르 칩을 <Code>{'<span style>'}</Code>로 따로 만들면 raw 태그가 아니라서 채택률에 잡히지 않습니다.</>,
        ]} />
      </DocSection>

      <DocSection id="local" title="로컬에서 돌리기">
        <DefTable rows={[
          [<Code key="a">npm run audit:ui</Code>, <>기준선 비교 없이 상세 보고서만 만듭니다. 결과는 <Code>.audit-out/report-v3.md</Code>·<Code>migration.csv</Code>(git 미추적)에 줄 번호와 함께 남습니다.</>],
          [<Code key="b">npm run audit:ui:check</Code>, <>CI와 같은 기준선 비교. 실패하면 늘어난 항목과 차이를 표로 보여 줍니다.</>],
          [<Code key="c">npm run audit:writing:check</Code>, <>실패하면 위반 문구를 파일:줄과 함께 모두 출력합니다.</>],
          [<Code key="d">npm run audit:feedback:check</Code>, <>상세 목록은 <Code>npm run audit:feedback</Code>로 봅니다.</>],
          [<Code key="e">npm run test:ui-contracts</Code>, <>Playwright용 Chromium이 필요합니다.</>],
        ]} />
      </DocSection>
    </DocPage>
  )
}
