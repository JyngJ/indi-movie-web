// GV 핀 개선안 v2 (2026-08-10) — 사용자 확정 방향 반영
//  · DS 카드 / 확장 스택 폐지 — 지도 위에 표 같은 UI를 띄우지 않는다
//  · 다건은 "카드가 여러 장 쌓인" 모습 + 우상단 +N 배지 하나로 통일
//  · 전부 오토 레이아웃 — 패딩/간격은 spacing 변수, radius는 radius 변수, 타이포는 2.0 스타일,
//    색은 2.0 컬렉션 변수, 그림자는 2.0/shadow 이펙트 스타일 링크
//  · 배리언트로 정리: 2.0/GvPin (Count=single|stack × State=default|selected)
//                    2.0/GvChip (Type=gv|festival × State=default|selected)
// Scripter에서 Run. 기존 'GV 핀 — 개선안' 섹션은 교체된다.

const report = []

/* ── 토큰 인프라 ─────────────────────────────────────────────── */
const HEX = {
  'gv/900': '#3E1782', 'primary/700': '#404E81',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/900': '#0C0A08',
  'white': '#FFFFFF',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

const colorVar = new Map(), floatVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  const is20 = col.name.includes('2.0')
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (!v) continue
    const map = v.resolvedType === 'COLOR' ? colorVar : v.resolvedType === 'FLOAT' ? floatVar : null
    if (map && (!map.has(v.name) || is20)) map.set(v.name, v)
  }
}
/** 색 이름 후보를 순서대로 찾아 변수 바인딩, 없으면 hex 솔리드 */
function paint(names, opacity) {
  const list = Array.isArray(names) ? names : [names]
  const hex = list.map(n => HEX[n]).find(Boolean) ?? '#FF00FF'
  const solid = { type: 'SOLID', color: rgb(hex) }
  if (opacity != null) solid.opacity = opacity
  for (const n of list) {
    const v = colorVar.get(n)
    if (v) return figma.variables.setBoundVariableForPaint(solid, 'color', v)
  }
  report.push('색 변수 없음: ' + list[0])
  return solid
}
const SPACING = { 4: 'spacing/1', 8: 'spacing/2', 12: 'spacing/3', 16: 'spacing/4', 24: 'spacing/6', 32: 'spacing/8', 48: 'spacing/12' }
const RADIUS = { 4: 'radius/badge', 8: 'radius/button', 12: 'radius/control', 16: 'radius/popover', 20: 'radius/sheet', 9999: 'radius/pill' }
function bind(node, field, varName) {
  const v = floatVar.get(varName)
  if (!v) { report.push('변수 없음: ' + varName); return }
  try { node.setBoundVariable(field, v) } catch { report.push('바인딩 실패: ' + field) }
}
function autoBind(node) {
  for (const f of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing']) {
    if (SPACING[node[f]]) bind(node, f, SPACING[node[f]])
  }
  const r = node.cornerRadius
  if (typeof r === 'number' && RADIUS[r]) {
    for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(node, f, RADIUS[r])
  }
}

const textStyles = await figma.getLocalTextStylesAsync()
const tStyle = (n) => textStyles.find(s => s.name === n)
const effectStyles = await figma.getLocalEffectStylesAsync()
const eStyle = (n) => effectStyles.find(s => s.name === n)
async function applyShadow(node, name, fallback) {
  const st = eStyle(name)
  if (st) { await node.setEffectStyleIdAsync(st.id); return }
  report.push('이펙트 스타일 없음: ' + name)
  if (fallback) node.effects = fallback
}

const P = (style) => ({ family: 'Pretendard', style })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))

/** 텍스트 — 2.0 스타일 링크. 스타일이 없으면 폰트/크기로 폴백 */
async function ST(chars, styleName, colorName, fallback) {
  const t = figma.createText()
  const st = tStyle(styleName)
  if (st) await t.setTextStyleIdAsync(st.id)
  else {
    report.push('텍스트 스타일 없음: ' + styleName)
    t.fontName = fallback?.font ?? P('Regular')
    t.fontSize = fallback?.size ?? 12
  }
  t.characters = chars
  t.fills = [paint(colorName)]
  t.textAutoResize = 'WIDTH_AND_HEIGHT'
  return t
}

