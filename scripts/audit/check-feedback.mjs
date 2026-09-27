#!/usr/bin/env node
/**
 * check-feedback.mjs — 누른 뒤 반응 회귀 게이트
 *
 *   node scripts/audit/check-feedback.mjs
 *
 * audit-feedback.mjs를 실행하고 카테고리별 카운트를 feedback-baseline.json과 비교한다.
 *   - 카운트 증가 → 실패 (진행 표시 없이 화면을 옮기는 새 코드)
 *   - 감소 → baseline을 낮춰 같이 커밋하라고 안내 (exit 0)
 * 절대 baseline을 올려서 통과시키지 말 것 — UI·라이팅 감사와 같은 규칙.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditFeedback } from './audit-feedback.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BASELINE = JSON.parse(fs.readFileSync(path.join(HERE, 'feedback-baseline.json'), 'utf8'))
const { counts, findings } = auditFeedback()

console.log('▌누른 뒤 반응 회귀 체크 — baseline: scripts/audit/feedback-baseline.json\n')
let fail = false, improved = false
for (const [k, base] of Object.entries(BASELINE)) {
  const now = counts[k] ?? 0
  const mark = now > base ? '✗' : now < base ? '↓' : '·'
  console.log(`  ${mark} ${k.padEnd(14)} ${base} → ${now}`)
  if (now > base) fail = true
  if (now < base) improved = true
}

if (fail) {
  console.log('\n✗ 실패 — 진행 표시 없이 화면을 옮기는 코드가 늘었다.')
  console.log('  useProgressRouter()를 쓰거나 push 직전에 navStart()를 부를 것.')
  console.log('  같은 경로로 쿼리만 바꾸는 push면 그 줄 위에 feedback-audit-ignore 주석과 이유를 단다.\n')
  for (const f of findings) console.log(`  - [${f.category}] ${f.file}:${f.line} — ${f.text}`)
  process.exit(1)
}
if (improved) console.log('\n✓ 통과 — 개선됨. feedback-baseline.json을 낮춰서 같이 커밋할 것.')
else console.log('\n✓ 통과 — baseline과 동일.')
