#!/usr/bin/env node
/**
 * check-writing.mjs — 라이팅 회귀 게이트
 *
 *   node scripts/audit/check-writing.mjs
 *
 * audit-writing.mjs를 실행하고 카테고리별 카운트를 writing-baseline.json과 비교한다.
 *   - 카운트 증가 → 실패 (신규 위반)
 *   - 감소 → baseline을 낮춰 같이 커밋하라고 안내 (exit 0)
 * 절대 baseline을 올려서 통과시키지 말 것 — UI 감사(check-regression)와 같은 규칙.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BASELINE = JSON.parse(fs.readFileSync(path.join(HERE, 'writing-baseline.json'), 'utf8'))

const out = execFileSync(process.execPath, [path.join(HERE, 'audit-writing.mjs'), '--json'], { encoding: 'utf8' })
const { counts, findings } = JSON.parse(out)

console.log('▌라이팅 회귀 체크 — baseline: scripts/audit/writing-baseline.json\n')
let fail = false, improved = false
for (const [k, base] of Object.entries(BASELINE)) {
  const now = counts[k] ?? 0
  const mark = now > base ? '✗' : now < base ? '↓' : '·'
  console.log(`  ${mark} ${k.padEnd(10)} ${base} → ${now}`)
  if (now > base) fail = true
  if (now < base) improved = true
}

if (fail) {
  console.log('\n✗ 실패 — 새 라이팅 위반. 문구를 규범(/design-system/foundations/writing)에 맞출 것:')
  for (const f of findings) console.log(`  - [${f.category}] ${f.file}:${f.line} — ${f.text}`)
  process.exit(1)
}
if (improved) console.log('\n✓ 통과 — 개선됨. writing-baseline.json을 낮춰서 같이 커밋할 것.')
else console.log('\n✓ 통과 — baseline과 동일.')