/** 오토 레이아웃 프레임 */
function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL'
  if (o.gap != null) f.itemSpacing = o.gap
  if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
  f.fills = o.fill ? [paint(o.fill, o.fillOpacity)] : []
  if (o.r != null) f.cornerRadius = o.r
  f.counterAxisAlignItems = o.align ?? 'MIN'
  if (o.mainAlign) f.primaryAxisAlignItems = o.mainAlign
  if (o.w != null && o.h != null) f.resize(o.w, o.h)
  else if (o.w != null) f.resize(o.w, f.height)
  else if (o.h != null) f.resize(f.width, o.h)
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW ?? 1.5; f.strokeAlign = 'INSIDE' }
  f.clipsContent = o.clip ?? false
  autoBind(f)
  return f
}

/* ── 규격 ────────────────────────────────────────────────────
   카드 폭 168 · 패딩 12 · 행 간격 4 · radius 12(control)
   타이포: 배지 2.0/label(10) · 시간·감독 2.0/meta(12) · 제목 2.0/body-strong(14)
   쌓임: 뒤 카드 2장이 아래로 6·12px 내려가며 좌우로 8·16px 좁아진다 */
const CARD_W = 168
const STACK_STEP_Y = 6
const STACK_INSET_X = 8
const STEM_H = 28
const DOT_D = 8

/** GV / +N 배지 — 알약, 10/700 */
async function badge(label) {
  const b = F(`badge/${label}`, { dir: 'H', gap: 4, pad: [4, 8, 4, 8], fill: ['gv', 'gv/900'], r: 9999, align: 'CENTER' })
  b.appendChild(await ST(label, '2.0/label', ['on-accent', 'white'], { font: P('Bold'), size: 10 }))
  return b
}

const GHOST_H = 40

/** 카드 한 장 — 오토 레이아웃 */
async function card(o = {}) {
  const { selected = false, extra = 0, ghost = false, width = CARD_W } = o
  const c = F(ghost ? 'card/뒤' : 'card', {
    dir: 'V', gap: 4, pad: ghost ? [0, 0, 0, 0] : [12, 12, 12, 12],
    fill: ['surface/card', 'white'], r: 12, w: width, h: ghost ? GHOST_H : undefined,
    stroke: selected ? ['primary/base', 'primary/700'] : ['neutral/200', 'border'],
    strokeW: selected ? 2 : 1.5,
  })
  await applyShadow(c, selected ? '2.0/shadow/md' : '2.0/shadow/sm', [
    { type: 'DROP_SHADOW', color: { r: 0.08, g: 0.06, b: 0.04, a: 0.12 }, offset: { x: 0, y: 2 }, radius: 6, spread: 0, visible: true, blendMode: 'NORMAL' },
  ])
  if (ghost) return c   // 뒤에 깔리는 카드는 내용 없이 실루엣만

  /* 1행 — GV 배지 · 시간 · (오른쪽 끝) +N */
  const top = F('row/top', { dir: 'H', gap: 8, align: 'CENTER' })
  c.appendChild(top)
  top.layoutSizingHorizontal = 'FILL'
  top.appendChild(await badge('GV'))
  const time = await ST('19:30 상영 후', '2.0/meta', ['neutral/500', 'text/caption'], { font: P('Medium'), size: 12 })
  top.appendChild(time)
  time.textAutoResize = 'HEIGHT'           // FILL로 늘리려면 폭 자동확장을 먼저 끈다
  time.layoutGrow = 1                      // 남는 폭을 먹어 +N을 오른쪽 끝으로 민다
  if (extra > 0) top.appendChild(await badge(`+${extra}`))

  /* 2행 — 제목 */
  const title = await ST('괴인', '2.0/body-strong', ['neutral/900', 'text/primary'], { font: P('Bold'), size: 14 })
  c.appendChild(title)
  title.textAutoResize = 'HEIGHT'
  title.layoutSizingHorizontal = 'FILL'

  /* 3행 — 감독 */
  const sub = await ST('이정홍 감독', '2.0/meta', ['neutral/500', 'text/caption'], { font: P('Regular'), size: 12 })
  c.appendChild(sub)
  sub.textAutoResize = 'HEIGHT'
  sub.layoutSizingHorizontal = 'FILL'
  return c
}

