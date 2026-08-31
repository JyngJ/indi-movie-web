/** AI 코딩 도구용 텍스트 덤프.
 *
 *  llms.txt 관례(llmstxt.org)를 따른다 — 루트에 색인을 두고, 문맥 창 크기에 맞춰
 *  나눠 받을 수 있게 주제별 파일을 함께 제공한다(Chakra UI·Mintlify와 같은 방식).
 *  사람이 읽는 페이지와 같은 매니페스트에서 만들기 때문에 값이 어긋날 수 없다. */
import { manifest } from './index'
import { GUIDES, hasPlayground } from './guides'
import { WRITING_RULES_SHORT, VOICE, SECTIONS } from './writing'

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
  '관심(하트)은 포스터 우상단 오버레이 토글 하나로 표시한다. 텍스트 칩·빨간 테두리로 대신 표시하지 않는다.',
]

export function llmsIndex() {
  const lines = [
    header('영화볼지도 디자인 시스템', '전국 독립·예술영화관 상영 정보 서비스의 디자인 시스템. 토큰·컴포넌트 값은 코드(tokens.css)와 피그마 덤프에서 생성한다.'),
    '\n## 파일',
    `- [전체](${BASE}/llms-full.txt): 토큰 · 타이포그래피 · 컴포넌트 · 라이팅 · 규칙 전부`,
    `- [토큰](${BASE}/llms-tokens.txt): 색 · 타이포 · 간격 · 반경 · 그림자`,
    `- [컴포넌트](${BASE}/llms-components.txt): 프리미티브 ${manifest.components.length}종의 Props · 배리언트 · 사용 규칙`,
    `- [라이팅](${BASE}/llms-writing.txt): 화면 문구 규칙 — 어미 · 표기 · 자리별 문구 · 용어`,
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
      // 대안(instead)까지 실어야 금지가 막다른 길이 되지 않는다.
      for (const u of guide.usage) {
        out.push(`- ${u.kind.toUpperCase()}: ${u.rule}${u.instead ? ` → 대신: ${u.instead}` : ''}`)
      }
    }

    if (guide?.a11y?.length) {
      out.push('\n### Accessibility')
      for (const a of guide.a11y) out.push(`- ${a.title}: ${a.desc}`)
    }

    if (guide?.changes?.length) {
      out.push('\n### 변경')
      for (const ch of guide.changes) out.push(`- ${ch.date}: ${ch.note}`)
    }

    if (hasPlayground(c.name)) out.push(`\n조작 가능한 예시: ${BASE}/components/${c.name}#state`)
  }
  return out.join('\n') + '\n'
}

export function llmsWriting() {
  const out = [header('영화볼지도 라이팅 규칙', '화면에 적히는 한국어 문구의 약속. 제품 화면은 해요체 하나, 한 줄에 한 가지.')]
  out.push('\n## 한 줄 규칙\n', ...WRITING_RULES_SHORT.map(r => `- ${r}`))
  out.push('\n## 원칙\n', ...VOICE.map(v => `- ${v.title}: ${v.desc} (예: "${v.sample}")`))
  for (const sec of SECTIONS) {
    out.push(`\n## ${sec.title}\n\n> ${sec.lead}\n`)
    for (const r of sec.rules) {
      out.push(`### ${r.title}\n${r.rule}`)
      if (r.why) out.push(`왜: ${r.why}`)
      for (const [k, v] of r.table ?? []) out.push(`- ${k}: ${v}`)
      // 예문은 good/bad 쌍으로 — 금지만 적으면 갈 곳을 잃는다.
      for (const ex of r.examples ?? []) out.push(`- O ${ex.good}${ex.bad ? `  /  X ${ex.bad}` : ''}`)
      out.push('')
    }
  }
  out.push(`사람이 보는 문서: ${BASE}/foundations/writing`)
  return out.join('\n') + '\n'
}

export function llmsFull() {
  return [
    header('영화볼지도 디자인 시스템 — 전체', '토큰 · 타이포그래피 · 컴포넌트 · 라이팅 · 규칙을 한 파일에 담았다.'),
    '\n## 규칙\n',
    ...RULES.map(r => `- ${r}`),
    '\n' + llmsTokens().split('\n').slice(4).join('\n'),
    '\n' + llmsComponents().split('\n').slice(4).join('\n'),
    '\n' + llmsWriting().split('\n').slice(4).join('\n'),
  ].join('\n')
}
