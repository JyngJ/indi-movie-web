// Radius·Shadow 용도 주석 + 고도(Elevation) 다이어그램 (Scripter용)
// 대상: "spacing / radius / shadow 완료" 섹션

const RADIUS_FRAME = '42:1134'
const SHADOW_FRAME = '42:1158'

const P = s => ({ family: 'Pretendard', style: s })
for (const s of ['Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const INK = hex('#0C0A08'), MID = hex('#8D8781'), PAPER = hex('#FAF9F8'), WHITE = hex('#FFFFFF'), BORDER = hex('#EAE5E1')

const addUsage = async (frameId, usages) => {
  const frame = await figma.getNodeByIdAsync(frameId)
  if (!frame) return ['프레임 못 찾음: ' + frameId]
  const log = []
  for (const child of frame.children) {
    const usage = usages[child.name]
    if (!usage) continue
    // 이미 붙였으면 스킵
    if (child.findOne && child.findOne(n => n.type === 'TEXT' && n.name === 'usage')) continue
    const t = figma.createText()
    t.name = 'usage'
    t.fontName = P('Regular')
    t.characters = usage
    t.fontSize = 11
    t.fills = [{ type: 'SOLID', color: MID }]
    child.appendChild(t) // 오토레이아웃이면 마지막에 붙음
    log.push(`${child.name}: ${usage}`)
  }
  return log
}

// ── Radius 용도 ──
const radiusLog = await addUsage(RADIUS_FRAME, {
  'radius/poster': '포스터·썸네일 — 인쇄물 모서리. 2px로 종이 질감',
  'radius/badge': '배지·오버레이 칩·인디케이터',
  'radius/button': '버튼 전용 (control 12는 버튼엔 과함)',
  'radius/control': '입력·칩·카드·시간표 셀',
  'radius/popover': '드롭다운·팝오버·모달',
  'radius/sheet': '바텀시트 상단 모서리',
  'radius/pill': '검색창·필터 칩·FAB pill',
})

// ── Shadow 용도 ──
const shadowLog = await addUsage(SHADOW_FRAME, {
  sm: 'E1 · 카드, 버튼 hover',
  md: 'E2 · FAB, 드롭다운, 지도 팝업',
  lg: 'E3 · 모달, 다이얼로그',
  sheet: '바텀시트 전용 — offset 0 ambient',
  pin: '지도 핀 전용 1겹',
  popup: '⚠ md로 흡수됨 — 이 견본은 삭제 예정',
})

// ── 고도 다이어그램 ──
const shadowFrame = await figma.getNodeByIdAsync(SHADOW_FRAME)
const section = shadowFrame.parent
const oldDia = section.findOne(n => n.name === 'Elevation Model')
if (oldDia) oldDia.remove()

const effectStyles = await figma.getLocalEffectStylesAsync()
const fxId = name => {
  const st = effectStyles.find(s => s.name === name)
  return st ? st.id : null
}

const dia = figma.createFrame()
dia.name = 'Elevation Model'
dia.resize(520, 360)
dia.fills = [{ type: 'SOLID', color: PAPER }]
dia.cornerRadius = 16
dia.clipsContent = true
section.appendChild(dia)
dia.x = shadowFrame.x + shadowFrame.width + 60
dia.y = shadowFrame.y

const title = figma.createText()
title.fontName = { family: 'KIMM_Bold', style: 'B' }
title.characters = 'Elevation'
title.fontSize = 20
title.letterSpacing = { unit: 'PERCENT', value: 5 }
title.fills = [{ type: 'SOLID', color: INK }]
dia.appendChild(title)
title.x = 24; title.y = 20

// E0 페이지 바닥
const ground = figma.createRectangle()
ground.resize(472, 10)
ground.cornerRadius = 2
ground.fills = [{ type: 'SOLID', color: BORDER }]
dia.appendChild(ground)
ground.x = 24; ground.y = 316

const mkLabel = (chars, x, y, strong) => {
  const t = figma.createText()
  t.fontName = P(strong ? 'Medium' : 'Regular')
  t.characters = chars
  t.fontSize = 11
  t.fills = [{ type: 'SOLID', color: strong ? INK : MID }]
  dia.appendChild(t)
  t.x = x; t.y = y
  return t
}
mkLabel('E0 · 페이지 (미색 종이) — 그림자 없음', 24, 330, false)

// 고도별 카드: 바닥에서 떨어진 높이 = 고도
const LEVELS = [
  ['E1', '2.0/shadow/sm', '카드 · 버튼 hover', 60, 262],
  ['E2', '2.0/shadow/md', 'FAB · 드롭다운 · 팝업', 130, 196],
  ['E3', '2.0/shadow/lg', '모달 · 다이얼로그', 210, 118],
]
for (const [level, styleName, desc, x, y] of LEVELS) {
  const card = figma.createRectangle()
  card.resize(130, 44)
  card.cornerRadius = 8
  card.fills = [{ type: 'SOLID', color: WHITE }]
  const id = fxId(styleName)
  if (id) await card.setEffectStyleIdAsync(id)
  dia.appendChild(card)
  card.x = x; card.y = y
  // 바닥까지 점선 (높이 표시)
  const line = figma.createLine()
  dia.appendChild(line)
  line.resize(316 - (y + 44), 0)
  line.rotation = 90
  line.x = x + 65; line.y = 316
  line.strokes = [{ type: 'SOLID', color: hex('#C6BFB9') }]
  line.strokeWeight = 1
  line.dashPattern = [3, 4]
  mkLabel(`${level} · ${styleName.replace('2.0/shadow/', '')}`, x + 140, y + 8, true)
  mkLabel(desc, x + 140, y + 24, false)
}

// 바텀시트: 화면 하단에 붙은 면 — ambient
const sheet = figma.createRectangle()
sheet.resize(150, 54)
sheet.topLeftRadius = 20; sheet.topRightRadius = 20
sheet.fills = [{ type: 'SOLID', color: WHITE }]
const sheetId = fxId('2.0/shadow/sheet')
if (sheetId) await sheet.setEffectStyleIdAsync(sheetId)
dia.appendChild(sheet)
sheet.x = 346; sheet.y = 272
mkLabel('sheet · 하단 고정 면', 346, 250, true)
mkLabel('offset 0 — 위 가장자리만 노출', 346, 336, false)

console.log('radius:', radiusLog.length, 'shadow:', shadowLog.length, '주석 + 다이어그램 완료')
