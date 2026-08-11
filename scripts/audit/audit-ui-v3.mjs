#!/usr/bin/env node
/**
 * audit-ui-v3.mjs — UI 일관성 감사 + 마이그레이션 계획 (READ ONLY)
 *
 *   node audit-ui-v3.mjs <repo-root> [--out <dir>]
 *
 * 스케일 규칙 (2026-07 확정)
 *   spacing/radius : 4배수. target = max(4, round(n/4)*4), 동점은 올림
 *                    (6/10 예외 토큰 폐기 — TASK-10 결정 되돌림)
 *   gutter(좌우여백): 최상위 16px. 중첩 시 16 → 12 → 8
 *   fontSize       : 4배수 아님. 타입 스케일(--text-*) 최근접으로
 *   radius 99      : 9999 (무손실)
 *
 * 산출: report-v3.md / migration.csv / tokens-proposed.css / baseline-v3.json
 * 레포에는 쓰지 않는다.
 */

import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const ROOT = path.resolve(argv[0] ?? '.')
const oi = argv.indexOf('--out')
const OUT = path.resolve(oi > -1 ? argv[oi + 1] : path.join(process.cwd(), 'out'))
if (!fs.existsSync(path.join(ROOT, 'src'))) { console.error(`✗ src/ 없음: ${ROOT}`); process.exit(1) }

/* ── 스케일 규칙 ────────────────────────────────────────────────── */
const snap4 = n => Math.max(4, Math.round(n / 4) * 4)
const GUTTER_TARGET = 16

/* ── 감사 대상 외 ──────────────────────────────────────────────── */
const EXCLUDE = [
  'onboarding/illustrations', 'GvPinSlots', 'GvPin', 'MapPin', 'GvMarkerIcon',
  // src/lib/og: OG 카드 공용 렌더러. satori는 CSS 변수를 못 읽어 토큰을 리터럴로 박아야
  // 한다 — opengraph-image를 제외하는 이유와 같다(렌더러만 모듈로 뺐을 뿐).
  'opengraph-image', 'src/lib/og', 'dev/components', 'src/app/admin', 'subwayUtils',
]
const isExcluded = f => EXCLUDE.some(x => f.includes(x))

/* ── Tailwind v4 기본 테마 ─────────────────────────────────────── */
const TW_FAM = ['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose','slate','gray','zinc','neutral','stone']
const TW = new Set(['color-black','color-white','color-transparent','color-current','color-inherit','font-sans','font-serif','font-mono','spacing','aspect-video'])
for (const f of TW_FAM) for (const s of [50,100,200,300,400,500,600,700,800,900,950]) TW.add(`color-${f}-${s}`)
for (const k of ['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','8xl','9xl']) { TW.add(`text-${k}`); TW.add(`text-${k}--line-height`) }
for (const k of ['thin','extralight','light','normal','medium','semibold','bold','extrabold','black']) TW.add(`font-weight-${k}`)
for (const k of ['tighter','tight','normal','wide','wider','widest']) TW.add(`tracking-${k}`)
for (const k of ['none','tight','snug','normal','relaxed','loose']) TW.add(`leading-${k}`)
for (const k of ['xs','sm','md','lg','xl','2xl','3xl','4xl','none','full']) TW.add(`radius-${k}`)
for (const k of ['2xs','xs','sm','md','lg','xl','2xl','none']) for (const p of ['shadow','inset-shadow','drop-shadow','text-shadow']) TW.add(`${p}-${k}`)
for (const k of ['sm','md','lg','xl','2xl']) TW.add(`breakpoint-${k}`)

/* ── walk ──────────────────────────────────────────────────────── */
const SKIP = new Set(['node_modules','.next','.git','.vercel','dist','build','coverage','public'])
function walk(d, a = []) {
  let e; try { e = fs.readdirSync(d, { withFileTypes: true }) } catch { return a }
  for (const x of e) { if (x.name.startsWith('.')) continue
    const p = path.join(d, x.name)
    if (x.isDirectory()) { if (!SKIP.has(x.name)) walk(p, a) } else a.push(p) }
  return a
}
const all = walk(path.join(ROOT, 'src'))
const rel = f => path.relative(ROOT, f)
const codeAll = all.filter(f => /\.(tsx|jsx|ts|js)$/.test(f) && !/\.(test|spec|d)\./.test(f))
const code = codeAll.filter(f => !isExcluded(rel(f)))
const css = all.filter(f => f.endsWith('.css'))

