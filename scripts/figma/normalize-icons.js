// 아이콘 마스터 평탄화 (Scripter용)
// 모든 2.0/icon/*: 스트로크 아웃라인 → 단일 벡터 'glyph'로 flatten
// → 스왑해도 색 오버라이드가 유지되는 구조. 이후 배치된 인스턴스 색 재적용.

const TARGET_PAGE = 'Design System'
const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const iconSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
const compSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')

const colls = await figma.variables.getLocalVariableCollectionsAsync()
const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of cc.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  VAR[v.name] = v
}
const paintOf = name => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[name])]
const INK = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]

// ── 1. 마스터 평탄화 ──
const log = []
for (const comp of iconSec.findAll(n => n.type === 'COMPONENT' && n.name.startsWith('2.0/icon/'))) {
  const already = comp.children.length === 1 && comp.children[0].name === 'glyph'
  if (already) continue
  try {
    // 스트로크 → 아웃라인
    const outlined = []
    for (const child of [...comp.children]) {
      if ('outlineStroke' in child && child.strokes && child.strokes.length) {
        const o = child.outlineStroke()
        if (o) { comp.appendChild(o); child.remove(); outlined.push(o) }
        else outlined.push(child)
      } else outlined.push(child)
    }
    // 전부 하나로 flatten
    const targets = comp.children.filter(n => n.type !== 'TEXT')
    if (targets.length) {
      const flat = figma.flatten(targets, comp)
      flat.name = 'glyph'
      flat.fills = INK
      flat.strokes = []
      // 24 박스에 맞게 컴포넌트 크기 유지
      log.push(comp.name.replace('2.0/icon/', ''))
    }
  } catch (e) {
    log.push(`⚠ ${comp.name}: ${e.message}`)
  }
}

// ── 2. 배치된 인스턴스 색 재적용 (glyph fill 오버라이드) ──
const recolor = (inst, colorName) => {
  const g = inst.findOne(n => n.name === 'glyph')
  if (g) g.fills = paintOf(colorName)
}
let recolored = 0
if (compSec) {
  for (const inst of compSec.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.name.startsWith('2.0/icon/'))) {
    // 맥락별 색: 조상 이름으로 판정
    let colorName = 'neutral/600'
    let p = inst.parent
    const chain = []
    while (p && p !== compSec) { chain.push(p.name); p = p.parent }
    const chainStr = chain.join('|')
    if (chainStr.includes('FilterButton')) colorName = chain.some(n => n.includes('Active')) ? 'primary/900' : 'neutral/500'
    else if (inst.mainComponent.name.includes('external-link')) colorName = 'neutral/500'
    else if (inst.mainComponent.name.includes('moon')) colorName = 'primary/700'
    else if (inst.mainComponent.name.includes('chevron')) colorName = 'neutral/500'
    recolor(inst, colorName)
    recolored++
  }
}
// ShowtimeCell 심야 달 (셋 안)
console.log(`평탄화: ${log.join(', ')}\n인스턴스 재착색: ${recolored}개\n이제 스왑해도 색 유지됨 (glyph 레이어 기준)`)
