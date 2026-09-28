import type { ReactNode } from 'react'
import uiBaseline from '../../../../scripts/audit/baseline.json'
import writingBaseline from '../../../../scripts/audit/writing-baseline.json'
import feedbackBaseline from '../../../../scripts/audit/feedback-baseline.json'
import pkg from '../../../../package.json'
import { DocPage, DocSection, DefTable, Code } from '../_ui/shell'

/* CI(.github/workflows/ui-audit.yml)가 PR마다 돌리는 검사를 사람이 읽는 문서로 옮긴다.
   현재 값은 기준선 JSON과 package.json에서 직접 읽는다. 손으로 적으면 숫자가 곧 어긋난다. */

/* ── 항목 설명 ────────────────────────────────────────────────────── */

const UI_RISK: Record<string, string> = {
  BUG: '없는 토큰을 가리키는 var()',
  LOSSLESS: '바꿔도 화면이 똑같은 값 (radius 99를 9999로)',
  LOW: '4배수로 맞추면 2px 안쪽으로 움직이는 값',
  MED: '4배수로 맞추면 3~4px 움직이는 값',
  REVIEW: '사람이 보고 정해야 하는 값. 색과 좌우 여백이 여기 들어갑니다',
}
const UI_SUMMARY: Record<string, string> = {
  gutter: '좌우 여백이 16px이 아닌 padding',
  color: '토큰 대신 직접 적은 색',
  fontSize: '타입 스케일에 없는 글자 크기',
  asymmetryLR: '왼쪽과 오른쪽 여백이 다른 곳',
  asymmetryTB: '위와 아래 여백이 다른 곳',
  gutterKinds: '좌우 여백으로 쓰는 값이 몇 가지인지',
  primitiveAdoptionPct: '공용 컴포넌트를 쓰는 비율(%). 이 값은 내려가면 실패합니다',
}
const WRITING: Record<string, string> = {
  formal: '합니다체로 끝나는 문구',
  attached: '"해주세요"처럼 붙여 쓴 말',
  dataword: '"데이터 불러오는 중" 같은 로딩 문구',
  dots: '말줄임표를 점 세 개로 쓴 것',
  doeeoyo: '"돼요"가 아니라 "되어요"',
  booked: '"예정된 상영" 대신 "잡힌 상영"',
}
const FEEDBACK: Record<string, string> = {
  navNoProgress: '진행 표시 없이 다른 화면으로 넘기는 곳',
}

/* ── 브라우저 계약 테스트 ─────────────────────────────────────────── */

/** 파일별로 무엇을 지키는지. package.json 스크립트에 새 파일이 생겼는데 여기 없으면 "설명 없음"으로 드러난다. */
const CONTRACTS: Record<string, { guard: string; why: string }> = {
  'src/components/map/mapLayers.browser.test.tsx': {
    guard: '지도 포스터에 마우스를 올리면 뜨는 팝업이 모서리 칩에 가리지 않는지',
    why: '부모 요소가 겹침 순서를 가둬서, 팝업이 칩 밑으로 들어간 적이 있습니다.',
  },
  'src/components/navigation/RailPopover.browser.test.tsx': {
    guard: '창이 낮아도 MY 메뉴가 찌그러지지 않고 끝까지 스크롤되는지',
    why: '본문에 flex column이 걸려 메뉴 카드가 눌리고 아래 행이 잘렸습니다.',
  },
  'src/components/primitives/FavoriteToggle.browser.test.tsx': {
    guard: '관심 버튼이 켜고 끌 때 색과 폭을 지키고, 모션을 줄이는 설정에선 애니메이션을 끄는지',
    why: '화면마다 따로 있던 관심 버튼을 하나로 합치면서, 합친 버튼이 이 셋을 책임지게 했습니다.',
  },
  'src/lib/navigation/filmsPath.test.ts': {
    guard: '영화·극장·감독 상세에 들어가도 하단 메뉴에 "상영작"이 켜져 있는지',
    why: '/movie/… 주소를 상영작 영역으로 치지 않아서 메뉴 표시와 뒤로가기가 엇나갔습니다.',
  },
  'src/components/domain/RouteProgressBar.browser.test.ts': {
    guard: '화면을 넘길 때 로딩 바가 뜨고, 모바일에선 하단 메뉴 바 바로 위에 붙는지',
    why: '정리하다가 모바일 로딩 바가 화면 맨 위로 올라갔습니다. 데스크톱만 검사하고 있어서 몰랐습니다.',
  },
}
const contractFiles = (pkg.scripts['test:ui-contracts'] ?? '').split(/\s+/).filter(t => /\.test\.tsx?$/.test(t))

/* ── 조각 ─────────────────────────────────────────────────────── */

