#!/usr/bin/env node
/**
 * check-regression.mjs — UI 감사 회귀 게이트
 *
 *   node scripts/audit/check-regression.mjs
 *
 * audit-ui-v3.mjs를 실행하고 결과를 scripts/audit/baseline.json과 비교한다.
 *   - risk 카운트(BUG/LOSSLESS/LOW/MED/REVIEW): 증가 → 실패
 *   - summary 카운트(gutter/color/fontSize/asymmetryLR/asymmetryTB/gutterKinds): 증가 → 실패
 *   - primitiveAdoptionPct: 감소 → 실패 (채택률은 높을수록 좋다)
 *   - 개선(감소/증가)된 값은 baseline을 갱신하라고 안내 (exit 0)
 *
 * 절대 baseline을 올려서 통과시키지 말 것. Node 18+, 의존성 없음.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const OUT = path.join(REPO, '.audit-out')
const BASELINE = JSON.parse(fs.readFileSync(path.join(HERE, 'baseline.json'), 'utf8'))

/* 1. 감사 실행 */
execFileSync(process.execPath, [path.join(HERE, 'audit-ui-v3.mjs'), REPO, '--out', OUT], { stdio: 'inherit' })

/* 2. migration.csv → risk별 카운트 */
const csv = fs.readFileSync(path.join(OUT, 'migration.csv'), 'utf8').trim().split('\n').slice(1)
const risk = { BUG: 0, LOSSLESS: 0, LOW: 0, MED: 0, REVIEW: 0 }
for (const line of csv) {
  const r = /^"([^"]*)"/.exec(line)?.[1]
  if (r in risk) risk[r]++
}

/* 3. baseline-v3.json → summary */
const summary = JSON.parse(fs.readFileSync(path.join(OUT, 'baseline-v3.json'), 'utf8'))

/* 4. 비교 */
const rows = []   // { name, base, cur, dir: 'max'|'min' }
for (const k of Object.keys(BASELINE.risk)) rows.push({ name: `risk.${k}`, base: BASELINE.risk[k], cur: risk[k] ?? 0, dir: 'max' })
for (const [k, base] of Object.entries(BASELINE.summary)) {
  const dir = k === 'primitiveAdoptionPct' ? 'min' : 'max'
  rows.push({ name: `summary.${k}`, base, cur: summary[k] ?? 0, dir })
}

const fails = rows.filter(r => r.dir === 'max' ? r.cur > r.base : r.cur < r.base)
const improved = rows.filter(r => r.dir === 'max' ? r.cur < r.base : r.cur > r.base)

const pad = (s, n) => String(s).padStart(n)
const table = list => {
  console.log(`  ${'항목'.padEnd(28)}${pad('baseline', 10)}${pad('current', 10)}${pad('Δ', 8)}`)
  for (const r of list) console.log(`  ${r.name.padEnd(28)}${pad(r.base, 10)}${pad(r.cur, 10)}${pad((r.cur - r.base > 0 ? '+' : '') + +(r.cur - r.base).toFixed(1), 8)}`)
}

console.log(`\n▌UI 감사 회귀 체크 — baseline: scripts/audit/baseline.json\n`)

if (fails.length) {
  console.log(`✗ 회귀 발견 (${fails.length}건) — 아래 항목이 baseline보다 나빠졌다:\n`)
  table(fails)
  console.log(`\n  하드코딩된 값 대신 디자인 토큰을 사용할 것 (AGENTS.md "UI Design Audit" 참고).`)
  console.log(`  상세: .audit-out/migration.csv · .audit-out/report-v3.md`)
  console.log(`  baseline을 올려서 통과시키지 말 것.\n`)
  process.exit(1)
}

if (improved.length) {
  console.log(`✓ 통과 — 개선된 항목 ${improved.length}건. baseline을 낮춰서 같이 커밋하자:\n`)
  table(improved)
  console.log()
} else {
  console.log(`✓ 통과 — baseline과 동일.\n`)
}
