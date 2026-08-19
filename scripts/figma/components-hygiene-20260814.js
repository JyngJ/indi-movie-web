// 07 · 컴포넌트 위생 정리 (2026-08-14)
//
//  덤프 실측 감사에서 나온 것만 고친다. 추정으로 바꾸는 건 없다.
//    1) 텍스트 스타일 미바인딩 5종 8건 → 폰트·크기가 정확히 일치하는 2.0 스타일에 바인딩
//    2) 색 미바인딩 28건 → 2.0 변수에 hex가 정확히 일치할 때만 바인딩
//    3) 구 컬렉션 변수 19건 → 2.0에 같은 hex가 있을 때만 이관, 없으면 리포트만
//    4) TheaterHeader gap 6 → 8 (4배수 규칙)
//
//  DRY_RUN = true 로 두면 아무것도 안 고치고 리포트만 낸다. 먼저 이걸로 확인할 것.
// Scripter에서 Run.

const DRY_RUN = true

const report = []
const log = (s) => report.push(s)

/* ── 대상 찾기 ─────────────────────────────────────────────── */
const page = figma.root.children.find(p => p.name === 'Design System fixed')
if (!page) { figma.notify('페이지 "Design System fixed" 없음'); throw new Error('page') }
await page.loadAsync()

const section = page.findOne(n => n.type === 'SECTION' && n.name.includes('컴포넌트'))
if (!section) { figma.notify('섹션 "07 · 컴포넌트" 없음'); throw new Error('section') }

/* ── 2.0 색 변수: hex → variable ───────────────────────────── */
const byHex = new Map()
const varById = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (!v || v.resolvedType !== 'COLOR') continue
    varById.set(v.id, { v, col: col.name })
    if (!col.name.includes('2.0')) continue
    const modeId = col.defaultModeId
    const val = v.valuesByMode[modeId]
    if (!val || typeof val !== 'object' || val.type === 'VARIABLE_ALIAS') continue
    const hex = '#' + [val.r, val.g, val.b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
    if (!byHex.has(hex)) byHex.set(hex, v)
  }
}
log(`2.0 색 변수 ${byHex.size}개 로드`)

/* ── 텍스트 스타일: "폰트/크기" → style ────────────────────── */
const styles = await figma.getLocalTextStylesAsync()
const styleByKey = new Map()
for (const s of styles) {
  if (!s.name.startsWith('2.0/')) continue
  const key = `${s.fontName.family}/${s.fontName.style}@${s.fontSize}`
  if (!styleByKey.has(key)) styleByKey.set(key, s)
}
log(`2.0 텍스트 스타일 ${styleByKey.size}종 로드`)

const paintHex = (p) => (p && p.type === 'SOLID')
  ? '#' + [p.color.r, p.color.g, p.color.b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
  : null

/* ── 순회 ─────────────────────────────────────────────────── */
const nodes = section.findAll(() => true)
log(`대상 노드 ${nodes.length}개`)

let fixedText = 0, fixedFill = 0, migrated = 0, fixedGap = 0
const skipped = []

for (const n of nodes) {
  /* 1) 텍스트 스타일 */
  if (n.type === 'TEXT' && !n.textStyleId && n.fontName !== figma.mixed && n.fontSize !== figma.mixed) {
    const key = `${n.fontName.family}/${n.fontName.style}@${n.fontSize}`
    const st = styleByKey.get(key)
    if (st) {
      if (!DRY_RUN) { await figma.loadFontAsync(n.fontName); await n.setTextStyleIdAsync(st.id) }
      fixedText++
      log(`  [텍스트] "${n.characters.slice(0, 14)}" ${key} → ${st.name}`)
    } else {
      skipped.push(`텍스트 스타일 없음: "${n.characters.slice(0, 14)}" ${key}`)
    }
  }

  /* 2·3) 채움·선 색 */
  for (const key of ['fills', 'strokes']) {
    if (!(key in n) || n[key] === figma.mixed || !n[key].length) continue
    let changed = false
    const next = n[key].map(p => {
      if (p.type !== 'SOLID') return p
      /* 안 보이는 채움은 건드리지 않는다 — 덤프엔 남지만 렌더엔 없다 */
      if (p.visible === false) return p
      const hex = paintHex(p)
      const bound = p.boundVariables && p.boundVariables.color
      if (bound) {
        const info = varById.get(bound.id)
        if (info && info.col.includes('2.0')) return p          // 이미 2.0
        const target = byHex.get(hex)
        if (!target) { skipped.push(`구 컬렉션인데 2.0 대응 없음: ${hex} (${n.name})`); return p }
        changed = true; migrated++
        log(`  [구변수→2.0] ${n.name} ${hex} → ${target.name}`)
        return figma.variables.setBoundVariableForPaint(p, 'color', target)
      }
      const target = byHex.get(hex)
      if (!target) { skipped.push(`변수 대응 없음: ${hex} (${n.name})`); return p }
      changed = true; fixedFill++
      log(`  [색바인딩] ${n.name} ${hex} → ${target.name}`)
      return figma.variables.setBoundVariableForPaint(p, 'color', target)
    })
    if (changed && !DRY_RUN) n[key] = next
  }

  /* 4) 4배수 아닌 gap */
  if ('itemSpacing' in n && n.layoutMode && n.layoutMode !== 'NONE') {
    const g = n.itemSpacing
    if (g > 0 && g % 4 !== 0) {
      const to = Math.max(4, Math.round(g / 4) * 4)
      if (!DRY_RUN) n.itemSpacing = to
      fixedGap++
      log(`  [gap] ${n.name} ${g} → ${to}`)
    }
  }
}

/* ── 요약 ─────────────────────────────────────────────────── */
log('')
log('── 요약 ──')
log(`텍스트 스타일 바인딩 ${fixedText}`)
log(`색 변수 바인딩 ${fixedFill}`)
log(`구 컬렉션 → 2.0 이관 ${migrated}`)
log(`gap 4배수 보정 ${fixedGap}`)
if (skipped.length) {
  log('')
  log(`── 손 안 댄 것 ${[...new Set(skipped)].length}종 (대응 토큰이 없어 사람이 정해야 함) ──`)
  for (const s of [...new Set(skipped)]) log('  ' + s)
}

console.log(report.join('\n'))
figma.notify(
  (DRY_RUN ? '[검사만] ' : '[적용] ') +
  `텍스트 ${fixedText} · 색 ${fixedFill} · 이관 ${migrated} · gap ${fixedGap}` +
  (skipped.length ? ` · 보류 ${[...new Set(skipped)].length}` : ''),
  { timeout: 6000 },
)
