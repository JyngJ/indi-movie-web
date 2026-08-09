// IconButton overlay 원형 → r-button(8) 사각 통일 (2026-08-09 결정)
// 이유: r8 버튼 옆에 원형이 서면 도형 충돌. 스킴의 도형을 사각 하나로.
// Buttons 2.0 제안 섹션의 2.0/IconButton 세트 overlay 변형 6개 radius 수정 + radius/button 변수 바인딩.
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
let touched = 0
for (const v of set.children) {
  if (!v.name.includes('Variant=overlay')) continue
  v.cornerRadius = 8
  if (radiusVar) for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
    try { v.setBoundVariable(f, radiusVar) } catch { /* 무시 */ }
  }
  touched++
}
figma.notify(`overlay ${touched}개 → r-button 사각 (인스턴스 자동 추종)`)
