// GhostAction + FilterPill + TheaterHeader 추출 (Scripter용)
// 아이콘은 'icon-slot' 이름의 자리표시로 유지 — 아이콘 세션에서 인스턴스 스왑으로 교체 예정

const WORK_PAGE = 'Design System - work'
const TARGET_PAGE = 'Design System'

for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch (e) {}

const workPage = figma.root.children.find(p => p.name === WORK_PAGE)
const targetPage = figma.root.children.find(p => p.name === TARGET_PAGE)
await workPage.loadAsync()
await targetPage.loadAsync()
await figma.setCurrentPageAsync(targetPage)

const srcSection = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
const expanded = srcSection && srcSection.findOne(n => n.type === 'FRAME' && n.name === 'TOBE · Mobile expanded')
if (!expanded) throw new Error('TOBE expanded 못 찾음')
const compSection = targetPage.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
if (!compSection) throw new Error('Components 2.0 섹션 없음')

// 변수 룩업
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const colorColl = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of colorColl.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  VAR[v.name] = v
}
const bound = name => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[name])]

const loadFonts = async node => {
  for (const t of node.findAll(n => n.type === 'TEXT')) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }
}
const toSection = async (src, name) => {
  const w = src.width, h = src.height
  await loadFonts(src)
  const c = src.clone()
  c.name = name
  compSection.appendChild(c)
  try { c.layoutSizingHorizontal = 'FIXED' } catch (e) {}
  c.resize(w, h)
  return c
}
const label = (chars, x, y) => {
  const t = figma.createText()
  t.fontName = { family: 'KIMM_Bold', style: 'B' }
  t.characters = chars
  t.fontSize = 20
  t.letterSpacing = { unit: 'PERCENT', value: 5 }
  t.fills = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]
  compSection.appendChild(t)
  t.x = x; t.y = y
}
const results = []

// ═══ 1. GhostAction — 단일 컴포넌트 + 라벨 텍스트 프로퍼티 ═══
{
  const old = compSection.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/GhostAction')
  if (old) old.remove()
  const actions = expanded.findOne(n => n.type === 'FRAME' && n.name === 'actions')
  const btn = actions && actions.children.find(c => c.type === 'FRAME')
  if (!btn) throw new Error('고스트 버튼 못 찾음')
  const node = await toSection(btn, '2.0/GhostAction')
  const comp = figma.createComponentFromNode(node)
  comp.x = 800; comp.y = 320
  // 아이콘 자리 이름 표준화
  const iconPh = comp.findOne(n => n.type === 'RECTANGLE')
  if (iconPh) iconPh.name = 'icon-slot'
  // 라벨 텍스트 프로퍼티
  const labelText = comp.findOne(n => n.type === 'TEXT')
  if (labelText) {
    const ref = comp.addComponentProperty('라벨', 'TEXT', labelText.characters)
    labelText.componentPropertyReferences = { characters: ref }
  }
  comp.description = '고스트 유틸리티 버튼. 시각은 조용히, 히트박스 44 유지. icon-slot은 아이콘 세션에서 인스턴스 스왑으로 교체.'
  label('GhostAction', 800, 280)
  results.push('GhostAction: 단일 + 라벨 프로퍼티')
}

// ═══ 2. FilterPill — Default / Active variants ═══
{
  const old = compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/FilterPill')
  if (old) old.remove()
  const countRow = expanded.findOne(n => n.type === 'FRAME' && n.name === 'count-row')
  const pill = countRow && countRow.findOne(n => n.type === 'FRAME' && n.findOne && n.findOne(t => t.type === 'TEXT' && t.characters.includes('예매')))
  if (!pill) throw new Error('필터 칩 못 찾음')
  const defNode = await toSection(pill, 'State=Default')
  const defComp = figma.createComponentFromNode(defNode)
  // Active: 복제 후 가이드 문법 적용 (primary/100 배경 + 900 글자 + 700 보더)
  const actNode = defComp.clone()
  compSection.appendChild(actNode)
  actNode.name = 'State=Active'
  actNode.fills = bound('primary/100')
  actNode.strokes = bound('primary/700')
  for (const t of actNode.findAll(n => n.type === 'TEXT')) {
    await figma.loadFontAsync(t.fontName)
    t.fills = bound('primary/900')
  }
  const actComp = actNode.type === 'COMPONENT' ? actNode : figma.createComponentFromNode(actNode)
  const set = figma.combineAsVariants([defComp, actComp], compSection)
  set.name = '2.0/FilterPill'
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 16
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24
  set.x = 800; set.y = 420
  // 라벨 텍스트 프로퍼티 (셋 레벨)
  const anyText = set.findOne(n => n.type === 'TEXT')
  if (anyText) {
    const ref = set.addComponentProperty('라벨', 'TEXT', anyText.characters)
    for (const t of set.findAll(n => n.type === 'TEXT')) t.componentPropertyReferences = { characters: ref }
  }
  set.description = '필터 칩. Active = primary 틴트 문법 (100 배경 + 900 글자 + 700 보더). 아웃라인 pill = 누를 수 있는 것.'
  label('FilterPill', 800, 380)
  results.push('FilterPill: Default/Active + 라벨 프로퍼티')
}

// ═══ 3. TheaterHeader — 단일 + 극장명/주소 프로퍼티 ═══
{
  const old = compSection.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/TheaterHeader')
  if (old) old.remove()
  const header = expanded.findOne(n => n.type === 'FRAME' && n.name.includes('theater-header'))
  if (!header) throw new Error('극장 헤더 못 찾음')
  const node = await toSection(header, '2.0/TheaterHeader')
  const comp = figma.createComponentFromNode(node)
  comp.x = 60; comp.y = 900
  const nameText = comp.findOne(n => n.type === 'TEXT' && n.characters.includes('씨네큐브'))
  const addrText = comp.findOne(n => n.type === 'TEXT' && n.characters.includes('서울'))
  if (nameText) {
    const ref = comp.addComponentProperty('극장명', 'TEXT', nameText.characters)
    nameText.componentPropertyReferences = { characters: ref }
  }
  if (addrText) {
    const ref = comp.addComponentProperty('주소', 'TEXT', addrText.characters)
    addrText.componentPropertyReferences = { characters: ref }
  }
  comp.description = '극장 헤더 — 이름(display/h1 24 KIMM)·주소·고스트 액션. collapsed/expanded/PC 공용.'
  label('TheaterHeader', 60, 860)
  results.push('TheaterHeader: 단일 + 극장명·주소 프로퍼티')
}

console.log(results.join('\n'))
