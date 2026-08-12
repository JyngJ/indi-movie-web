// 끊긴 색 바인딩 복구 (2026-08-10)
//
//  앞선 시멘틱 계층 작업에서, 레거시 원시값(neutral/*, white, semantic/*)에 물려 있던
//  바인딩은 대응하는 시멘틱 역할이 없다는 이유로 건너뛴 채 레거시 컬렉션을 지웠다.
//  그 결과 481곳이 "삭제된 변수"를 가리키는 상태로 남았다(덤프상 VariableID:2:*).
//
//  색으로 역추적해 다시 물린다. 1.0 원시값이라 hex가 유일해서 판별이 된다.
//   #1A1714 구 neutral/900 → text/primary      #F8F6F2 구 neutral/50  → surface/bg
//   #4A4540 구 neutral/700 → text/body         #F0EDE6 구 neutral/100 → surface/raised
//   #635D55 구 neutral/600 → text/sub          #A9A39A 구 neutral/400 → text/placeholder
//   #857F76 구 neutral/500 → text/caption      #2E2A25 구 neutral/800 → neutral/800(원시)
//   #DDD9CF 구 neutral/200 → 채우기 surface/raised · 선 surface/border
//   #FFFFFF 구 white       → 텍스트 text/on-accent · 그 외 surface/card
//   #D97706 → status/warning   #4A7C59 → status/success   #3B82F6 → primary/500(원시)
//
//  주의: 이 값들은 1.0 팔레트다. 다시 물리면 색이 2.0으로 바뀐다 —
//  work 페이지의 옛 TOBE 시안들이 현행 색으로 갱신된다는 뜻이다(의도된 변화).
// Scripter에서 Run.

const done = [], failed = []
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const toHex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()

for (const page of figma.root.children) await page.loadAsync()

/* 현행 컬렉션 인덱싱 */
const byName = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.resolvedType === 'COLOR' && !byName.has(v.name)) byName.set(v.name, v)
  }
}

/** hex → 대상 변수 이름. 함수면 (node, field)로 판단 */
const MAP = {
  '#1A1714': 'text/primary',
  '#4A4540': 'text/body',
  '#635D55': 'text/sub',
  '#857F76': 'text/caption',
  '#A9A39A': 'text/placeholder',
  '#F8F6F2': 'surface/bg',
  '#F0EDE6': 'surface/raised',
  '#2E2A25': 'neutral/800',
  '#D97706': 'status/warning',
  '#4A7C59': 'status/success',
  '#3B82F6': 'primary/500',
  // 같은 색이 역할 둘로 쓰인다 — 노드 성격으로 가른다
  '#DDD9CF': (node, field) => (field === 'strokes' ? 'surface/border' : 'surface/raised'),
  '#FFFFFF': (node) => (node.type === 'TEXT' ? 'text/on-accent' : 'surface/card'),
}

const stats = new Map()
const skipped = new Map()
let remote = 0

for (const page of figma.root.children) {
  for (const node of page.findAll(n => 'fills' in n || 'strokes' in n)) {
    for (const field of ['fills', 'strokes']) {
      const paints = node[field]
      if (!paints || paints === figma.mixed || !paints.length) continue
      let changed = false
      const next = []
      for (const p of paints) {
        const bound = p.boundVariables && p.boundVariables.color
        if (!bound || p.type !== 'SOLID') { next.push(p); continue }
        let alive = null
        try { alive = await figma.variables.getVariableByIdAsync(bound.id) } catch { alive = null }
        if (alive) { next.push(p); continue }              // 살아 있는 바인딩은 건드리지 않는다
        if (!bound.id.startsWith('VariableID:2:')) { remote++; next.push(p); continue }  // 외부 라이브러리
        const hex = toHex(p.color)
        const rule = MAP[hex]
        const targetName = typeof rule === 'function' ? rule(node, field) : rule
        const target = targetName ? byName.get(targetName) : null
        if (!target) {
          skipped.set(hex, (skipped.get(hex) ?? 0) + 1)
          next.push(p)
          continue
        }
        next.push(figma.variables.setBoundVariableForPaint(p, 'color', target))
        stats.set(targetName, (stats.get(targetName) ?? 0) + 1)
        changed = true
      }
      if (changed) node[field] = next
    }
  }
}

for (const [name, n] of [...stats].sort((a, b) => b[1] - a[1])) done.push(`${name} ← ${n}곳`)
for (const [hex, n] of [...skipped].sort((a, b) => b[1] - a[1])) failed.push(`매핑 없음 ${hex} — ${n}곳`)
if (remote) failed.push(`외부 라이브러리 변수 ${remote}곳 — 그대로 둠`)

const total = [...stats.values()].reduce((a, b) => a + b, 0)
figma.notify(`끊긴 바인딩 복구 — ${total}곳${failed.length ? ` · 확인 ${failed.length}` : ''}`)
console.log('복구:\n' + (done.join('\n') || '없음'))
if (failed.length) console.log('확인 필요:\n' + failed.join('\n'))
