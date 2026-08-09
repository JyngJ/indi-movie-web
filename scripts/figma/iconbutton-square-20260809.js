// 2.0/IconButton에 Shape 속성 도입 (2026-08-09) — square(r8)·round 공존
//  기존 변형 rename: ghost → Shape=square, overlay → Shape=round
//  overlay round 6개를 복제해 Shape=square(r-button) 변형 생성 (총 18개)
//  ghost round는 실사용 없어 미생성 (sparse 세트 허용)
let radiusVar = null
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  const is20 = col.name.includes('2.0')
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.name === 'radius/button' && (!radiusVar || is20)) radiusVar = v
  }
}
let set = null
for (const page of figma.root.children) {
  set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/IconButton')
  if (set) break
}
if (!set) { figma.notify('2.0/IconButton 없음'); throw new Error('no set') }

// 이미 Shape 속성 있으면 재실행 감지
if (set.children.some(c => c.name.includes('Shape='))) {
  figma.notify('이미 Shape 속성 있음 — 스킵')
} else {
  const overlays = []
  for (const v of set.children) {
    if (v.name.includes('Variant=ghost')) v.name = v.name + ', Shape=square'
    else if (v.name.includes('Variant=overlay')) { v.name = v.name + ', Shape=round'; overlays.push(v) }
  }
  let maxX = 0
  for (const c of set.children) maxX = Math.max(maxX, c.x + c.width)
  let x = maxX + 32
  for (const v of overlays) {
    const clone = v.clone()
    set.appendChild(clone)
    clone.name = v.name.replace('Shape=round', 'Shape=square')
    clone.cornerRadius = 8
    if (radiusVar) for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
      try { clone.setBoundVariable(f, radiusVar) } catch { /* 무시 */ }
    }
    clone.x = x; clone.y = v.y
    x += clone.width + 16
  }
  figma.notify(`Shape 속성 추가 — overlay square ${overlays.length}개 생성`)
}
