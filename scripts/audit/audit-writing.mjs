#!/usr/bin/env node
/**
 * audit-writing.mjs — 라이팅 규범 감사
 *
 *   node scripts/audit/audit-writing.mjs [--json]
 *
 * src의 사용자 노출 코드에서 한글 문자열 리터럴·JSX 텍스트를 뽑아
 * 라이팅 규범(src/design-system/writing.ts) 위반을 센다. 기계로 판정할 수 있는
 * 규칙만 검사한다 — 톤·어휘 선택 같은 판단이 필요한 것은 리뷰 몫이다.
 *
 * 검사 항목 (카테고리 = writing-baseline.json 키):
 *   formal      합니다체 어미 (~습니다/~입니다/~됩니다 등)
 *   attached    붙여 쓴 보조 용언 (해주세요/해보세요/해드릴게요/해드립니다)
 *   dataword    "데이터 …중" 로딩 문구
 *   dots        말줄임표를 마침표 세 개(...)로 쓴 것
 *   doeeoyo     "되어요" (→ 돼요)
 *
 * 제외 (규범이 합니다체·문어체를 허용하는 자리):
 *   약관·개인정보(privacy) · SEO 본문(seo/, JSON-LD·metadata) · 관리자(admin)
 *   문서 사이트(design-system — 나쁜 예문을 일부러 싣는다) · dev 갤러리
 *   서버 전용(api/, discord·monitoring·crawl 알림, scripts/)
 *
 * Node 18+, 의존성 없음. UI 감사(audit-ui-v3)와 같은 결이다.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const SRC = path.join(REPO, 'src')

const EXCLUDE = [
  /src\/app\/design-system\//,
  /src\/scripts\//,            // CLI 출력 — 화면 문구가 아니다
  /src\/lib\/admin\//,         // 관리자·크롤러 오류 메시지
  /src\/lib\/supabase\//,      // 환경 변수 오류 — 개발자용
  /src\/app\/(movie\/)?sitemap\.ts/,
  /src\/lib\/curation\/directorAnniversaries\.ts/, // 기념일 카피 — 의도된 문어체 (큐레이션 부제)
  /src\/design-system\//,
  /src\/app\/dev\//,
  /src\/app\/admin\//,
  /src\/app\/privacy\//,
  /src\/app\/api\//,
  /src\/components\/seo\//,
  /src\/lib\/seo\//,
  /src\/lib\/(userRequests|survey|reports|crawl|monitoring)\/discord/,
  /src\/lib\/crawl\//,
  /src\/lib\/monitoring\//,
  /notify|discord/i,
  /\.test\.|\.spec\./,
]

/* metadata·JSON-LD용 문자열은 화면 문구가 아니다 — description:/answer: 로 시작하는
   generateMetadata 블록까지 구분하려면 파서가 필요해서, 파일 단위로만 거른다.
   페이지 파일의 metadata 문자열이 걸리면 해당 줄에 writing-audit-ignore 주석을 단다. */
const IGNORE_MARK = 'writing-audit-ignore'

const CHECKS = [
  {
    key: 'formal',
    label: '합니다체',
    // 종결 어미가 문자열/태그 끝에서 닫히는 경우만 — "습니다만," 같은 중간 등장도 위반이지만 드물다
    re: /[가-힣](습니다|입니다|됩니다|십시오|합니다)[.!?]?\s*(?=["'`<]|$)/g,
  },
  {
    key: 'attached',
    label: '붙여 쓴 보조 용언',
    re: /[가-힣](해주세요|해보세요|해드릴게요|해드립니다|해주시면|해보시면)/g,
  },
  {
    key: 'dataword',
    label: '"데이터" 로딩 문구',
    re: /데이터[^"'`<]{0,8}중…?/g,
  },
  {
    key: 'dots',
    label: '마침표 세 개(...)',
    re: /[가-힣] ?\.\.\./g,
  },
  {
    key: 'doeeoyo',
    label: '되어요',
    re: /되어요/g,
  },
]

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(ts|tsx)$/.test(e.name)) yield p
  }
}

/** 한글이 든 문자열 리터럴과 JSX 텍스트 조각을 뽑는다. 완전한 파서는 아니지만
 *  검사 대상이 "리터럴 안 한글"이라 주석·식별자 오탐이 거의 없다. */
function koreanChunks(srcText) {
  const chunks = []
  const literal = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g
  let m
  while ((m = literal.exec(srcText))) {
    if (/[가-힣]/.test(m[2])) chunks.push({ text: m[2], index: m.index })
  }
  const jsx = />([^<>{}]*[가-힣][^<>{}]*)</g
  while ((m = jsx.exec(srcText))) {
    chunks.push({ text: m[1], index: m.index })
  }
  return chunks
}

const findings = []
for (const file of walk(SRC)) {
  const rel = path.relative(REPO, file)
  if (EXCLUDE.some(re => re.test(rel.replaceAll('\\', '/')))) continue
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const lineAt = idx => text.slice(0, idx).split('\n').length

  for (const { text: chunk, index } of koreanChunks(text)) {
    const ln = lineAt(index)
    if (lines[ln - 1]?.includes(IGNORE_MARK) || lines[ln - 2]?.includes(IGNORE_MARK)) continue
    for (const c of CHECKS) {
      c.re.lastIndex = 0
      let hit
      while ((hit = c.re.exec(chunk))) {
        findings.push({ category: c.key, file: rel, line: ln, text: chunk.trim().slice(0, 60) })
      }
    }
  }
}

const counts = Object.fromEntries(CHECKS.map(c => [c.key, 0]))
for (const f of findings) counts[f.category]++

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ counts, findings }, null, 2))
} else {
  console.log('▌라이팅 감사 — 규범: src/design-system/writing.ts\n')
  for (const c of CHECKS) console.log(`  ${c.label.padEnd(14)} ${counts[c.key]}`)
  console.log(`\n  합계 ${findings.length}건`)
  for (const f of findings) console.log(`  - [${f.category}] ${f.file}:${f.line} — ${f.text}`)
}

export { counts, findings }
