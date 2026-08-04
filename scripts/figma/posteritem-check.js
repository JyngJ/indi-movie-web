// PosterItem 선택 배지에 check 아이콘 삽입 (Scripter용)

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const iconSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
const compSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
const checkComp = iconSec.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/check')
if (!checkComp) throw new Error('check 아이콘 없음')

const set = compSec.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/PosterItem')
const sel = set && set.children.find(c => c.name.includes('True'))
if (!sel) throw new Error('Selected=True variant 못 찾음')

// 배지 = 작은 원형 프레임 (radius ≈ 절반, 크기 ≤ 30)
const badge = sel.findOne(n =>
  (n.type === 'FRAME' || n.type === 'ELLIPSE') &&
  n.width <= 30 && n.height <= 30 &&
  n.name !== 'glyph' &&
  (n.type === 'ELLIPSE' || (typeof n.cornerRadius === 'number' && n.cornerRadius >= n.width / 2 - 1)))
if (!badge) throw new Error('선택 배지(원형) 못 찾음 — 이름/형태 확인 필요')

// ELLIPSE면 아이콘을 얹을 수 없으니 부모에 겹치기, FRAME이면 안에 넣기
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
let cream = null
for (const id of cc.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  if (v.name === 'primary/100') cream = v
}
const inst = checkComp.createInstance()
const size = Math.round(badge.width * 0.6)

if (badge.type === 'FRAME') {
  badge.appendChild(inst)
  inst.resize(size, size)
  inst.x = (badge.width - size) / 2
  inst.y = (badge.height - size) / 2
} else {
  badge.parent.appendChild(inst)
  inst.resize(size, size)
  inst.x = badge.x + (badge.width - size) / 2
  inst.y = badge.y + (badge.height - size) / 2
}
const g = inst.findOne(n => n.name === 'glyph')
if (g && cream) {
  g.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', cream)]
}
inst.name = 'check'
console.log(`check 삽입 완료 (배지 ${Math.round(badge.width)}px, 아이콘 ${size}px, 크림 착색)`)
