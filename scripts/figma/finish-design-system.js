// 영화볼지도 Design System — 마무리 스크립트 (Scripter 플러그인용)
//
// 사용법:
// 1. Figma 데스크톱 앱에서 "영화볼지도 Design System" 파일 열기
// 2. 리소스(Shift+I) → Plugins → "Scripter" 검색, 실행
// 3. 이 파일 내용 전체를 붙여넣고 Run
//
// 하는 일:
//   STEP 1. 로컬 폰트(KIMM_Bold, Pretendard) 확인
//   STEP 2. 텍스트 스타일 16종 폰트 교체 (Noto Sans KR → KIMM/Pretendard)
//   STEP 3. 캔버스의 모든 텍스트 노드 폰트 교체
//   STEP 4. ShowtimeCell 컴포넌트 셋 생성 (03 · Components 섹션)

// ─── STEP 1: 폰트 확인 ───────────────────────────────────────────
const fonts = await figma.listAvailableFontsAsync()
const has = (family, style) =>
  fonts.some(f => f.fontName.family === family && f.fontName.style === style)

const KIMM = { family: 'KIMM_Bold', style: 'B' }
if (!has(KIMM.family, KIMM.style)) {
  // 설치 상태에 따라 이름이 다를 수 있어 대체 후보 탐색
  const cand = fonts.find(f => /KIMM/i.test(f.fontName.family) && /B|Bold/i.test(f.fontName.style))
  if (cand) Object.assign(KIMM, cand.fontName)
  else throw new Error('KIMM 폰트를 찾을 수 없음 — 데스크톱 앱에서 실행했는지 확인')
}
const P = style => ({ family: 'Pretendard', style })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
  if (!has('Pretendard', s)) throw new Error(`Pretendard ${s} 없음`)
}
console.log('폰트 OK:', KIMM, '+ Pretendard')

await figma.loadFontAsync(KIMM)
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))
// 기존 텍스트가 쓰는 폰트도 로드해야 수정 가능
for (const s of ['Black', 'Bold', 'Medium', 'Regular']) {
  try { await figma.loadFontAsync({ family: 'Noto Sans KR', style: s }) } catch (e) {}
}

// ─── STEP 2: 텍스트 스타일 교체 ──────────────────────────────────
// DESIGN.md 웨이트 매핑: 700→Bold, 600→SemiBold, 500→Medium, 400→Regular
// display/*는 KIMM Bold (코드의 --font-display)
const styleMap = {
  'display/h1': KIMM, 'display/h2': KIMM, 'display/h3': KIMM, 'display/map-label': KIMM,
  'ui/title': P('Bold'),      // 17/700
  'ui/subtitle': P('SemiBold'), // 15/600
  'ui/body': P('Medium'),     // 14/500
  'ui/meta': P('Regular'),    // 13/400
  'ui/caption': P('Medium'),  // 11/500
  'ui/badge': P('Bold'),      // 9/700
  'num/time': P('Bold'),      // 17/700
  'num/date': P('Bold'),      // 16/700
  'num/seat': P('SemiBold'),  // 12/600
  'num/dow': P('Medium'),     // 10/500
  // latin/*은 Libre Baskerville 유지
}
const textStyles = await figma.getLocalTextStylesAsync()
let styleCount = 0
for (const st of textStyles) {
  const target = styleMap[st.name]
  if (target) { st.fontName = target; styleCount++ }
}
console.log(`텍스트 스타일 ${styleCount}개 교체 완료`)

// ─── STEP 3: 캔버스 텍스트 노드 교체 ─────────────────────────────
// 스타일 미연결로 Noto가 직접 박힌 노드들 처리.
// Black은 display 대용이었으므로 KIMM으로, 나머지는 Pretendard 동일 웨이트로.
const nodeMap = { Black: KIMM, Bold: P('Bold'), Medium: P('Medium'), Regular: P('Regular') }
let nodeCount = 0
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const node of page.findAllWithCriteria({ types: ['TEXT'] })) {
    const f = node.fontName
    if (f !== figma.mixed && f.family === 'Noto Sans KR' && nodeMap[f.style]) {
      node.fontName = nodeMap[f.style]
      nodeCount++
    }
  }
}
console.log(`텍스트 노드 ${nodeCount}개 교체 완료`)

