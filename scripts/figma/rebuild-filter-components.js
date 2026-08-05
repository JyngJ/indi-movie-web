// 필터 줄 컴포넌트 재작성 (Scripter용) — 잘못 추출된 2.0/FilterPill 삭제 후 3종 생성
//   2.0/FilterPill   — 예매 가능만 보기 (즉시 토글): Default / Active
//   2.0/FilterButton — 필터 드로어 버튼: Default / Active(카운트 표시)
//   2.0/ActiveFilterChip — 장르·국가 해제 칩 (× 포함)
// 색 문법: Active = primary/100 배경 + primary/900 글자 + primary/700 보더

const TARGET_PAGE = 'Design System'
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })

const targetPage = figma.root.children.find(p => p.name === TARGET_PAGE)
await targetPage.loadAsync()
await figma.setCurrentPageAsync(targetPage)
const compSection = targetPage.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')

// 잘못된 셋 제거
const broken = compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/FilterPill')
if (broken) broken.remove()

// 변수
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const colorColl = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of colorColl.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  VAR[v.name] = v
}
const bound = name => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[name])]

const P = s => ({ family: 'Pretendard', style: s })
const pill = (name, labelText, active, withIcon, withX) => {
  const c = figma.createComponent()
  c.name = name
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.counterAxisAlignItems = 'CENTER'
  c.itemSpacing = 4
  c.paddingLeft = c.paddingRight = 12
  c.resize(60, 28)
  c.cornerRadius = 9999
  c.fills = active ? bound('primary/100') : []
  c.strokes = active ? bound('primary/700') : bound('neutral/300')
  c.strokeWeight = 1
  if (withIcon) {
    const ic = figma.createRectangle()
    ic.name = 'icon-slot'
    ic.resize(12, 12); ic.cornerRadius = 3
    ic.fills = active ? bound('primary/900') : bound('neutral/500')
    c.appendChild(ic)
  }
  const t = figma.createText()
  t.fontName = P('SemiBold')
  t.characters = labelText
  t.fontSize = 12
  t.fills = active ? bound('primary/900') : bound('neutral/500')
  c.appendChild(t)
  if (withX) {
    const x = figma.createVector()
    c.appendChild(x)
    x.name = 'dismiss'
    x.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 0 L 8 8 M 8 0 L 0 8' }]
    x.resize(8, 8)
    x.strokes = bound('primary/900')
    x.strokeWeight = 1.5
    x.strokeCap = 'ROUND'
    x.fills = []
  }
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
const makeSet = (comps, name, x, y, desc, labelPropTexts) => {
  for (const c of comps) compSection.appendChild(c)
  const set = figma.combineAsVariants(comps, compSection)
  set.name = name
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 16
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 20
  set.x = x; set.y = y
  set.description = desc
  if (labelPropTexts) {
    const ref = set.addComponentProperty('라벨', 'TEXT', labelPropTexts)
    for (const t of set.findAll(n => n.type === 'TEXT' && n.name !== 'count')) {
      t.componentPropertyReferences = { characters: ref }
    }
  }
  return set
}

// ── 1. FilterPill (예매 가능만 보기 토글) ──
makeSet(
  [pill('State=Default', '예매 가능만 보기', false), pill('State=Active', '예매 가능만 보기', true)],
  '2.0/FilterPill', 800, 420,
  '즉시 토글 칩 (드로어 안 엶). 코드: applySheetFilters bookable. Active = primary 틴트 문법.',
  '예매 가능만 보기'
)
label('FilterPill', 800, 380)

// ── 2. FilterButton (드로어 열기) ──
{
  const def = pill('State=Default', '필터', false, true)
  const act = pill('State=Active', '필터', true, true)
  // Active엔 카운트 텍스트 추가 (별도 프로퍼티, 라벨 바인딩 제외용 이름)
  const cnt = figma.createText()
  cnt.name = 'count'
  cnt.fontName = P('SemiBold')
  cnt.characters = '2'
  cnt.fontSize = 12
  cnt.fills = bound('primary/900')
  act.appendChild(cnt)
  const set = makeSet([def, act], '2.0/FilterButton', 800, 540,
    '필터 드로어 여는 버튼. Active = 필터 적용 중 (카운트 표시). icon-slot은 아이콘 세션에서 교체.', '필터')
  const cntRef = set.addComponentProperty('카운트', 'TEXT', '2')
  for (const t of set.findAll(n => n.type === 'TEXT' && n.name === 'count')) {
    t.componentPropertyReferences = { characters: cntRef }
  }
}
label('FilterButton', 800, 500)

// ── 3. ActiveFilterChip (장르·국가 해제 칩) ──
makeSet(
  [pill('Kind=장르', '드라마', true, false, true), pill('Kind=국가', '🇯🇵 일본', true, false, true)],
  '2.0/ActiveFilterChip', 800, 660,
  '적용된 필터 표시 + 탭하면 해제(×). 항상 Active 색 문법.',
  '드라마'
)
label('ActiveFilterChip', 800, 620)

console.log('FilterPill / FilterButton / ActiveFilterChip 생성 완료')
