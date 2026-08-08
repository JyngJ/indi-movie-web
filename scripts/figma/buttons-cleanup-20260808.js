// Buttons 2.0 제안 — 전면 정리 (2026-08-08). 세트 재생성 없음, in-place 수정 + 배치 재구성.
//  1) Tertiary 재정의: 아웃라인 폐지 → 그레이스케일 면. default neutral/200 · hover 300 · pressed 400, 텍스트 neutral/900
//  2) 텍스트 스타일 적용: sm=2.0/meta(R12) · md=2.0/body(M14) · lg·full=2.0/title(B16) — 사용자 웨이트 패턴과 동일
//  3) 스페이싱·래디우스 변수 바인딩: pad sm/md/lg = spacing/4·8·12 (2.0 컬렉션), gap=spacing/2(8), radius=radius/button
//  4) 배치 재구성: 변형을 [variant 행 × (sm·md·lg 기본 3종 + 상태 3종)] 격자로, full은 하단 행.
//     떠돌던 라벨·리포트 텍스트 정리, 세트 간 간격 spacing 리듬(64)으로.
// Scripter에서 Run.

const HEX = {
  'neutral/150': '#F3F0ED', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9', 'neutral/400': '#A7A19A',
  'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/900': '#0C0A08', 'white': '#FFFFFF',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

// 색 변수: 2.0 컬렉션 우선
const colorVarByName = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  const is20 = col.name.includes('2.0')
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (!v || v.resolvedType !== 'COLOR') continue
    if (!colorVarByName.has(v.name) || is20) colorVarByName.set(v.name, v)
  }
}
// 숫자 변수(스페이싱·래디우스): 2.0 컬렉션 우선
const floatVarByName = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  const is20 = col.name.includes('2.0')
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (!v || v.resolvedType !== 'FLOAT') continue
    if (!floatVarByName.has(v.name) || is20) floatVarByName.set(v.name, v)
  }
}
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = colorVarByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
function bindNum(node, field, varName) {
  const v = floatVarByName.get(varName)
  if (!v) return false
  try { node.setBoundVariable(field, v); return true } catch { return false }
}

for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)
const textStyles = await figma.getLocalTextStylesAsync()
const styleByName = new Map(textStyles.map(s => [s.name, s]))
const SIZE_STYLE = { sm: '2.0/meta', md: '2.0/body', lg: '2.0/title', full: '2.0/title' }

const report = []
const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Buttons 2.0 제안 (2026-08-08)')
if (!section) { figma.notify('제안 섹션 없음'); throw new Error('no section') }

/* ── 0. 떠돌이 정리: 세트·단일 컴포넌트 빼고 전부 삭제 ───────── */
for (const n of [...section.children]) {
  if (n.type !== 'COMPONENT_SET' && n.type !== 'COMPONENT') n.remove()
}
const sets = Object.fromEntries(section.children.filter(n => n.type === 'COMPONENT_SET').map(n => [n.name, n]))
const scrollNav = section.children.find(n => n.type === 'COMPONENT' && n.name.includes('ScrollNav'))

/* ── 1·2·3. Button 세트 손질 ─────────────────────────────────── */
const btnSet = sets['2.0/Button']
if (!btnSet) { figma.notify('2.0/Button 없음'); throw new Error('no button set') }
const PAD_VAR = { sm: 'spacing/4', md: 'spacing/8', lg: 'spacing/12' }
const PAD_PX = { sm: 16, md: 32, lg: 48 }

let tertiary = 0, styled = 0, bound = 0
for (const v of btnSet.children) {
  const m = Object.fromEntries(v.name.split(',').map(s => s.trim().split('=')))
  const { Variant: vName, Size: size, State: state } = m

  // Tertiary 재정의 — 그레이스케일 면, 보더 제거
  if (vName === 'Tertiary') {
    v.strokes = []
    const bg = state === 'hover' ? 'neutral/300' : state === 'pressed' ? 'neutral/400' : 'neutral/200'
    v.fills = [paint(bg)]
    if (state === 'disabled') v.opacity = 0.4
    for (const t of v.findAll(n => n.type === 'TEXT')) t.fills = [paint('neutral/900')]
    // 아이콘 인스턴스 색도 통일
    for (const inst of v.findAll(n => n.type === 'INSTANCE')) {
      const p = paint('neutral/900')
      for (const vec of inst.findAll(n => 'strokes' in n)) {
        try { if (vec.strokes && vec.strokes.length) vec.strokes = [p] } catch { /* 무시 */ }
      }
    }
    tertiary++
  }

  // 텍스트 스타일 적용
  const styleName = SIZE_STYLE[size]
  const style = styleName && styleByName.get(styleName)
  if (style) {
    for (const t of v.findAll(n => n.type === 'TEXT')) {
      const fillsBackup = t.fills
      await t.setTextStyleIdAsync(style.id)
      t.fills = fillsBackup
      styled++
    }
  }

  // 스페이싱·래디우스 변수 바인딩
  if (PAD_VAR[size]) {
    v.paddingLeft = PAD_PX[size]; v.paddingRight = PAD_PX[size]
    if (bindNum(v, 'paddingLeft', PAD_VAR[size])) bound++
    bindNum(v, 'paddingRight', PAD_VAR[size])
  }
  v.itemSpacing = 8
  bindNum(v, 'itemSpacing', 'spacing/2')
  bindNum(v, 'topLeftRadius', 'radius/button'); bindNum(v, 'topRightRadius', 'radius/button')
  bindNum(v, 'bottomLeftRadius', 'radius/button'); bindNum(v, 'bottomRightRadius', 'radius/button')
}
report.push(`Tertiary 재정의 ${tertiary} · 텍스트 스타일 ${styled} · 변수 바인딩 pad ${bound}`)