/** 카드 영역 — single이면 카드 한 장, stack이면 뒤에 2장 깔고 위에 본 카드 */
async function cardArea({ selected, stack }) {
  const main = await card({ selected, extra: stack ? 2 : 0 })
  if (!stack) return main

  const area = figma.createFrame()
  area.name = 'cards/쌓임'
  area.fills = []
  area.clipsContent = false
  // 뒤 → 앞 순으로 붙인다 (뒤 카드가 아래·안쪽으로 물러난 것처럼)
  const back2 = await card({ selected, ghost: true, width: CARD_W - STACK_INSET_X * 2 })
  const back1 = await card({ selected, ghost: true, width: CARD_W - STACK_INSET_X })
  area.appendChild(back2); area.appendChild(back1); area.appendChild(main)
  const h = main.height + STACK_STEP_Y * 2
  area.resize(CARD_W, h)
  main.x = 0; main.y = 0
  back1.x = STACK_INSET_X / 2; back1.y = main.height - back1.height + STACK_STEP_Y
  back2.x = STACK_INSET_X; back2.y = main.height - back2.height + STACK_STEP_Y * 2
  return area
}

/** 핀 = 카드 영역 + 스템 + 점 */
async function pin({ selected = false, stack = false } = {}) {
  const wrap = F('GvPin', { dir: 'V', gap: 0, align: 'CENTER' })
  wrap.appendChild(await cardArea({ selected, stack }))
  const stem = F('stem', { dir: 'V', w: 2, h: STEM_H, fill: ['gv', 'gv/900'] })
  stem.opacity = 0.75
  wrap.appendChild(stem)
  const dot = figma.createEllipse()
  dot.resize(DOT_D, DOT_D)
  dot.fills = [paint(['gv', 'gv/900'])]
  dot.strokes = [paint(['neutral/100', 'surface/bg'])]
  dot.strokeWeight = 2
  wrap.appendChild(dot)
  return wrap
}

/** 접힘 칩 (zoom ≤ 13) — 알약 h32, 여유 있는 패딩 */
async function chip({ festival = false, selected = false } = {}) {
  const c = F('GvChip', { dir: 'H', gap: 8, pad: [8, 12, 8, 12], fill: ['gv', 'gv/900'], r: 9999, align: 'CENTER' })
  await applyShadow(c, '2.0/shadow/sm', [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: 2 }, radius: 6, spread: 0, visible: true, blendMode: 'NORMAL' },
  ])
  if (selected) {
    c.strokes = [paint(['neutral/100', 'surface/bg'])]
    c.strokeWeight = 2
    c.strokeAlign = 'OUTSIDE'
  }
  c.appendChild(await ST(festival ? '인디다큐페스티발 · 5' : 'GV 3개', '2.0/label', ['on-accent', 'white'], { font: P('Bold'), size: 10 }))
  return c
}

/* ── 컴포넌트 세트 만들기 ─────────────────────────────────── */
/** 프레임 → 컴포넌트. createComponentFromNode가 패딩·fill·radius·이펙트까지 그대로 보존한다.
 *  (자식만 옮기는 방식은 프레임 속성이 날아가 칩 패딩이 사라졌었다) */
function toComponent(node, name) {
  let c
  if (typeof figma.createComponentFromNode === 'function') {
    c = figma.createComponentFromNode(node)
  } else {
    c = figma.createComponent()
    c.resize(node.width, node.height)
    for (const k of ['layoutMode', 'itemSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'primaryAxisAlignItems', 'counterAxisAlignItems', 'primaryAxisSizingMode', 'counterAxisSizingMode',
      'fills', 'strokes', 'strokeWeight', 'strokeAlign', 'cornerRadius', 'effects', 'clipsContent', 'opacity']) {
      try { c[k] = node[k] } catch { /* 일부 속성은 레이아웃 모드에 따라 불가 */ }
    }
    for (const child of [...node.children]) c.appendChild(child)
    node.remove()
  }
  c.name = name
  return c
}

const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('GV 핀 — 개선안'))
const section = figma.createSection()
section.name = 'GV 핀 — 개선안 v2 (2026-08-10)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
  section.x = maxX + 200; section.y = 0
}

/* 섹션 안의 노드 좌표는 페이지 절대 좌표다 — 섹션 원점을 더해서 배치한다 */
const OX = section.x, OY = section.y