/* ── 토큰 정의 ─────────────────────────────────────────────────── */
const defined = new Map()
for (const f of css) { const t = fs.readFileSync(f, 'utf8'); const re = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm; let m
  while ((m = re.exec(t))) if (!defined.has(m[1].slice(2))) defined.set(m[1].slice(2), m[2].trim()) }
const FONTSZ = []   // [px, tokenName]
for (const [k, v] of defined) if (/^text-/.test(k) && /^\d+px$/.test(v)) FONTSZ.push([parseFloat(v), k])
FONTSZ.sort((a, b) => a[0] - b[0])
const nearestFont = n => FONTSZ.length ? FONTSZ.reduce((p, c) => Math.abs(c[0] - n) < Math.abs(p[0] - n) ? c : p) : null

/* ── style 블록 ────────────────────────────────────────────────── */
function styleBlocks(txt) {
  const out = []
  for (const [re, close] of [[/style=\{\{/g, 2], [/:\s*React\.CSSProperties\s*=\s*\{/g, 1]]) {
    let m
    while ((m = re.exec(txt))) {
      let i = m.index + m[0].length, d = close; const s = i
      while (i < txt.length && d > 0) { const c = txt[i]; if (c === '{') d++; else if (c === '}') d--; i++ }
      out.push({ start: s, body: txt.slice(s, i - close + 1) })
    }
  }
  return out
}
const lineOf = (t, i) => t.slice(0, i).split('\n').length

function expand(v) {
  const p = v.trim().split(/\s+/); if (!p.length || p.length > 4) return null
  const num = x => x === '0' ? 0 : (/^(-?[\d.]+)px$/.exec(x) ? parseFloat(/^(-?[\d.]+)px$/.exec(x)[1]) : null)
  const n = p.map(num); if (n.some(x => x === null)) return null
  if (n.length === 1) return [n[0], n[0], n[0], n[0]]
  if (n.length === 2) return [n[0], n[1], n[0], n[1]]
  if (n.length === 3) return [n[0], n[1], n[2], n[1]]
  return n
}

/* ── 수집 ──────────────────────────────────────────────────────── */
const SPACING_KEY = /^(gap|rowGap|columnGap|padding(Top|Bottom|Left|Right|Inline|Block)?|margin(Top|Bottom|Left|Right)?)$/
const SIZE_KEY = /^(width|height|min(Width|Height)|max(Width|Height)|top|left|right|bottom|inset|borderWidth)$/
const RADIUS_KEY = /^(borderRadius|border(Top|Bottom)(Left|Right)Radius)$/

const mig = []   // 마이그레이션 항목
const info = []  // 참고 항목
const asym = []
const gutters = new Map()
const adoption = []
const PRIM = /<(Button|IconButton|SortToggle|FilterPill|Card|CardContainer|Badge|Chip|GenreChip|Input|SearchBar|FAB)[\s/>]/g
const RAW = /<(button|input|textarea|select)[\s/>]/g

const push = (cat, f, line, key, from, to, risk, note = '') =>
  mig.push({ cat, file: rel(f), line, key, from: String(from), to: String(to), delta: (Number(to) - Number(from)) || 0, risk, note })

for (const f of code) {
  const txt = fs.readFileSync(f, 'utf8'); const R = rel(f)
  if (/\.(tsx|jsx)$/.test(f) && !R.includes('components/primitives/')) {
    // 프리미티브 정의 파일 자체의 내부 <button>은 채택률 분모에서 제외 — 콜사이트만 측정
    const p = (txt.match(PRIM) || []).length, r = (txt.match(RAW) || []).length
    if (p + r > 0) adoption.push({ file: R, prim: p, raw: r })
  }

  for (const b of styleBlocks(txt)) {
    const box = {}
    const pr = /([a-zA-Z]+)\s*:\s*([^,}\n]+)/g; let p
    while ((p = pr.exec(b.body))) {
      const key = p[1]; const raw = p[2].trim().replace(/,$/, '')
      const ln = lineOf(txt, b.start + p.index)
      const sm = /^(['"])(.+)\1$/.exec(raw)

      /* 축약 문자열 */
      if (sm && /^(padding|margin|inset)$/.test(key)) {
        const e = expand(sm[2]); if (!e) continue
        const [t, r_, bt, l] = e
        const tgt = e.map(x => x <= 0 ? x : snap4(x))
        if (tgt.join() !== e.join()) {
          const [t2, r2, b2, l2] = tgt
          const col = (t2 === r2 && r2 === b2 && b2 === l2) ? [t2]
                    : (t2 === b2 && r2 === l2) ? [t2, r2]
                    : (r2 === l2) ? [t2, r2, b2] : tgt
          push('shorthand', f, ln, key, sm[2], col.map(x => x === 0 ? '0' : x + 'px').join(' '),
               Math.max(...e.map((x, i) => Math.abs(tgt[i] - x))) <= 2 ? 'LOW' : 'MED')
        }
        if (key === 'padding') {
          if (l !== r_) asym.push({ kind: 'LR', file: R, line: ln, key, raw: sm[2], a: l, b: r_ })
          if (t !== bt) asym.push({ kind: 'TB', file: R, line: ln, key, raw: sm[2], a: t, b: bt })
          if (l > 0) { if (!gutters.has(R)) gutters.set(R, new Map()); const g = gutters.get(R); g.set(l, (g.get(l) || 0) + 1)
            if (l !== GUTTER_TARGET) push('gutter', f, ln, key, l, GUTTER_TARGET, 'REVIEW', '좌우여백 — 중첩 깊이 확인 후 16/12/8 중 선택') }
        }
        continue
      }

      /* 숫자 */
      let n = null
      if (/^-?[\d.]+$/.test(raw)) n = parseFloat(raw)
      else if (sm) { const q = /^(-?[\d.]+)px$/.exec(sm[2]); if (q) n = parseFloat(q[1]) }
      if (n === null || n === 0) continue
      box[key] = { n, ln }

      if (RADIUS_KEY.test(key)) {
        if (n === 99 || n === 999) push('radius', f, ln, key, n, 9999, 'LOSSLESS', 'pill 이형 — 렌더 동일')
        else if (n >= 100) info.push({ file: R, line: ln, key, n, note: 'pill' })
        else { const t = snap4(n); if (t !== n) push('radius', f, ln, key, n, t, Math.abs(t - n) <= 2 ? 'LOW' : 'MED') }
      } else if (SPACING_KEY.test(key)) {
        if (n > 0) { const t = snap4(n); if (t !== n) push('spacing', f, ln, key, n, t, Math.abs(t - n) <= 2 ? 'LOW' : 'MED') }
        if (key === 'paddingLeft') { if (!gutters.has(R)) gutters.set(R, new Map()); const g = gutters.get(R); g.set(n, (g.get(n) || 0) + 1) }
      } else if (key === 'fontSize') {
        const nf = nearestFont(n)
        if (nf && nf[0] !== n) push('fontSize', f, ln, key, n, nf[0], Math.abs(nf[0] - n) <= 1 ? 'LOW' : 'REVIEW', `→ --${nf[1]}`)
      } else if (SIZE_KEY.test(key)) {
        const t = snap4(n)
        if (t !== n) info.push({ file: R, line: ln, key, n, note: `4배수 아님 (→${t} 검토)` })
      }
    }
    for (const [a, bk, kind] of [['paddingLeft','paddingRight','LR'],['marginLeft','marginRight','LR'],['paddingTop','paddingBottom','TB'],['marginTop','marginBottom','TB']])
      if (box[a] && box[bk] && box[a].n !== box[bk].n)
        asym.push({ kind, file: R, line: box[a].ln, key: `${a}/${bk}`, raw: `${box[a].n} / ${box[bk].n}`, a: box[a].n, b: box[bk].n })

    const cr = /([a-zA-Z]+)\s*:\s*(['"`])((?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))[^'"`]*)\2/g; let c
    while ((c = cr.exec(b.body))) push('color', f, lineOf(txt, b.start + c.index), c[1], c[3], '(토큰)', 'REVIEW')
  }

  const vr = /var\(\s*--([\w-]+)/g; let v
  while ((v = vr.exec(txt))) if (!defined.has(v[1]))
    push(TW.has(v[1]) ? 'var_tw_only' : 'var_undefined', f, lineOf(txt, v.index), `--${v[1]}`, '(미정의)', '(수정필요)', TW.has(v[1]) ? 'LOW' : 'BUG')
}
for (const f of css) { const t = fs.readFileSync(f, 'utf8'); const vr = /var\(\s*--([\w-]+)/g; let v
  while ((v = vr.exec(t))) if (!defined.has(v[1]) && !TW.has(v[1])) push('var_undefined', f, lineOf(t, v.index), `--${v[1]}`, '(미정의)', '(수정필요)', 'BUG') }

/* ── 집계 ──────────────────────────────────────────────────────── */
const by = {}; for (const m of mig) (by[m.cat] ??= []).push(m)
const tally = (a, fn) => { const m = new Map(); for (const x of a) { const k = fn(x); if (!m.has(k)) m.set(k, { c: 0, f: new Set() }); const e = m.get(k); e.c++; e.f.add(x.file) } return [...m].sort((x, y) => y[1].c - x[1].c) }
const gGutter = new Map(); for (const [, g] of gutters) for (const [px, c] of g) gGutter.set(px, (gGutter.get(px) || 0) + c)
const totP = adoption.reduce((a, x) => a + x.prim, 0), totR = adoption.reduce((a, x) => a + x.raw, 0)

let md = `# UI 일관성 감사 v3 — 4배수 스케일\n\n`
md += `- 대상 \`${ROOT}\` / ${new Date().toISOString()}\n- 스캔 ${code.length}개 (제외 ${codeAll.length - code.length}개)\n`
md += `- 규칙: spacing·radius = \`max(4, round(n/4)*4)\` · gutter = ${GUTTER_TARGET}px · fontSize = 타입 스케일 최근접\n\n`

md += `## 0. 이동 총량\n\n| 분류 | 건수 | LOSSLESS | LOW | MED | REVIEW | BUG |\n|---|---:|---:|---:|---:|---:|---:|\n`
for (const [c, a] of Object.entries(by).sort((x, y) => y[1].length - x[1].length)) {
  const n = r => a.filter(x => x.risk === r).length
  md += `| ${c} | ${a.length} | ${n('LOSSLESS')} | ${n('LOW')} | ${n('MED')} | ${n('REVIEW')} | ${n('BUG')} |\n`
}
md += `\n**착수 순서**: BUG → LOSSLESS → LOW → MED → REVIEW\n`

md += `\n## 1. spacing 이동 (${(by.spacing ?? []).length}건)\n\n| from → to | 건수 |\n|---|---:|\n`
for (const [k, e] of tally(by.spacing ?? [], x => `${x.from} → ${x.to}`)) md += `| ${k} | ${e.c} |\n`

md += `\n## 2. radius 이동 (${(by.radius ?? []).length}건)\n\n| from → to | 건수 | 위험 |\n|---|---:|---|\n`
for (const [k, e] of tally(by.radius ?? [], x => `${x.from} → ${x.to}`)) {
  const r = (by.radius ?? []).find(x => `${x.from} → ${x.to}` === k)?.risk
  md += `| ${k} | ${e.c} | ${r} |\n`
}

md += `\n## 3. 축약 문자열 이동 (${(by.shorthand ?? []).length}건)\n\n| from → to | 건수 |\n|---|---:|\n`
for (const [k, e] of tally(by.shorthand ?? [], x => `\`${x.from}\` → \`${x.to}\``).slice(0, 30)) md += `| ${k} | ${e.c} |\n`

md += `\n## 4. ★ 좌우 여백(gutter)\n\n현재 **${gGutter.size}종** · 목표 ${GUTTER_TARGET}px\n\n| px | 건수 |\n|---:|---:|\n`
for (const [px, c] of [...gGutter].sort((a, b) => b[1] - a[1])) md += `| ${px}${px === GUTTER_TARGET ? ' ✓' : ''} | ${c} |\n`
md += `\n### 한 파일에 gutter 3종 이상\n\n| 파일 | 종 | 값 |\n|---|---:|---|\n`
const multi = [...gutters].filter(([, g]) => g.size >= 3).sort((a, b) => b[1].size - a[1].size)
for (const [f, g] of multi.slice(0, 25)) md += `| ${f} | ${g.size} | ${[...g].sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p}(${c})`).join(' · ')} |\n`

md += `\n## 5. ★ 비대칭 (${asym.length}건)\n\n`
const lr = asym.filter(x => x.kind === 'LR'), tb = asym.filter(x => x.kind === 'TB')
md += `**좌우 ${lr.length}건**\n\n| 파일 | 줄 | 값 |\n|---|---:|---|\n`
for (const x of lr.slice(0, 50)) md += `| ${x.file} | ${x.line} | \`${x.raw}\` |\n`
md += `\n**상하 ${tb.length}건** — ` + tally(tb, x => `${x.a}/${x.b}`).slice(0, 20).map(([k, e]) => `\`${k}\`×${e.c}`).join(' · ') + `\n`

md += `\n## 6. ★ 프리미티브 채택률 — ${(totP * 100 / (totP + totR || 1)).toFixed(1)}% (prim ${totP} / raw ${totR})\n\n| 파일 | raw | prim |\n|---|---:|---:|\n`
for (const x of adoption.filter(x => x.raw >= 3).sort((a, b) => b.raw - a.raw).slice(0, 25)) md += `| ${x.file} | ${x.raw} | ${x.prim} |\n`

md += `\n## 7. 확정 버그 — 미정의 var() (${(by.var_undefined ?? []).length}건)\n\n| 변수 | 건수 | 위치 |\n|---|---:|---|\n`
for (const [k, e] of tally(by.var_undefined ?? [], x => x.key)) md += `| \`${k}\` | ${e.c} | ${[...e.f].slice(0, 4).join(', ')} |\n`

md += `\n## 8. fontSize (${(by.fontSize ?? []).length}건)\n\n| from → to | 건수 | 토큰 |\n|---|---:|---|\n`
for (const [k, e] of tally(by.fontSize ?? [], x => `${x.from} → ${x.to}`)) {
  const note = (by.fontSize ?? []).find(x => `${x.from} → ${x.to}` === k)?.note ?? ''
  md += `| ${k} | ${e.c} | ${note} |\n`
}

md += `\n## 9. 파일별 이동량 (상위 30)\n\n| 파일 | 건수 |\n|---|---:|\n`
for (const [f, e] of tally(mig.filter(x => x.risk !== 'REVIEW'), x => x.file).slice(0, 30)) md += `| ${f} | ${e.c} |\n`

/* 신규 tokens 제안 */
const proposed = `/* ── spacing (4배수 전용 — 6px·10px 예외 토큰 폐기) ── */
--spacing-1:  4px;
--spacing-2:  8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;

/* ── radius (4배수 · 역할 기반 이름) ──
   ⚠ 기존 --radius-sm/md/lg/xl/2xl 은 전부 삭제한다.
   같은 이름에 다른 값을 넣으면(예: --radius-lg 8→12) 기존 참조부가
   조용히 바뀐다. 이름을 갈아서 미변환 참조가 눈에 띄게 만드는 쪽이 안전.
   부수효과: Tailwind v4 --radius-* 네임스페이스 충돌도 함께 해소됨. */
--radius-badge:    4px;   /* 배지·라벨·인디케이터        ← 1,2,3,5 흡수 */
--radius-poster:   8px;   /* 포스터·썸네일               ← 6,9 흡수 */
--radius-control: 12px;   /* 버튼·입력·칩·카드           ← 10,11,13 흡수 (최대 이동) */
--radius-popover: 16px;   /* 드롭다운·팝오버·모달        ← 14,17,18 흡수 */
--radius-sheet:   20px;   /* 바텀시트 */
--radius-pill:  9999px;   /* pill                        ← 99 흡수 (무손실) */

/* ── layout ── */
--gutter:     16px;    /* 최상위 좌우 여백. 중첩 시 12 → 8 */
--gutter-md:  12px;
--gutter-sm:   8px;

/* 삭제 대상
   --spacing-1-5(6px), --spacing-2-5(10px)          4배수 위반
   --radius-sm/md/lg/xl/2xl/full                    역할 기반으로 교체
   --color-primary-hover-d/-subtle-d/-text-d        미사용(다크모드는 오버라이드 방식)
   --text-h1, --comp-pin-*, --transition-fast 등    미사용 확인 후 판단 */
`

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'report-v3.md'), md)
fs.writeFileSync(path.join(OUT, 'tokens-proposed.css'), proposed)
const esc = s => `"${String(s).replace(/"/g, '""')}"`
fs.writeFileSync(path.join(OUT, 'migration.csv'),
  ['risk,cat,file,line,key,from,to,delta,note', ...mig
    .sort((a, b) => ['BUG','LOSSLESS','LOW','MED','REVIEW'].indexOf(a.risk) - ['BUG','LOSSLESS','LOW','MED','REVIEW'].indexOf(b.risk) || a.file.localeCompare(b.file) || a.line - b.line)
    .map(m => [m.risk, m.cat, m.file, m.line, m.key, m.from, m.to, m.delta, m.note].map(esc).join(','))].join('\n'))
fs.writeFileSync(path.join(OUT, 'asymmetry.csv'),
  ['kind,file,line,key,a,b,raw', ...asym.map(x => [x.kind, x.file, x.line, x.key, x.a, x.b, x.raw].map(esc).join(','))].join('\n'))
fs.writeFileSync(path.join(OUT, 'baseline-v3.json'), JSON.stringify({
  ...Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])),
  asymmetryLR: lr.length, asymmetryTB: tb.length,
  gutterKinds: gGutter.size, primitiveAdoptionPct: +(totP * 100 / (totP + totR || 1)).toFixed(1),
}, null, 2))

const risk = r => mig.filter(x => x.risk === r).length
console.log(`\n▌UI 감사 v3 (4배수) — ${ROOT}`)
console.log(`  스캔 ${code.length}개 (제외 ${codeAll.length - code.length}개)\n`)
console.log(`  BUG      미정의 var()          ${String(risk('BUG')).padStart(5)}`)
console.log(`  LOSSLESS 무손실 (99→9999)      ${String(risk('LOSSLESS')).padStart(5)}`)
console.log(`  LOW      ±2px 이하             ${String(risk('LOW')).padStart(5)}`)
console.log(`  MED      ±3~4px                ${String(risk('MED')).padStart(5)}`)
console.log(`  REVIEW   판단 필요             ${String(risk('REVIEW')).padStart(5)}`)
console.log(`  ─────────────────────────────────────`)
console.log(`  ★ 좌우여백 종류               ${String(gGutter.size).padStart(5)}종`)
console.log(`  ★ gutter 3종+ 파일            ${String(multi.length).padStart(5)}개`)
console.log(`  ★ 좌우 비대칭                 ${String(lr.length).padStart(5)}건`)
console.log(`  ★ 상하 비대칭                 ${String(tb.length).padStart(5)}건`)
console.log(`  ★ 프리미티브 채택률           ${String((totP * 100 / (totP + totR || 1)).toFixed(1)).padStart(5)}%`)
console.log(`\n  → ${path.join(OUT, 'migration.csv')}   ← 서브에이전트 작업지시서`)
console.log(`  → ${path.join(OUT, 'report-v3.md')}`)
console.log(`  → ${path.join(OUT, 'tokens-proposed.css')}\n`)
