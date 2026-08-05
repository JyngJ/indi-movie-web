// ShowtimeCell: 최소폭 104 + 심야 배지 → 달 아이콘 (Scripter용)
// 달: 초승달 벡터(원 빼기 원), primary/700, 시간 바로 오른쪽 gap 4

const TARGET_PAGE = 'Design System'
const MIN_W = 104

const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ShowtimeCell')
if (!set) throw new Error('셋 못 찾음')

// primary/700 변수
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const colorColl = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
let pri700 = null
for (const id of colorColl.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  if (v.name === 'primary/700') { pri700 = v; break }
}
const priFill = [figma.variables.setBoundVariableForPaint(
  { type: 'SOLID', color: { r: 0.25, g: 0.31, b: 0.51 } }, 'color', pri700)]

const log = []
for (const variant of set.children) {
  for (const t of variant.findAll(n => n.type === 'TEXT')) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }
  // 1. 최소폭
  variant.minWidth = MIN_W
  if (variant.width < MIN_W) variant.resize(MIN_W, variant.height)

  // 2. 심야 variant: 배지 제거 + 달 아이콘
  if (variant.name.includes('심야')) {
    const badge = variant.findOne(n => n.type === 'FRAME' && n.findOne && n.findOne(t => t.type === 'TEXT' && t.characters === '심야'))
    if (badge) badge.remove()
    const timeText = variant.findAll(n => n.type === 'TEXT').find(t => /^\d{1,2}:\d{2}$/.test(t.characters.trim()))
    if (!timeText) { log.push('⚠ 심야: 시간 텍스트 못 찾음'); continue }

    // 초승달: 원(12) - 오프셋 원(12, x+4)
    const c1 = figma.createEllipse(); c1.resize(12, 12); c1.fills = priFill
    const c2 = figma.createEllipse(); c2.resize(12, 12); c2.fills = priFill
    page.appendChild(c1); page.appendChild(c2)
    c1.x = 0; c1.y = 0; c2.x = 4; c2.y = -2
    const moon = figma.subtract([c2, c1], page)   // c1에서 c2 영역 빼기 → 초승달
    moon.name = 'moon'
    moon.children ? null : null
    moon.fills = priFill
    moon.resize(12, 12)

    // 시간 줄 구조 정리: time-row가 있으면 재활용, 없으면 생성
    let row = timeText.parent !== variant ? timeText.parent : null
    if (!row) {
      row = figma.createFrame()
      row.name = 'time-row'
      row.layoutMode = 'HORIZONTAL'
      row.fills = []
      const idx = variant.children.indexOf(timeText)
      variant.insertChild(idx, row)
      row.appendChild(timeText)
      row.counterAxisSizingMode = 'AUTO'
    }
    row.primaryAxisAlignItems = 'MIN'       // space-between 해제 — 시간에 붙임
    row.counterAxisAlignItems = 'CENTER'
    row.itemSpacing = 4
    row.appendChild(moon)
    try { row.layoutSizingHorizontal = 'HUG' } catch (e) {}
    log.push('심야: 달 아이콘 부착')
  }
}

const heights = set.children.map(c => `${c.name.replace('State=', '')}:${Math.round(c.width)}x${Math.round(c.height)}`)
console.log(log.join('\n') + '\nminWidth 104 적용 — ' + heights.join(' / '))
