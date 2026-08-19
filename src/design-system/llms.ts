/** AI 코딩 도구용 텍스트 덤프.
 *
 *  llms.txt 관례(llmstxt.org)를 따른다 — 루트에 색인을 두고, 문맥 창 크기에 맞춰
 *  나눠 받을 수 있게 주제별 파일을 함께 제공한다(Chakra UI·Mintlify와 같은 방식).
 *  사람이 읽는 페이지와 같은 매니페스트에서 만들기 때문에 값이 어긋날 수 없다. */
import { manifest } from './index'
import { GUIDES, hasPlayground } from './guides'

const BASE = '/design-system'

const header = (title: string, summary: string) =>
  `# ${title}\n\n> ${summary}\n\n생성: ${manifest.generatedAt.slice(0, 10)} · 피그마 덤프: ${manifest.figmaDumpAt?.slice(0, 10) ?? '없음'}\n`

const RULES = [
  '값은 tokens.css에서 관리한다. 컴포넌트에 값을 직접 적으면 UI 감사에서 하드코딩으로 집계된다.',
  '컴포넌트는 역할 토큰(2계층: --color-text-primary)을 쓴다. 원시 토큰(--color-neutral-900)은 램프를 전시하는 자리에서만 쓴다.',
  '간격·반경은 4의 배수만 쓴다. 좌우 여백은 중첩 깊이에 따라 --gutter(16) → --gutter-md(12) → --gutter-sm(8).',
  '타입 스케일은 10 · 12 · 14 · 16 · 20 · 24 여섯 단계뿐이다. 새 크기를 만들지 않는다.',
  '반경은 역할 이름을 쓴다 — radius/poster(2) · button(8) · control(12) · popover(16) · sheet(20) · pill(9999).',
  '그림자는 2겹(direct + ambient)이고 색은 웜 브라운(#140F0A)이다. 순검정·1겹 그림자를 새로 만들지 않는다.',
  '라이트 단일 테마다. 다크 모드 대응 코드를 넣지 않는다.',
  '포스터 좌하단은 순위 표기 전용이다. 오버레이 칩을 그 자리에 두지 않는다.',
]

export function llmsIndex() {
  const lines = [
    header('영화볼지도 디자인 시스템', '전국 독립·예술영화관 상영 정보 서비스의 디자인 시스템. 토큰·컴포넌트 값은 코드(tokens.css)와 피그마 덤프에서 생성한다.'),
    '\n## 파일',
    `- [전체](${BASE}/llms-full.txt): 토큰 · 타이포그래피 · 컴포넌트 · 규칙 전부`,
    `- [토큰](${BASE}/llms-tokens.txt): 색 · 타이포 · 간격 · 반경 · 그림자`,
    `- [컴포넌트](${BASE}/llms-components.txt): 프리미티브 ${manifest.components.length}종의 Props · 배리언트 · 사용 규칙`,
    '\n## 규칙',
    ...RULES.map(r => `- ${r}`),
    `\n## 사람이 보는 문서\n- ${BASE}`,
  ]
  return lines.join('\n') + '\n'
}

export function llmsTokens() {
  const out = [header('영화볼지도 디자인 토큰', 'src/styles/tokens.css에서 생성. 값 옆 설명은 CSS 주석 그대로다.')]

  for (const group of manifest.tokenGroups) {
    out.push(`\n## ${group.title}\n`)
    for (const t of group.tokens) {
      const figma = t.figma ? ` [피그마 ${t.figma.name}]` : ''
      const note = t.comment ? ` — ${t.comment}` : ''
      out.push(`- ${t.name}: ${t.resolved}${t.value !== t.resolved ? ` (${t.value})` : ''}${figma}${note}`)
    }
  }

  out.push('\n## 텍스트 스타일 (피그마)\n')
  for (const s of manifest.typography.figma) {
    out.push(`- ${s.name}: ${s.font} · ${s.size}px · lh ${s.lineHeight}`)
  }
  return out.join('\n') + '\n'
}

export function llmsComponents() {
  const out = [header('영화볼지도 컴포넌트', 'src/components/primitives의 프리미티브. Props는 TypeScript 타입에서, 배리언트 실측은 피그마 덤프에서 뽑았다.')]

  for (const c of manifest.components) {
    const guide = GUIDES[c.name]
    out.push(`\n## ${c.name}\n`)
    out.push(`파일: ${c.file}`)
    if (guide?.intro) out.push(`\n${guide.intro}`)

    if (c.props.length) {
      out.push('\n### Props')
      for (const p of c.props) {
        const def = p.default ? ` = ${p.default}` : ''
        const doc = p.doc ? ` — ${p.doc}` : ''
        out.push(`- ${p.name}${p.optional ? '?' : ''}: ${p.type}${def}${doc}`)
      }
    }

    if (c.figma) {
      const axes = Object.entries(c.figma.axes).map(([k, v]) => `${k}(${v.join('|')})`).join(' · ')
      out.push(`\n### 피그마\n- 세트: ${c.figma.name}`)
      if (axes) out.push(`- 축: ${axes}`)
      const sample = c.figma.variants[0]
      if (sample) {
        out.push(`- 실측 예: ${Object.entries(sample.props).map(([k, v]) => `${k}=${v}`).join(', ')} → ${sample.w != null ? `${Math.round(sample.w)}×${Math.round(sample.h ?? 0)}` : '—'}${sample.radius != null ? ` · r${sample.radius}` : ''}${sample.pad ? ` · pad ${sample.pad.join(' ')}` : ''}`)
      }
    }

    if (guide?.specs?.length) {
      out.push('\n### Spec')
      for (const s of guide.specs) out.push(`- ${s.title}: ${s.desc}`)
    }

    if (guide?.usage?.length) {
      out.push('\n### Usage')
      for (const u of guide.usage) out.push(`- ${u.kind === 'do' ? 'DO' : "DON'T"}: ${u.rule}`)
    }

    if (hasPlayground(c.name)) out.push(`\n조작 가능한 예시: ${BASE}/components/${c.name}#state`)
  }
  return out.join('\n') + '\n'
}

export function llmsFull() {
  return [
    header('영화볼지도 디자인 시스템 — 전체', '토큰 · 타이포그래피 · 컴포넌트 · 규칙을 한 파일에 담았다.'),
    '\n## 규칙\n',
    ...RULES.map(r => `- ${r}`),
    '\n' + llmsTokens().split('\n').slice(4).join('\n'),
    '\n' + llmsComponents().split('\n').slice(4).join('\n'),
  ].join('\n')
}
