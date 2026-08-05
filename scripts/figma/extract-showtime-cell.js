// ShowtimeCell 컴포넌트 추출 (Scripter용)
// Color 섹션의 TOBE 셀을 복제해 코드의 전체 상태(ShowtimeCell.tsx ShowtimeKind)로 확장:
//   예정(normal) / 잔여석 적음(low) / 심야(late) / 상영중(nowplaying) / 상영 완료(ended) / 매진(soldout)
// 'Components 2.0' 섹션에 variant 셋 생성. 색은 2.0 변수 바인딩.

const WORK_PAGE = 'Design System - work'   // 원본 소스 (TOBE Color)
const TARGET_PAGE = 'Design System'        // 완성본 정리 페이지 — 여기에 Components 2.0 섹션 생성

const P = s => ({ family: 'Pretendard', style: s })
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

// ── 변수 룩업 ──
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const colorColl = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
if (!colorColl) throw new Error('색상 2.0 컬렉션 없음')
const VAR = {}
for (const id of colorColl.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  VAR[v.name] = v
}
const bound = name => {
  const v = VAR[name]
  if (!v) throw new Error('변수 없음: ' + name)
  return [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)]
}

// ── 페이지 확인 ──
const workPage = figma.root.children.find(p => p.name === WORK_PAGE)
const targetPage = figma.root.children.find(p => p.name === TARGET_PAGE)
if (!workPage) throw new Error(`'${WORK_PAGE}' 페이지 못 찾음`)
if (!targetPage) throw new Error(`'${TARGET_PAGE}' 페이지 못 찾음`)
await workPage.loadAsync()
await targetPage.loadAsync()

// ── 원본 셀 찾기 (work 페이지의 Color 섹션) ──
const section = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
if (!section) throw new Error('TheaterSheet TOBE (Color) 섹션 못 찾음 (work 페이지)')
const expanded = section.findOne(n => n.type === 'FRAME' && n.name === 'TOBE · Mobile expanded')
if (!expanded) throw new Error('TOBE expanded 못 찾음')
const allCells = expanded.findAll(n => n.type === 'FRAME' && n.findChild && n.findChild(c => c.type === 'TEXT' && c.characters.includes(':')))
const liveCell = allCells.find(c => c.findOne(n => n.type === 'TEXT' && n.characters.includes('상영중')))
const deadCell = allCells.find(c => c.findOne(n => n.type === 'TEXT' && n.characters.includes('상영 완료')))
if (!liveCell || !deadCell) throw new Error('원본 셀 못 찾음 (상영중/상영 완료 텍스트 기준)')

// 셀 안 텍스트 4개: [시간, -종료, 상태/좌석, 관]
const texts = cell => cell.findAll(n => n.type === 'TEXT')
const loadCellFonts = async cell => {
  for (const t of texts(cell)) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }
}
await loadCellFonts(liveCell)
await loadCellFonts(deadCell)

const setLine = async (cell, idx, chars, fillName) => {
  const t = texts(cell)[idx]
  if (!t) return
  t.characters = chars
  if (fillName) t.fills = bound(fillName)
}
// 좌석 표기: 잔여만 색, /총석은 500
const setSeat = async (cell, avail, total, availVarName) => {
  const t = texts(cell)[2]
  if (!t) return
  t.characters = `${avail}/${total}석`
  t.fills = bound('neutral/500')
  t.setRangeFills(0, String(avail).length, bound(availVarName))
}

// ── 상태별 셀 생성 ──
const cells = []
const mk = (src, name) => {
  const c = src.clone()
  c.name = name
  cells.push(c)
  return c
}
// 1. 예정 — live 기반, 상태줄 → 좌석
{
  const c = mk(liveCell, 'State=예정')
  await setSeat(c, 82, 120, 'primary/700')
}
// 2. 잔여석 적음
{
  const c = mk(liveCell, 'State=잔여석 적음')
  await setLine(c, 0, '21:40')
  await setLine(c, 1, '-23:21')
  await setSeat(c, 6, 90, 'warning/700')
}
// 3. 심야 — 예정 + 심야 배지
{
  const c = mk(liveCell, 'State=심야')
  await setLine(c, 0, '23:10')
  await setLine(c, 1, '-00:51')
  await setSeat(c, 45, 90, 'primary/700')
  const badge = figma.createFrame()
  badge.layoutMode = 'HORIZONTAL'
  badge.primaryAxisSizingMode = 'AUTO'
  badge.counterAxisSizingMode = 'FIXED'
  badge.counterAxisAlignItems = 'CENTER'
  badge.paddingLeft = badge.paddingRight = 8
  badge.resize(30, 18)
  badge.cornerRadius = 4
  badge.fills = bound('primary/700')
  const bt = figma.createText()
  bt.fontName = P('Bold')
  bt.characters = '심야'
  bt.fontSize = 9
  bt.letterSpacing = { unit: 'PIXELS', value: 0.4 }
  bt.fills = bound('primary/100')
  badge.appendChild(bt)
  c.appendChild(badge)
}
// 4. 상영중 — 원본 그대로
mk(liveCell, 'State=상영중')
// 5. 상영 완료 — 원본 그대로
mk(deadCell, 'State=상영 완료')
// 6. 매진 — dead 기반, 상태 → 매진(error/900), 시간 취소선 해제
{
  const c = mk(deadCell, 'State=매진')
  await setLine(c, 0, '19:30')
  await setLine(c, 1, '-21:11')
  await setLine(c, 2, '매진', 'error/900')
  const t0 = texts(c)[0]
  t0.textDecoration = 'NONE' // 취소선은 '지나간 시간' 전용 — 매진은 시간 유효
}

// ── 컴포넌트化 + 섹션 배치 (완성본 페이지) ──
await figma.setCurrentPageAsync(targetPage)
let compSection = targetPage.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
if (!compSection) {
  compSection = figma.createSection()
  compSection.name = 'Components 2.0'
  let maxX = 0
  for (const n of targetPage.children) { if (n !== compSection) maxX = Math.max(maxX, n.x + n.width) }
  compSection.x = maxX + 200; compSection.y = 0
  compSection.resizeWithoutConstraints(1200, 600)
  compSection.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.976, b: 0.972 } }]
  targetPage.appendChild(compSection)
}
const oldSet = compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ShowtimeCell')
if (oldSet) oldSet.remove()

const comps = cells.map(c => figma.createComponentFromNode(c))
// combineAsVariants는 부모와 같은 페이지 요구 — 먼저 완성본 페이지 섹션으로 이동
for (const comp of comps) compSection.appendChild(comp)
const set = figma.combineAsVariants(comps, compSection)
set.name = '2.0/ShowtimeCell'
set.layoutMode = 'HORIZONTAL'
set.primaryAxisSizingMode = 'AUTO'
set.counterAxisSizingMode = 'AUTO'
set.itemSpacing = 20
set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 28
set.x = 60; set.y = 120
set.description = '시간표 셀. 코드 ShowtimeKind 매핑: 예정=normal, 잔여석 적음=low, 심야=late, 상영중=nowplaying, 상영 완료=ended, 매진=soldout. 취소선=지나간 시간 전용, 좌석 잔여숫자만 상태색.'

const label = figma.createText()
label.fontName = { family: 'KIMM_Bold', style: 'B' }
label.characters = 'ShowtimeCell'
label.fontSize = 20
label.letterSpacing = { unit: 'PERCENT', value: 5 }
label.fills = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]
compSection.appendChild(label)
label.x = 60; label.y = 80

console.log('2.0/ShowtimeCell 생성: variant 6개')
