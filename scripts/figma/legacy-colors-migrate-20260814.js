// 구 컬렉션(1.0) 색 → 2.0 변수 이관 (2026-08-14)
//
//  1차 하이진(components-hygiene)이 hex가 정확히 일치할 때만 자동 이관해서, 값이 바뀐
//  색 6종 18건이 구 컬렉션에 남았다. 그건 근접색으로 때려맞힐 게 아니라 역할로 풀어야 한다.
//
//  매핑 근거 — 추측 아님. src/styles/tokens.css 43~52행에 1.0 값이 역할별로 그대로 적혀 있다:
//      Primary  neutral/900  #1A1714
//      Body     neutral/700  #4A4540
//      Sub      neutral/600  #635D55
//      Caption  neutral/500  #857F76
//  즉 구 hex는 "그 역할의 1.0 시절 값"이다. 같은 역할의 2.0 스탑으로 보내면 된다.
//
//  나머지 둘은 쓰임으로 정했다:
//      #DDD9CF  ShowtimeGroupCard head 배경 · Header 3건 → neutral/200 (구분면)
//      #F0EDE6  MovieCard 아바타 자리 → neutral/300 (사진 들어가는 플레이스홀더)
//
//  DRY_RUN = true 면 리포트만. 먼저 이걸로 확인할 것.
// Scripter에서 Run.

const DRY_RUN = true

/* 구 hex → 2.0 변수 이름 */
const MAP = {
  '#1A1714': 'neutral/900',   // text primary
  '#4A4540': 'neutral/700',   // text body
  '#635D55': 'neutral/600',   // text sub
  '#857F76': 'neutral/500',   // text caption
  '#DDD9CF': 'neutral/200',   // 구분면
  '#F0EDE6': 'neutral/300',   // 사진 플레이스홀더
}

const report = []
const log = (s) => report.push(s)

const page = figma.root.children.find(p => p.name === 'Design System fixed')
if (!page) { figma.notify('페이지 "Design System fixed" 없음'); throw new Error('page') }
await page.loadAsync()
const section = page.findOne(n => n.type === 'SECTION' && n.name.includes('컴포넌트'))
if (!section) { figma.notify('섹션 "07 · 컴포넌트" 없음'); throw new Error('section') }

/* 2.0 변수 이름 → variable */
const byName = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.resolvedType === 'COLOR') byName.set(v.name, v)
  }
}
for (const name of new Set(Object.values(MAP))) {
  if (!byName.has(name)) { figma.notify(`2.0 변수 없음: ${name}`); throw new Error(name) }
}
log(`2.0 변수 확인 완료 (${new Set(Object.values(MAP)).size}종)`)

const hexOf = (p) => (p && p.type === 'SOLID')
  ? '#' + [p.color.r, p.color.g, p.color.b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
  : null

let moved = 0
const untouched = []

for (const n of section.findAll(() => true)) {
  for (const key of ['fills', 'strokes']) {
    if (!(key in n) || n[key] === figma.mixed || !n[key].length) continue
    let changed = false
    const next = n[key].map(p => {
      if (p.type !== 'SOLID') return p
      /* 꺼진 채움은 손대지 않는다 — 렌더에 없는 걸 바꿔봐야 diff만 는다 */
      if (p.visible === false) return p
      const hex = hexOf(p)
      const targetName = MAP[hex]
      if (!targetName) return p
      const target = byName.get(targetName)
      changed = true
      moved++
      log(`  ${n.name.slice(0, 26).padEnd(26)} ${hex} → ${targetName}`)
      return figma.variables.setBoundVariableForPaint(p, 'color', target)
    })
    if (changed && !DRY_RUN) n[key] = next
  }
}

/* 남은 구 컬렉션 바인딩 점검 — 매핑에 없는 게 더 있는지 */
for (const n of section.findAll(() => true)) {
  for (const key of ['fills', 'strokes']) {
    if (!(key in n) || n[key] === figma.mixed || !n[key].length) continue
    for (const p of n[key]) {
      if (p.type !== 'SOLID' || p.visible === false) continue
      const hex = hexOf(p)
      if (MAP[hex]) continue
      const bound = p.boundVariables && p.boundVariables.color
      if (!bound) continue
      const v = await figma.variables.getVariableByIdAsync(bound.id)
      if (!v) { untouched.push(`${hex} (${n.name}) — 변수 조회 실패`); continue }
      const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId)
      if (col && !col.name.includes('2.0')) untouched.push(`${hex} ${v.name} @${col.name} (${n.name})`)
    }
  }
}

log('')
log('── 요약 ──')
log(`구 → 2.0 이관 ${moved}건`)
if (untouched.length) {
  log('')
  log(`── 아직 구 컬렉션에 남은 것 ${[...new Set(untouched)].length}종 ──`)
  for (const s of [...new Set(untouched)]) log('  ' + s)
} else {
  log('구 컬렉션 잔여 없음')
}

console.log(report.join('\n'))
figma.notify((DRY_RUN ? '[검사만] ' : '[적용] ') + `이관 ${moved}건` + (untouched.length ? ` · 잔여 ${[...new Set(untouched)].length}` : ' · 잔여 없음'), { timeout: 6000 })