/* ── 4. Button 세트 내부 격자 재배치 ─────────────────────────── */
const V_ORDER = ['Primary', 'Secondary', 'Tertiary', 'TextOnly', 'Error']
const ROW_H = 52 + 44          // lg 높이 + 여백
const GAP = 16, GROUP_GAP = 48
{
  const P = 24  // 세트 내부 패딩
  // 행별 배치
  for (let vi = 0; vi < V_ORDER.length; vi++) {
    const vName = V_ORDER[vi]
    let x = P
    const rowY = P + vi * ROW_H
    const order = []
    for (const size of ['sm', 'md', 'lg']) for (const icon of ['none', 'left', 'right']) order.push({ size, icon, state: 'default' })
    for (const state of ['hover', 'pressed', 'disabled']) order.push({ size: 'md', icon: 'none', state })
    let group = ''
    for (const o of order) {
      const child = btnSet.children.find(c => c.name === `Variant=${vName}, Size=${o.size}, Icon=${o.icon}, State=${o.state}`)
      if (!child) continue
      const g = o.state === 'default' ? o.size : 'states'
      if (group && g !== group) x += GROUP_GAP - GAP
      group = g
      child.x = x; child.y = rowY + (ROW_H - 44 - child.height) / 2
      x += child.width + GAP
    }
  }
  // full 행
  let fx = P
  const fullY = P + V_ORDER.length * ROW_H
  for (const vName of V_ORDER) {
    const child = btnSet.children.find(c => c.name === `Variant=${vName}, Size=full, Icon=none, State=default`)
    if (!child) continue
    child.x = fx; child.y = fullY
    fx += child.width + GAP
  }
  // 세트 크기: 자식 바운딩 + 패딩
  let mw = 0, mh = 0
  for (const c of btnSet.children) { mw = Math.max(mw, c.x + c.width); mh = Math.max(mh, c.y + c.height) }
  btnSet.resizeWithoutConstraints(mw + P, mh + P)
}

/* ── 5. 세트 세로 스택 배치 + 라벨 ───────────────────────────── */
function T(chars, size, style, hex) {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style }
  t.fontSize = size
  t.characters = chars
  t.fills = [{ type: 'SOLID', color: rgb(hex) }]
  return t
}
const ORDER = [
  ['2.0/Button', 'Button — 행: Primary/Secondary/Tertiary(그레이스케일 면)/TextOnly/Error · 열: sm·md·lg(none/left/right) + 상태(hover/pressed/disabled) · 하단: full(모바일 358)'],
  ['2.0/IconButton', 'IconButton — ghost/overlay × 32/44 × default/hover/pressed'],
  ['2.0/Chip', 'Chip — filter/dropdown × off/on(+hover)'],
  ['2.0/SortToggle', 'SortToggle — default/hover/active/active-hover'],
  ['2.0/FAB', 'FAB — round/pill'],
]
let y = 120
for (const [name, desc] of ORDER) {
  const set = sets[name]
  if (!set) { report.push(`세트 없음: ${name}`); continue }
  const lbl = T(desc, 14, 'Bold', '#0C0A08')
  section.appendChild(lbl); lbl.x = 60; lbl.y = y
  set.x = 60; set.y = y + 28
  y = set.y + set.height + 64
}
if (scrollNav) {
  const lbl = T('ScrollNavButton — 단일 32', 14, 'Bold', '#0C0A08')
  section.appendChild(lbl); lbl.x = 60; lbl.y = y
  scrollNav.x = 60; scrollNav.y = y + 28
  y = scrollNav.y + scrollNav.height + 64
}

/* ── 노트 ────────────────────────────────────────────────────── */
const note = T([
  'Buttons 2.0 제안 — 정리판 (2026-08-08)',
  '· 텍스트: sm=2.0/meta(R12) · md=2.0/body(M14) · lg·full=2.0/title(B16) — 스타일 링크 적용됨',
  '· 패딩: sm=spacing/4(16) · md=spacing/8(32) · lg=spacing/12(48) — 변수 바인딩. gap=spacing/2(8), r=radius/button(8)',
  '· Tertiary = 그레이스케일 면: 200 → hover 300 → pressed 400, 텍스트 neutral/900, 보더 없음',
  '· Primary 700→800→900 · Secondary 150→200→300 · TextOnly 투명→200→300 · Error 900→다크닝 · disabled 40%',
  '· full = 358×52 (390 − 거터16×2)',
  ...(floatVarByName.has('spacing/4') ? [] : ['⚠ 2.0 스페이싱 변수 못 찾음 — 숫자만 적용됨']),
  ...report.map(r => '· ' + r),
].join('\n'), 13, 'Regular', '#726B65')
section.appendChild(note)
note.x = 60; note.y = 24
note.resize(1100, note.height)

section.resizeWithoutConstraints(Math.max(1900, 120 + (sets['2.0/Button'] ? sets['2.0/Button'].width : 0)), y + 80)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('Buttons 2.0 정리 완료')
