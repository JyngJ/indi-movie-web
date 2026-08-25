import { manifest } from '@/design-system'
import { DocPage, DocSection, Code, DefTable } from '../_ui/shell'

/** AI 코딩 도구용 안내. 파일은 /design-system/llms*.txt 라우트가 매니페스트에서 생성한다. */

const FILES = [
  {
    href: '/design-system/llms.txt',
    name: 'llms.txt',
    desc: '색인과 핵심 규칙입니다. 이 파일을 먼저 읽히면 나머지 위치를 찾아갑니다.',
    size: '약 1.6KB',
  },
  {
    href: '/design-system/llms-tokens.txt',
    name: 'llms-tokens.txt',
    desc: '토큰 전수입니다. 값과 설명, 피그마 변수 대응을 담습니다.',
    size: '약 14KB',
  },
  {
    href: '/design-system/llms-components.txt',
    name: 'llms-components.txt',
    desc: "프리미티브의 Props, 피그마 배리언트 실측, Do/Don't를 담습니다.",
    size: '약 18KB',
  },
  {
    href: '/design-system/llms-writing.txt',
    name: 'llms-writing.txt',
    desc: '화면 문구 규칙입니다. 어미·표기·자리별 문구·용어를 예문과 함께 담습니다.',
    size: '약 9KB',
  },
  {
    href: '/design-system/llms-full.txt',
    name: 'llms-full.txt',
    desc: '위 내용을 한 파일로 합친 것입니다. 문맥 창이 넉넉할 때 사용합니다.',
    size: '약 33KB',
  },
]

export default function AiPage() {
  return (
    <DocPage
      href="/design-system/ai"
      title="AI Collaboration"
      lead="Cursor·Claude Code 같은 도구가 이 디자인 시스템을 그대로 따르도록 텍스트 덤프를 제공합니다. 사람이 보는 페이지와 같은 매니페스트에서 생성하므로 값이 어긋나지 않습니다."
    >
      <DocSection
        id="files"
        title="파일"
        lead="llms.txt 관례를 따릅니다 — 색인 한 장과 주제별 파일을 함께 두어 문맥 창 크기에 맞게 골라 받게 합니다."
      >
        <DefTable
          rows={FILES.map(f => [
            <a key={f.name} href={f.href} style={{ color: 'var(--color-primary-base)', textDecoration: 'none', fontWeight: 700 }}>
              {f.name}
            </a>,
            <span key="d">
              {f.desc}
              <span style={{ color: 'var(--color-text-placeholder)' }}> · {f.size}</span>
            </span>,
          ])}
        />
      </DocSection>

      <DocSection id="how" title="쓰는 법">
        <DefTable
          rows={[
            ['Claude Code · Cursor', <span key="a">프로젝트 규칙 파일(<Code>CLAUDE.md</Code> · <Code>.cursorrules</Code>)에 <Code>llms.txt</Code> 주소를 적어 두면 작업을 시작할 때 함께 읽습니다.</span>],
            ['한 번만 물릴 때', <span key="b">대화 첫머리에 <Code>llms-full.txt</Code> 내용을 붙여 넣습니다.</span>],
            ['문맥이 빠듯할 때', <span key="c">고칠 대상에 맞춰 <Code>llms-tokens.txt</Code> <Code>llms-components.txt</Code> 또는 <Code>llms-writing.txt</Code>만 넣습니다.</span>],
          ]}
        />
      </DocSection>

      <DocSection id="contents" title="담기는 것" lead="문서 페이지와 같은 소스에서 뽑습니다.">
        <DefTable
          rows={[
            ['토큰', `${manifest.tokenGroups.reduce((n, g) => n + g.tokens.length, 0)}개 — 이름 · 값 · tokens.css 주석 · 피그마 변수 대응`],
            ['컴포넌트', `${manifest.components.length}종 — Props(TypeScript 추출) · 배리언트 축과 실측 · Spec · Do/Don't`],
            ['규칙', '4배수 간격, 타입 스케일 6단계, 역할 기반 반경, 2겹 그림자, 라이트 단일 테마, 포스터 좌하단 순위 전용 등'],
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