// ─── STEP 4: ShowtimeCell 컴포넌트 ──────────────────────────────
const SECTION_ID = '2:91' // 03 · Components
const V = {
  card: 'VariableID:2:27', border: 'VariableID:2:29', textPrimary: 'VariableID:2:31',
  caption: 'VariableID:2:34', warn: 'VariableID:2:42',
  radControl: 'VariableID:2:63', sp3: 'VariableID:2:50',
}
const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const bound = async (varId, fallback) => {
  const v = await figma.variables.getVariableByIdAsync(varId)
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: hex(fallback) }, 'color', v)
}
const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('03 · Components 섹션(2:91)을 찾을 수 없음 — 올바른 파일에서 실행했는지 확인')

// 이미 만들어져 있으면 중복 생성 방지
if (!section.findOne || !section.findOne(n => n.name === 'ShowtimeCell')) {
  const radVar = await figma.variables.getVariableByIdAsync(V.radControl)
  const sp3Var = await figma.variables.getVariableByIdAsync(V.sp3)
  // [이름, 시간, 좌석, 관, 잔여석적음, 매진]
  const defs = [
    ['Default', '19:30', '82석', 'A관', false, false],
    ['Low', '21:40', '6석', 'A관', true, false],
    ['Soldout', '17:00', '매진', 'B관', false, true],
  ]
  const comps = []
  for (const [name, time, seat, hall, low, soldout] of defs) {
    const c = figma.createComponent()
    c.name = `State=${name}`
    c.layoutMode = 'VERTICAL'
    c.primaryAxisSizingMode = 'AUTO'
    c.counterAxisSizingMode = 'FIXED'
    c.itemSpacing = 4
    c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 12
    c.resize(100, 80)
    for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) c.setBoundVariable(k, sp3Var)
    for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) c.setBoundVariable(k, radVar)
    c.fills = [await bound(V.card, '#FFFFFF')]
    c.strokes = [await bound(V.border, '#DDD9CF')]
    c.strokeWeight = 1

    const t = figma.createText()
    t.fontName = P('Bold') // num/time 17/700 tnum
    t.characters = time
    t.fontSize = 17
    t.lineHeight = { unit: 'PERCENT', value: 100 }
    t.fills = [await bound(V.textPrimary, '#1A1714')]
    if (soldout) t.textDecoration = 'STRIKETHROUGH'
    c.appendChild(t)

    const s = figma.createText()
    s.fontName = P('SemiBold') // num/seat 12/600
    s.characters = seat
    s.fontSize = 12
    s.lineHeight = { unit: 'PERCENT', value: 100 }
    s.fills = [low ? await bound(V.warn, '#D97706') : await bound(V.caption, '#857F76')]
    c.appendChild(s)

    const h = figma.createText()
    h.fontName = P('Regular') // hall 11
    h.characters = hall
    h.fontSize = 11
    h.lineHeight = { unit: 'PERCENT', value: 100 }
    h.fills = [await bound(V.caption, '#857F76')]
    c.appendChild(h)

    if (soldout) c.opacity = 0.45
    comps.push(c)
  }
  const set = figma.combineAsVariants(comps, section)
  set.name = 'ShowtimeCell'
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 16
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24
  set.x = 64
  set.y = 500

  const label = figma.createText()
  label.fontName = KIMM
  label.characters = 'ShowtimeCell'
  label.fontSize = 20
  label.fills = [{ type: 'SOLID', color: hex('#1A1714') }]
  section.appendChild(label)
  label.x = 64
  label.y = 460
  console.log('ShowtimeCell 생성 완료:', set.id)
} else {
  console.log('ShowtimeCell 이미 존재 — 생성 건너뜀')
}

console.log('전부 완료. 파일 저장하면 끝.')
