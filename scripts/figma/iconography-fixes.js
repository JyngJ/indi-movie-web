// Iconography 보완 (Scripter용)
// 1. clapperboard 추가 (film 대조용)  2. instagram — simple-icons에서 반입
// 3. moon-custom 삭제 + ShowtimeCell 심야 달 → Lucide moon 인스턴스로 교체
// 4. _placeholder 아이콘 생성 (디자인 중 임시용)

const TARGET_PAGE = 'Design System'
const STROKE = 1.75

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
if (!section) throw new Error('Iconography 섹션 없음')

const log = []
const addLabel = (comp, text) => {
  const l = figma.createText()
  l.fontName = { family: 'Pretendard', style: 'Regular' }
  l.characters = text
  l.fontSize = 10
  l.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.53, b: 0.5 } }]
  section.appendChild(l)
  l.x = comp.x; l.y = comp.y + 32
}
// 빈 자리 계산 (기존 아이콘들 오른쪽 아래)
let maxY = 150, rowX = 48
for (const c of section.children) {
  if (c.type === 'COMPONENT') { maxY = Math.max(maxY, c.y) }
}
let placeX = 48 + 0, placeY = maxY + 100
const nextPos = () => { const p = { x: placeX, y: placeY }; placeX += 120; return p }

// ── 1. clapperboard ──
if (!section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/clapperboard')) {
  try {
    const res = await fetch('https://unpkg.com/lucide-static/icons/clapperboard.svg')
    let svg = await res.text()
    svg = svg.replace(/stroke-width="2"/g, `stroke-width="${STROKE}"`)
    const node = figma.createNodeFromSvg(svg)
    section.appendChild(node)
    node.resize(24, 24)
    const comp = figma.createComponentFromNode(node)
    comp.name = '2.0/icon/clapperboard'
    comp.description = '상영작 탭 후보 — film과 대조 후 택1'
    const p = nextPos(); comp.x = p.x; comp.y = p.y
    addLabel(comp, 'clapperboard')
    log.push('clapperboard 추가')
  } catch (e) { log.push('clapperboard 실패: ' + e.message) }
}

// ── 2. instagram (simple-icons — 브랜드 글리프는 filled) ──
if (!section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/instagram')) {
  try {
    const res = await fetch('https://unpkg.com/simple-icons/icons/instagram.svg')
    let svg = await res.text()
    const node = figma.createNodeFromSvg(svg)
    section.appendChild(node)
    node.resize(24, 24)
    // filled 글리프 색을 잉크로
    for (const v of node.findAll(n => n.type === 'VECTOR')) {
      v.fills = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]
    }
    const comp = figma.createComponentFromNode(node)
    comp.name = '2.0/icon/instagram'
    comp.description = '브랜드 글리프 (filled — Lucide에 없어 simple-icons 사용)'
    const p = nextPos(); comp.x = p.x; comp.y = p.y
    addLabel(comp, 'instagram')
    log.push('instagram 추가 (simple-icons)')
  } catch (e) { log.push('instagram 실패: ' + e.message) }
}

// ── 3. _placeholder (디자인 임시용) ──
if (!section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/_placeholder')) {
  const f = figma.createFrame()
  f.resize(24, 24)
  f.fills = []
  const box = figma.createRectangle()
  box.resize(20, 20)
  box.cornerRadius = 4
  box.fills = []
  box.strokes = [{ type: 'SOLID', color: { r: 0.655, g: 0.631, b: 0.604 } }] // neutral/400
  box.strokeWeight = 1.5
  box.dashPattern = [3, 3]
  f.appendChild(box)
  box.x = 2; box.y = 2
  const diag = figma.createLine()
  f.appendChild(diag)
  diag.resize(24, 0)
  diag.rotation = -45
  diag.x = 3.5; diag.y = 3.5
  diag.strokes = [{ type: 'SOLID', color: { r: 0.655, g: 0.631, b: 0.604 } }]
  diag.strokeWeight = 1.5
  diag.dashPattern = [3, 3]
  section.appendChild(f)
  const comp = figma.createComponentFromNode(f)
  comp.name = '2.0/icon/_placeholder'
  comp.description = '아이콘 미정 자리 임시용 — 출시 전 전수 검색해서 0개여야 함'
  const p = nextPos(); comp.x = p.x; comp.y = p.y
  addLabel(comp, '_placeholder')
  log.push('_placeholder 생성')
}

// ── 4. moon 통일: moon-custom 삭제 + ShowtimeCell 심야 교체 ──
{
  const moonComp = section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/moon')
  const custom = section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/moon-custom')
  const compSection = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
  const stSet = compSection && compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ShowtimeCell')
  const late = stSet && stSet.children.find(c => c.name.includes('심야'))
  if (moonComp && late) {
    const oldMoon = late.findOne(n => n.name === 'moon' || n.name === '2.0/icon/moon-custom')
    if (oldMoon) {
      const parent = oldMoon.parent
      const idx = parent.children.indexOf(oldMoon)
      const inst = moonComp.createInstance()
      parent.insertChild(idx, inst)
      inst.resize(14, 14)
      // 인디고 착색 (모든 벡터 스트로크)
      const colls = await figma.variables.getLocalVariableCollectionsAsync()
      const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
      let pri = null
      for (const id of cc.variableIds) {
        const v = await figma.variables.getVariableByIdAsync(id)
        if (v.name === 'primary/700') pri = v
      }
      for (const v of inst.findAll(n => n.type === 'VECTOR')) {
        if (v.strokes.length) v.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', pri)]
      }
      oldMoon.remove()
      log.push('심야 달 → Lucide moon 인스턴스 교체')
    }
  }
  if (custom) { custom.remove(); log.push('moon-custom 삭제') }
  // 라벨 잔재 정리
  const l = section.findOne(n => n.type === 'TEXT' && n.characters === 'moon-custom')
  if (l) l.remove()
}

console.log(log.join('\n'))
