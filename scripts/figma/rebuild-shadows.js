// Shadow 2.0 (Scripter용)
// 1. shadow/base 색 변수 등록 (#140F0A 웜 브라운, EFFECT_COLOR scope)
// 2. 이펙트 스타일 "2.0/shadow/*" 신규 등록 — sm/md/lg 2겹(ambient+direct), sheet는 offset 0 ambient로 방향 수정
// 3. spacing/radius/shadow 섹션의 Shadow 견본에 새 스타일 적용

const SHADOW_FRAME_ID = '42:1158'
const COLLECTION_NAME = '영화볼지도 색상 - 2.0'
const BASE = { r: 20 / 255, g: 15 / 255, b: 10 / 255 } // #140F0A

// ── 1. shadow/base 변수 ──
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const coll = colls.find(c => c.name === COLLECTION_NAME)
let varMsg = '컬렉션 없음 — 변수 등록 건너뜀'
if (coll) {
  const names = []
  for (const id of coll.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    names.push(v.name)
  }
  if (!names.includes('shadow/base')) {
    const v = figma.variables.createVariable('shadow/base', coll, 'COLOR')
    v.setValueForMode(coll.modes[0].modeId, { ...BASE, a: 1 })
    v.description = '그림자 전용 색 — 웜 브라운. 불투명도는 각 이펙트 스타일에서 지정'
    v.scopes = ['EFFECT_COLOR']
    v.setVariableCodeSyntax('WEB', 'var(--shadow-base)')
    varMsg = 'shadow/base 변수 등록됨'
  } else varMsg = 'shadow/base 이미 존재'
}

// ── 2. 이펙트 스타일 2.0 ──
const sh = (y, blur, a, spread = 0) => ({
  type: 'DROP_SHADOW', color: { ...BASE, a }, offset: { x: 0, y }, radius: blur, spread,
  visible: true, blendMode: 'NORMAL',
})
// [이름, 이펙트들, 설명(고도)]
const DEFS = [
  ['2.0/shadow/sm', [sh(1, 2, 0.10), sh(2, 8, 0.04)],
    '고도 1 — 카드, 버튼 hover. direct+ambient 2겹'],
  ['2.0/shadow/md', [sh(2, 4, 0.10), sh(8, 20, 0.06)],
    '고도 2 — FAB, 드롭다운, 지도 팝업'],
  ['2.0/shadow/lg', [sh(4, 8, 0.10), sh(16, 40, 0.08)],
    '고도 3 — 모달, 다이얼로그'],
  ['2.0/shadow/sheet', [sh(0, 24, 0.14), sh(0, 6, 0.08)],
    '바텀시트 — offset 0 ambient (방향 없음: 화면 하단 고정 면)'],
  ['2.0/shadow/pin', [sh(2, 6, 0.18)],
    '지도 핀 — 1겹 유지 (작은 요소, 2겹은 과함)'],
]
const existing = await figma.getLocalEffectStylesAsync()
const styleIds = {}
let created = 0
for (const [name, effects, desc] of DEFS) {
  let st = existing.find(s => s.name === name)
  if (!st) { st = figma.createEffectStyle(); st.name = name; created++ }
  st.effects = effects
  st.description = desc
  styleIds[name] = st.id
}

// ── 3. 견본 적용 ──
const frame = await figma.getNodeByIdAsync(SHADOW_FRAME_ID)
const applied = []
if (frame) {
  // 기존 popup 견본은 md로 흡수 — lg와 사이라 통합 (역할: 지도 팝업 → md)
  const map = { sm: '2.0/shadow/sm', md: '2.0/shadow/md', lg: '2.0/shadow/lg', sheet: '2.0/shadow/sheet', pin: '2.0/shadow/pin', popup: '2.0/shadow/md' }
  for (const child of frame.children) {
    const target = map[child.name]
    if (!target) continue
    const rect = child.findOne ? child.findOne(n => n.type === 'RECTANGLE') : null
    if (rect) { await rect.setEffectStyleIdAsync(styleIds[target]); applied.push(`${child.name} → ${target}`) }
  }
  // 주석 텍스트
  await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
  const old = frame.parent.findOne(n => n.type === 'TEXT' && n.name === '쉐도우 리포트')
  if (old) old.remove()
  const rep = figma.createText()
  rep.name = '쉐도우 리포트'
  rep.fontName = { family: 'Pretendard', style: 'Regular' }
  rep.characters = `[Shadow 2.0] ${varMsg} · 스타일 ${created}개 신규\n` +
    `색: shadow/base #140F0A (웜 브라운 — 순검정 금지)\n` +
    `sm/md/lg 2겹(direct+ambient) · sheet는 offset 0 ambient로 방향 수정\n` +
    `popup 스타일은 md로 흡수, pin은 1겹 유지\n` +
    applied.join('\n')
  rep.fontSize = 11
  rep.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.04, b: 0.03 } }]
  frame.parent.appendChild(rep)
  rep.x = frame.x; rep.y = frame.y + frame.height + 24
}