const text = { margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' } as const

function P({ children }: { children: ReactNode }) {
  return <p style={{ ...text, marginTop: 'var(--spacing-4)' }}>{children}</p>
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)', color: 'var(--color-text-primary)' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{
      ...text, paddingLeft: '1.1em', listStyle: 'disc',
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
      lead="규칙을 문서에 적어 두는 것만으로는 부족합니다. 혼자 만들다 보면 급할 때 숫자를 그냥 적게 되고, 나중에 보면 기억나지 않습니다. 그래서 PR을 올릴 때마다 CI가 코드를 한 번 훑어보게 했습니다. 이 페이지는 그 검사들이 무엇을 보고, 왜 그렇게 만들었는지 설명합니다."
    >
      <DocSection
        id="overview"
        title="네 가지 검사"
        lead="셋은 코드를 글자로 읽어 개수를 세고, 하나는 브라우저를 직접 띄워 봅니다. 세는 쪽은 설치 없이 몇 초면 끝나고, 브라우저 쪽은 1분쯤 걸립니다."
      >
        <DefTable rows={[
          ['UI 하드코딩 감사', <>토큰을 두고 숫자나 색을 직접 적은 곳을 셉니다.<br /><Code>npm run audit:ui:check</Code></>],
          ['문구 감사', <>화면 문구가 라이팅 규칙을 어긴 곳을 셉니다.<br /><Code>npm run audit:writing:check</Code></>],
          ['누른 뒤 반응 감사', <>눌러도 한동안 아무 반응이 없는 이동을 셉니다.<br /><Code>npm run audit:feedback:check</Code></>],
          ['브라우저 계약 테스트', <>겹침, 스크롤, 위치를 실제 화면에서 잽니다.<br /><Code>npm run test:ui-contracts</Code></>],
        ]} />
      </DocSection>

      <DocSection id="ratchet" title="숫자가 늘면 실패합니다">
        <P>
          세는 검사 셋은 0을 요구하지 않습니다. 규칙이 생기기 전에 쓴 코드가 이미 있기 때문입니다.
          0을 요구하면 검사를 켜는 날부터 모든 PR이 막히고, 그러면 결국 검사를 끄게 됩니다.
        </P>
        <P>
          대신 지금 몇 건인지를 기준선으로 적어 둡니다. PR이 그 숫자를 넘기면 실패하고, 넘기지 않으면 통과합니다.
          이미 있는 빚은 봐주고 새 빚만 막는 셈입니다.
        </P>
        <P>
          숫자를 줄였다면 기준선도 같이 내려서 커밋합니다. 그러면 다음 PR부터는 줄어든 숫자가 한도가 되고, 다시 늘어날 수 없습니다.
          반대로 기준선을 올려서 통과시키는 일은 하지 않습니다. 한 번 올리기 시작하면 검사가 아무것도 막지 못합니다.
        </P>
        <P>
          예외가 하나 있습니다. 비슷한 코드를 공용 컴포넌트 하나로 합치면 채택률이 오히려 내려갈 때가 있습니다.
          분모와 분자가 같이 줄어서 생기는 일입니다. 코드는 나아졌는데 숫자만 나빠진 것이니, 커밋 메시지에 이유를 적고 기준선을 고칩니다.
          숫자를 맞추려고 상관없는 파일을 손대지는 않습니다.
        </P>
      </DocSection>

      <DocSection id="ui" title="UI 하드코딩 감사" lead="Foundations에서 정한 토큰과 간격 규칙을 코드가 지키고 있는지 봅니다.">
        <Block title="세는 방법">
          <Bullets items={[
            <>인라인 스타일(<Code>{'style={{ … }}'}</Code>)만 읽습니다. 코드를 실행하지 않고 글자 그대로 봅니다.</>,
            <>간격과 모서리 둥글기는 4의 배수여야 합니다. 벗어난 값은 4의 배수로 맞췄을 때 얼마나 움직이는지에 따라 LOW와 MED로 나눕니다. 글자 크기는 타입 스케일에서 가장 가까운 값과 비교합니다.</>,
            <>값이 <Code>#</Code>나 <Code>rgba(</Code>로 시작하면 색을 직접 적은 것으로 봅니다. 그림자처럼 색이 문자열 중간에 섞인 값은 세지 않습니다.</>,
            <>없는 토큰을 가리키는 <Code>var()</Code>는 BUG로 셉니다. 토큰 이름에 오타가 나면 브라우저가 아무 말 없이 무시해서, 눈으로는 찾기 어렵습니다.</>,
            <>공용 컴포넌트 채택률은 <Code>{'<Button>'}</Code> 같은 공용 컴포넌트와 그냥 <Code>{'<button>'}</Code>을 쓴 횟수를 비교한 값입니다. 공용 컴포넌트 목록은 <Code>primitives/index.ts</Code>에서 알아서 가져옵니다.</>,
          ]} />
        </Block>
        <Block title="지금 기준선">
          <BaselineRows rows={uiRows} />
        </Block>
        <Block title="왜 세나">
          <p style={text}>
            같은 값을 여러 파일에 따로 적어 두면 조금씩 달라집니다. 사진 위에 까는 어두운 면이 파일마다 0.45, 0.62, 0.72, 0.92로 제각각이었던 게 그런 경우입니다.
            토큰 하나만 고치면 전부 따라오게 하려면, 먼저 토큰 밖에 적힌 값이 어디 있는지 알아야 합니다.
          </p>
        </Block>
        <Block title="보지 않는 곳">
          <p style={text}>
            지도 핀과 온보딩 일러스트, 공유 이미지(OG), 관리자와 개발용 화면, 그리고 이 문서 사이트는 빼고 셉니다.
            공유 이미지는 CSS 변수를 읽지 못해서 값을 직접 적어야 하고, 이 사이트는 토큰 값 자체를 보여 주는 곳이라 그렇습니다.
          </p>
        </Block>
      </DocSection>

      <DocSection id="writing" title="문구 감사" lead="라이팅 규칙 가운데 기계가 확실히 판단할 수 있는 것만 봅니다. 말투가 어울리는지, 단어를 잘 골랐는지는 여전히 사람이 봐야 합니다.">
        <Block title="세는 방법">
          <Bullets items={[
            <>코드에서 한글이 들어 있는 문자열과 화면에 찍히는 텍스트만 꺼냅니다. 주석이나 변수 이름은 보지 않습니다.</>,
            <>꺼낸 문구마다 규칙별 패턴을 대 봅니다. 합니다체라면 문구가 &quot;~습니다&quot;나 &quot;~입니다&quot;로 끝나는지를 봅니다.</>,
            <>약관, 개인정보 처리방침, 검색엔진용 설명, 관리자 화면은 뺍니다. 여기는 문어체가 맞는 자리입니다. 그 밖에 문어체가 꼭 필요한 줄에는 <Code>{'// writing-audit-ignore'}</Code>를 달아 둡니다.</>,
          ]} />
        </Block>
        <Block title="지금 기준선">
          <BaselineRows rows={writingRows} />
        </Block>
        <Block title="왜 세나">
          <p style={text}>
            어미가 섞이면 여러 사람이 나눠 쓴 화면처럼 읽힙니다. 지금은 전부 0이라, 사실상 새로 어기지 말라는 검사입니다.
          </p>
        </Block>
      </DocSection>

      <DocSection id="feedback" title="누른 뒤 반응 감사" lead="눌렀는데 화면이 그대로면 사람은 한 번 더 누릅니다. 그렇게 만드는 코드를 찾습니다.">
        <Block title="세는 방법">
          <Bullets items={[
            <>Next.js의 <Code>router.push</Code>로 화면을 넘기는 곳을 찾습니다.</>,
            <>바로 앞에서 로딩 바를 띄우거나(<Code>navStart()</Code>) 대기 표시를 켜면(<Code>startTransition</Code>) 괜찮은 것으로 봅니다. 둘 다 없으면 한 건입니다.</>,
            <>로딩 바를 이미 붙여 둔 <Code>useProgressRouter</Code>를 쓰면 처음부터 세지 않습니다.</>,
            <>같은 화면에서 주소 뒤의 조건만 바꾸는 이동처럼 로딩 바가 필요 없는 곳에는 <Code>feedback-audit-ignore</Code>를 달아 둡니다.</>,
          ]} />
        </Block>
        <Block title="지금 기준선">
          <BaselineRows rows={feedbackRows} />
        </Block>
        <Block title="왜 세나">
          <p style={text}>
            2026년 9월 기록을 보니, 영화제 바로가기를 누르고 화면이 넘어가기까지 2~7초가 걸리는 동안 한 번 들어온 사람이 세 번씩, 많게는 열네 번까지 눌렀습니다.
            다른 이동에는 다 있는 로딩 바가 이 버튼에만 빠져 있었습니다. 앞으로 이동을 새로 만들 때는 <Code>useProgressRouter</Code>를 쓰면 됩니다.
          </p>
        </Block>
      </DocSection>

      <DocSection
        id="contracts"
        title="브라우저 계약 테스트"
        lead="무엇이 무엇 위에 그려지는지, 끝까지 스크롤되는지, 어디에 붙는지는 코드만 읽어서는 알 수 없습니다. 그래서 컴포넌트를 실제 브라우저에 띄워 놓고 잽니다."
      >
        <Block title="재는 방법">
          <Bullets items={[
            <>검사할 컴포넌트 하나만 빈 페이지에 올리고 토큰을 입힙니다. 모양만 보면 되는 건 HTML로 한 번 그려 두고, 움직임을 봐야 하는 건 실제로 실행합니다.</>,
            <>Next.js 라우터처럼 테스트가 직접 쥐고 있어야 하는 부분만 가짜로 바꾸고, 나머지는 제품 코드를 그대로 씁니다.</>,
            <>결과는 브라우저가 실제로 계산한 스타일과 크기로 판단합니다. 팝업이 칩 위에 있는지 볼 때는 둘이 겹치는 지점을 찍어서 맨 위에 무엇이 있는지 확인합니다.</>,
            <>평소 <Code>npm test</Code>에서는 건너뛰고, <Code>npm run test:ui-contracts</Code>로 돌릴 때만 실행됩니다.</>,
          ]} />
        </Block>
        <Block title="지키는 것">
          <DefTable rows={contractFiles.map(f => {
            const c = CONTRACTS[f]
            return [
              <Code key={f}>{f.split('/').pop()}</Code>,
              c ? <>{c.guard}<br /><span style={{ color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)' }}>{c.why}</span></> : '설명 없음. 이 페이지의 CONTRACTS에 추가해 주세요',
            ] as [ReactNode, ReactNode]
          })} />
        </Block>
        <Block title="왜 있나">
          <p style={text}>
            여기 있는 테스트는 대부분 한 번 실제로 어긋난 뒤에 생겼습니다. 같은 일이 두 번 일어나지 않게 하려는 것입니다.
            규칙은 <Code>src/design-system/interactionRules.ts</Code>에 적혀 있고, Elevation 문서도 같은 내용을 보여 줍니다. 이 동작을 바꿀 때는 테스트도 같이 고칩니다.
          </p>
        </Block>
      </DocSection>

      <DocSection id="limits" title="검사가 놓치는 것" lead="세는 검사는 코드를 글자로만 읽습니다. 계산식 안의 값이나 컴포넌트를 조합한 결과는 보지 못합니다. 그래서 숫자가 통과해도 아래는 따로 봐야 합니다.">
        <Bullets items={[
          <>좌우 여백(gutter)은 실제보다 많이 셉니다. 칩이나 버튼 안쪽 여백까지 좌우 여백으로 치기 때문입니다. 지금 32건은 전부 이런 경우고, 화면 가장자리 여백은 한 건도 없습니다. 숫자를 줄이겠다고 여기에 <Code>--gutter-sm</Code>을 넣지는 않습니다.</>,
          <><Code>isDesktop ? 32 : 88</Code>처럼 조건이나 계산식 안에 든 숫자는 세지 않습니다. 그래서 식을 풀어 쓰면, 그동안 가려져 있던 값이 갑자기 잡히기도 합니다.</>,
          <>인라인 스타일만 봅니다. className과 CSS 파일 속 값은 거의 보지 않습니다.</>,
          <>하단 메뉴 바를 피할 때 <Code>var(--nav-mobile-offset)</Code> 대신 64를 직접 더해도 잡지 못합니다. 지금은 문서에 적힌 규칙으로만 막고 있습니다.</>,
          <>공용 컴포넌트를 쓰지 않고 <Code>{'<span>'}</Code>으로 비슷하게 만들어도 채택률에는 드러나지 않습니다. 장르 칩이 그렇게 네 번 따로 만들어져 있습니다.</>,
        ]} />
      </DocSection>

      <DocSection id="local" title="내 컴퓨터에서 돌려 보기" lead="CI에서 실패했다면 같은 명령을 돌려 보면 어디가 문제인지 나옵니다.">
        <DefTable rows={[
          [<Code key="a">npm run audit:ui</Code>, <>기준선과 비교하지 않고 전체 목록만 뽑습니다. <Code>.audit-out/</Code> 폴더에 파일과 줄 번호가 남습니다.</>],
          [<Code key="b">npm run audit:ui:check</Code>, <>CI와 똑같이 기준선과 비교합니다. 실패하면 어떤 항목이 몇 건 늘었는지 보여 줍니다.</>],
          [<Code key="c">npm run audit:writing:check</Code>, <>실패하면 걸린 문구를 파일과 줄 번호까지 다 보여 줍니다.</>],
          [<Code key="d">npm run audit:feedback:check</Code>, <>걸린 곳 목록은 <Code>npm run audit:feedback</Code>으로 봅니다.</>],
          [<Code key="e">npm run test:ui-contracts</Code>, <>Playwright용 Chromium이 깔려 있어야 합니다.</>],
        ]} />
      </DocSection>
    </DocPage>
  )
}