/* 핀 배리언트 4종 */
const pinComps = []
for (const stack of [false, true]) {
  for (const selected of [false, true]) {
    const node = await pin({ selected, stack })
    section.appendChild(node)
    pinComps.push(toComponent(node, `Count=${stack ? 'stack' : 'single'}, State=${selected ? 'selected' : 'default'}`))
  }
}
const pinSet = figma.combineAsVariants(pinComps, section)
pinSet.name = '2.0/GvPin'
pinSet.layoutMode = 'HORIZONTAL'
pinSet.itemSpacing = 48
pinSet.paddingTop = 48; pinSet.paddingBottom = 48; pinSet.paddingLeft = 48; pinSet.paddingRight = 48
pinSet.primaryAxisSizingMode = 'AUTO'
pinSet.counterAxisSizingMode = 'AUTO'
pinSet.counterAxisAlignItems = 'MIN'
pinSet.x = OX + 80; pinSet.y = OY + 120

/* 칩 배리언트 4종 */
const chipComps = []
for (const festival of [false, true]) {
  for (const selected of [false, true]) {
    const node = await chip({ festival, selected })
    section.appendChild(node)
    chipComps.push(toComponent(node, `Type=${festival ? 'festival' : 'gv'}, State=${selected ? 'selected' : 'default'}`))
  }
}
const chipSet = figma.combineAsVariants(chipComps, section)
chipSet.name = '2.0/GvChip'
chipSet.layoutMode = 'HORIZONTAL'
chipSet.itemSpacing = 32
chipSet.paddingTop = 32; chipSet.paddingBottom = 32; chipSet.paddingLeft = 32; chipSet.paddingRight = 32
chipSet.primaryAxisSizingMode = 'AUTO'
chipSet.counterAxisSizingMode = 'AUTO'
chipSet.counterAxisAlignItems = 'CENTER'
chipSet.x = OX + 80
chipSet.y = pinSet.y + pinSet.height + 96

/* 라벨·노트 */
async function label(chars, x, y) {
  const t = await ST(chars, '2.0/body-strong', ['neutral/600', 'text/sub'], { font: P('SemiBold'), size: 14 })
  section.appendChild(t); t.x = x; t.y = y
  return t
}
await label('2.0/GvPin — 단건 / 다건(카드 쌓임 + N) × 기본 / 선택', OX + 80, OY + 64)
await label('2.0/GvChip — 접힘 칩 (zoom ≤ 13)', OX + 80, chipSet.y - 56)

const note = await ST([
  'GV 핀 v2 — 확정 방향',
  '· DS 카드·확장 스택 폐지 — 지도 위에 표를 띄우지 않는다. 다건은 카드가 쌓인 모습 + 우상단 +N 하나로 끝낸다.',
  `· 카드: 폭 ${CARD_W} · 패딩 12 · 행 간격 4 · radius 12(control) · 보더 1.5 neutral/200 · shadow sm(선택 시 md)`,
  `· 쌓임: 뒤 카드 2장이 아래로 ${STACK_STEP_Y}px씩 내려가며 좌우로 ${STACK_INSET_X}px씩 좁아진다`,
  '· 타이포: 배지 2.0/label(10) · 시간·감독 2.0/meta(12) · 제목 2.0/body-strong(14)',
  '· 선택: primary 보더 2 + shadow md (gv 보라는 정체성 배지·스템·점에만)',
  '· 전부 오토 레이아웃 — 패딩/간격은 spacing 변수, radius는 radius 변수 바인딩',
  '확정되면 GvPinSlots.tsx·GvMarkerIcon.tsx 이식 (GvDsCard·GvExpandedStack·GvStackRow 삭제)',
].join('\n'), '2.0/meta', ['neutral/600', 'text/sub'], { font: P('Regular'), size: 12 })
section.appendChild(note)
note.x = OX + 80
note.y = chipSet.y + chipSet.height + 64

section.resizeWithoutConstraints(
  Math.max(pinSet.x + pinSet.width, chipSet.x + chipSet.width, note.x + note.width) - OX + 80,
  note.y + note.height - OY + 80,
)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`GV 핀 v2 생성${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log([...new Set(report)].join('\n'))
