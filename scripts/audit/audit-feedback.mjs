#!/usr/bin/env node
/**
 * audit-feedback.mjs — 누른 뒤 반응이 안 보이는 코드 감사
 *
 *   node scripts/audit/audit-feedback.mjs [--json]
 *
 * 사람은 눌러서 화면이 바로 안 바뀌면 다시 누른다. 2026-09 운영 로그에서 영화제 바로가기가
 * 이동에 2~7초 걸리는 동안 세션마다 3번씩(최대 14번) 눌렸는데, 원인은 이 바로가기만 공통
 * 진행 막대(navStart)를 부르지 않은 것이었다(#376). 그런 코드를 기계로 찾는다.
 *
 * 검사 항목 (카테고리 = feedback-baseline.json 키):
 *   navNoProgress  next/navigation의 useRouter()로 router.push(...)를 부르는데,
 *                  같은 핸들러 안(앞 240자)에 navStart()도 startTransition(...)도 없는 곳.
 *                  → useProgressRouter()를 쓰거나, push 직전에 navStart()를 부르거나,
 *                    usePendingNavItem처럼 useTransition으로 누른 요소에 대기 표시를 띄울 것.
 *
 * 한계 — 정규식이라 합성을 모른다. push를 감싼 헬퍼(usePendingNavItem 등)는 헬퍼 쪽 한 곳만
 * 잡힌다. 같은 경로로의 push(쿼리만 바꿈)는 진행 막대가 필요 없는데 구분하지 못한다 —
 * 그 줄에 `feedback-audit-ignore` 주석을 단다.
 *
 * Node 18+, 의존성 없음. UI·라이팅 감사와 같은 결이다.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const SRC = path.join(REPO, 'src')

const EXCLUDE = [
  /src\/app\/admin\//,        // 관리자 화면 — 사용자 동선이 아니다
  /src\/app\/dev\//,
  /src\/app\/design-system\//,
  /src\/design-system\//,
  /src\/hooks\/useProgressRouter\.ts$/, // 진행 막대를 붙이는 쪽 자신
  /\.test\.|\.spec\./,
]
const IGNORE_MARK = 'feedback-audit-ignore'
const LOOKBACK = 240
const IGNORE_LOOKBACK_LINES = 6

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) out.push(p)
  }
  return out
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

/** next/navigation의 useRouter()에 묶인 변수 이름들 — useProgressRouter()로 받은 이름은 빠진다 */
function plainRouterNames(text) {
  if (!/from ['"]next\/navigation['"]/.test(text) || !/\buseRouter\b/.test(text)) return []
  const names = new Set()
  for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*useRouter\(\)/g)) names.add(m[1])
  return [...names]
}

export function auditFeedback() {
  const findings = []
  for (const file of walk(SRC)) {
    const rel = path.relative(REPO, file).split(path.sep).join('/')
    if (EXCLUDE.some((re) => re.test(rel))) continue
    const text = fs.readFileSync(file, 'utf8')
    const lines = text.split('\n')

    for (const name of plainRouterNames(text)) {
      const re = new RegExp(`\\b${name}\\.push\\(`, 'g')
      for (const m of text.matchAll(re)) {
        const before = text.slice(Math.max(0, m.index - LOOKBACK), m.index)
        // 진행 막대(navStart) 또는 useTransition 대기 표시가 있으면 반응이 있는 것으로 본다
        if (/\bnavStart\(\)|\bstartTransition\(/.test(before)) continue
        const line = lineOf(text, m.index)
        // 무시 표시는 그 줄이나 바로 위 몇 줄(JSX 주석·여러 줄 props) 안에 있으면 된다
        if (lines.slice(Math.max(0, line - 1 - IGNORE_LOOKBACK_LINES), line).some((l) => l.includes(IGNORE_MARK))) continue
        findings.push({
          category: 'navNoProgress',
          file: rel,
          line,
          text: lines[line - 1].trim().slice(0, 120),
        })
      }
    }
  }
  const counts = { navNoProgress: 0 }
  for (const f of findings) counts[f.category] = (counts[f.category] ?? 0) + 1
  return { counts, findings }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const result = auditFeedback()
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result))
  } else {
    console.log('▌누른 뒤 반응 감사\n')
    for (const [k, v] of Object.entries(result.counts)) console.log(`  ${k.padEnd(14)} ${v}`)
    console.log('')
    for (const f of result.findings) console.log(`  - [${f.category}] ${f.file}:${f.line} — ${f.text}`)
  }
}
