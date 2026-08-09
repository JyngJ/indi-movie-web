// GV 핀 개선안 v3 (2026-08-10) — 덤프 지적 반영
//  · 색: 2.0 컬렉션에서만 변수를 찾는다. 레거시 Primitives/Semantic에 같은 이름이 있어
//    구 색이 붙던 문제 해소 (치환표는 _pin-common.md)
//  · 배치: 섹션 절대 좌표 폐지 → 섹션 안 루트 오토 레이아웃 프레임 하나에 전부 쌓는다
//  · 컴포넌트화는 createComponentFromNode — 자식만 옮기면 패딩이 날아가 칩이 찌그러진다
//  방향(v2에서 확정): DS 카드·확장 스택 폐지, 다건은 카드가 쌓인 모습 + 우상단 +N
//  세트: 2.0/GvPin (Count=single|stack × State=default|selected) · 2.0/GvChip (Type=gv|festival × State)
// Scripter에서 Run. 기존 'GV 핀 — 개선안' 섹션은 교체된다.

const report = []

/* ── 토큰 인프라 — 2.0 컬렉션만 ──────────────────────────────── */
const HEX = {
  'gv/900': '#3E1782', 'primary/700': '#404E81',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/900': '#0C0A08',
  'white': '#FFFFFF',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

const colorVar = new Map(), floatVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue            // 레거시(1.0) 컬렉션은 아예 보지 않는다
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (!v) continue
    if (v.resolvedType === 'COLOR') colorVar.set(v.name, v)
    else if (v.resolvedType === 'FLOAT') floatVar.set(v.name, v)
  }
}
function paint(name, opacity) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] ?? '#FF00FF') }
  if (opacity != null) solid.opacity = opacity
  const v = colorVar.get(name)
  if (!v) { report.push('2.0 색 변수 없음: ' + name); return solid }
  return figma.variables.setBoundVariableForPaint(solid, 'color', v)
}
const SPACING = { 4: 'spacing/1', 8: 'spacing/2', 12: 'spacing/3', 16: 'spacing/4', 24: 'spacing/6', 32: 'spacing/8', 48: 'spacing/12', 64: 'spacing/16' }
const RADIUS = { 2: 'radius/poster', 4: 'radius/badge', 8: 'radius/button', 12: 'radius/control', 16: 'radius/popover', 20: 'radius/sheet', 9999: 'radius/pill' }
function bind(node, field, varName) {
  const v = floatVar.get(varName)
  if (!v) { report.push('숫자 변수 없음: ' + varName); return }
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
async function applyShadow(node, name) {
  const st = eStyle(name)
  if (st) await node.setEffectStyleIdAsync(st.id)
  else report.push('이펙트 스타일 없음: ' + name)
}

const P = (style) => ({ family: 'Pretendard', style })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))

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

function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : o.dir === 'NONE' ? 'NONE' : 'VERTICAL'
  if (f.layoutMode !== 'NONE') {
    if (o.gap != null) f.itemSpacing = o.gap
    if (o.pad != null) {
      const [t, r, b, l] = Array.isArray(o.pad) ? o.pad : [o.pad, o.pad, o.pad, o.pad]
      f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l
    }
    f.counterAxisAlignItems = o.align ?? 'MIN'
    if (o.mainAlign) f.primaryAxisAlignItems = o.mainAlign
  }
  f.fills = o.fill ? [paint(o.fill, o.fillOpacity)] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.w != null && o.h != null) f.resize(o.w, o.h)
  else if (o.w != null) f.resize(o.w, f.height)
  else if (o.h != null) f.resize(f.width, o.h)
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else if (f.layoutMode === 'VERTICAL') {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW ?? 1.5; f.strokeAlign = o.strokeAlign ?? 'INSIDE' }
  f.clipsContent = o.clip ?? false
  autoBind(f)
  return f
}

/** 프레임 → 컴포넌트. 패딩·fill·radius·이펙트를 그대로 보존한다 */
function toComponent(node, name) {
  const c = typeof figma.createComponentFromNode === 'function'
    ? figma.createComponentFromNode(node)
    : (() => {
        const k = figma.createComponent()
        k.resize(node.width, node.height)
        for (const key of ['layoutMode', 'itemSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'primaryAxisAlignItems', 'counterAxisAlignItems', 'primaryAxisSizingMode', 'counterAxisSizingMode',
          'fills', 'strokes', 'strokeWeight', 'strokeAlign', 'cornerRadius', 'effects', 'clipsContent']) {
          try { k[key] = node[key] } catch { /* 레이아웃 모드에 따라 불가한 속성 */ }
        }
        for (const child of [...node.children]) k.appendChild(child)
        node.remove()
        return k
      })()
  c.name = name
  return c
}

/* ── 규격 ────────────────────────────────────────────────────
   카드 폭 168 · 패딩 12 · 행 간격 4 · r12(control)
   타이포: 배지 2.0/label(10) · 시간·감독 2.0/meta(12) · 제목 2.0/body-strong(14)
   쌓임: 뒤 카드 2장이 아래로 6·12px 내려가며 좌우로 8·16px 좁아진다 */
const CARD_W = 168
const CARD_PAD = 12
const STACK_STEP_Y = 6
const STACK_INSET_X = 8
const GHOST_H = 40
const STEM_H = 28
const DOT_D = 8

/** GV / +N 배지 — 알약, 10/700 */
async function badge(label) {
  const b = F(`badge/${label}`, { dir: 'H', pad: [4, 8, 4, 8], fill: 'gv/900', r: 9999, align: 'CENTER' })
  b.appendChild(await ST(label, '2.0/label', 'white', { font: P('Bold'), size: 10 }))
  return b
}

/** 카드 한 장 */
async function card({ selected = false, extra = 0, ghost = false, width = CARD_W } = {}) {
  const c = F(ghost ? 'card/뒤' : 'card', {
    dir: 'V', gap: 4, pad: ghost ? 0 : CARD_PAD, fill: 'white', r: 12, w: width, h: ghost ? GHOST_H : undefined,
    stroke: selected ? 'primary/700' : 'neutral/200', strokeW: selected ? 2 : 1.5,
  })
  await applyShadow(c, selected ? '2.0/shadow/md' : '2.0/shadow/sm')
  if (ghost) return c   // 뒤에 깔리는 카드는 내용 없이 실루엣만

  const top = F('row/top', { dir: 'H', gap: 8, align: 'CENTER' })
  c.appendChild(top)
  top.layoutSizingHorizontal = 'FILL'
  top.appendChild(await badge('GV'))
  const time = await ST('19:30 상영 후', '2.0/meta', 'neutral/500', { font: P('Medium'), size: 12 })
  top.appendChild(time)
  time.textAutoResize = 'HEIGHT'           // FILL로 늘리려면 폭 자동확장을 먼저 끈다
  time.layoutGrow = 1                      // 남는 폭을 먹어 +N을 오른쪽 끝으로 민다
  if (extra > 0) top.appendChild(await badge(`+${extra}`))

  const title = await ST('괴인', '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 })
  c.appendChild(title)
  title.textAutoResize = 'HEIGHT'
  title.layoutSizingHorizontal = 'FILL'

  const sub = await ST('이정홍 감독', '2.0/meta', 'neutral/500', { font: P('Regular'), size: 12 })
  c.appendChild(sub)
  sub.textAutoResize = 'HEIGHT'
  sub.layoutSizingHorizontal = 'FILL'
  return c
}

/** 카드 영역 — stack이면 뒤에 실루엣 2장 */
async function cardArea({ selected, stack }) {
  const main = await card({ selected, extra: stack ? 2 : 0 })
  if (!stack) return main
  const area = F('cards/쌓임', { dir: 'NONE' })
  area.clipsContent = false
  const back2 = await card({ selected, ghost: true, width: CARD_W - STACK_INSET_X * 2 })
  const back1 = await card({ selected, ghost: true, width: CARD_W - STACK_INSET_X })
  area.appendChild(back2); area.appendChild(back1); area.appendChild(main)
  area.resize(CARD_W, main.height + STACK_STEP_Y * 2)
  main.x = 0; main.y = 0
  back1.x = STACK_INSET_X / 2; back1.y = main.height - back1.height + STACK_STEP_Y
  back2.x = STACK_INSET_X; back2.y = main.height - back2.height + STACK_STEP_Y * 2
  return area
}

/** 핀 = 카드 영역 + 스템 + 점 */
async function pin({ selected = false, stack = false } = {}) {
  const wrap = F('GvPin', { dir: 'V', gap: 0, align: 'CENTER' })
  wrap.appendChild(await cardArea({ selected, stack }))
  const stem = F('stem', { dir: 'V', w: 2, h: STEM_H, fill: 'gv/900' })
  stem.opacity = 0.75
  wrap.appendChild(stem)
  const dot = figma.createEllipse()
  dot.resize(DOT_D, DOT_D)
  dot.fills = [paint('gv/900')]
  dot.strokes = [paint('neutral/100')]
  dot.strokeWeight = 2
  wrap.appendChild(dot)
  return wrap
}

/** 접힘 칩 (zoom ≤ 13) */
async function chip({ festival = false, selected = false } = {}) {
  const c = F('GvChip', { dir: 'H', pad: [8, 12, 8, 12], fill: 'gv/900', r: 9999, align: 'CENTER' })
  await applyShadow(c, '2.0/shadow/sm')
  if (selected) {
    c.strokes = [paint('neutral/100')]
    c.strokeWeight = 2
    c.strokeAlign = 'OUTSIDE'
  }
  c.appendChild(await ST(festival ? '인디다큐페스티발 · 5' : 'GV 3개', '2.0/label', 'white', { font: P('Bold'), size: 10 }))
  return c
}

/* ── 섹션: 루트 오토 레이아웃 하나에 전부 쌓는다 ──────────── */
const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('GV 핀 — 개선안'))
const section = figma.createSection()
section.name = 'GV 핀 — 개선안 v3 (2026-08-10)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
  section.x = maxX + 200; section.y = 0
}

const root = F('규격', { dir: 'V', gap: 64, pad: 64, fill: 'neutral/100' })
section.appendChild(root)
root.x = section.x; root.y = section.y      // 좌표를 만지는 곳은 여기 한 곳뿐

async function group(title, desc) {
  const g = F('group', { dir: 'V', gap: 24 })
  root.appendChild(g)
  const head = F('head', { dir: 'V', gap: 4 })
  g.appendChild(head)
  head.appendChild(await ST(title, '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 }))
  if (desc) head.appendChild(await ST(desc, '2.0/meta', 'neutral/600', { font: P('Regular'), size: 12 }))
  return g
}

/* 1. 핀 */
const g1 = await group('2.0/GvPin', '단건 / 다건(카드 쌓임 + N) × 기본 / 선택')
const pinComps = []
for (const stack of [false, true]) {
  for (const selected of [false, true]) {
    const node = await pin({ selected, stack })
    g1.appendChild(node)
    pinComps.push(toComponent(node, `Count=${stack ? 'stack' : 'single'}, State=${selected ? 'selected' : 'default'}`))
  }
}
const pinSet = figma.combineAsVariants(pinComps, g1)
pinSet.name = '2.0/GvPin'
pinSet.layoutMode = 'HORIZONTAL'
pinSet.itemSpacing = 48
pinSet.counterAxisAlignItems = 'MIN'
pinSet.paddingTop = 48; pinSet.paddingBottom = 48; pinSet.paddingLeft = 48; pinSet.paddingRight = 48
pinSet.primaryAxisSizingMode = 'AUTO'
pinSet.counterAxisSizingMode = 'AUTO'

/* 2. 칩 */
const g2 = await group('2.0/GvChip', '접힘 칩 (zoom ≤ 13) — 알약, 패딩 8/12')
const chipComps = []
for (const festival of [false, true]) {
  for (const selected of [false, true]) {
    const node = await chip({ festival, selected })
    g2.appendChild(node)
    chipComps.push(toComponent(node, `Type=${festival ? 'festival' : 'gv'}, State=${selected ? 'selected' : 'default'}`))
  }
}
const chipSet = figma.combineAsVariants(chipComps, g2)
chipSet.name = '2.0/GvChip'
chipSet.layoutMode = 'HORIZONTAL'
chipSet.itemSpacing = 32
chipSet.counterAxisAlignItems = 'CENTER'
chipSet.paddingTop = 32; chipSet.paddingBottom = 32; chipSet.paddingLeft = 32; chipSet.paddingRight = 32
chipSet.primaryAxisSizingMode = 'AUTO'
chipSet.counterAxisSizingMode = 'AUTO'

/* 3. 노트 */
const g3 = await group('규격 노트', null)
g3.appendChild(await ST([
  '· DS 카드·확장 스택 폐지 — 지도 위에 표를 띄우지 않는다. 다건은 카드가 쌓인 모습 + 우상단 +N 하나로 끝낸다.',
  `· 카드: 폭 ${CARD_W} · 패딩 ${CARD_PAD} · 행 간격 4 · r12(control) · 보더 1.5 neutral/200 · shadow sm(선택 시 md)`,
  `· 쌓임: 뒤 카드 2장이 아래로 ${STACK_STEP_Y}px씩 내려가며 좌우로 ${STACK_INSET_X}px씩 좁아진다`,
  '· 타이포: 배지 2.0/label(10) · 시간·감독 2.0/meta(12) · 제목 2.0/body-strong(14)',
  '· 선택: primary/700 보더 2 + shadow md (gv 보라는 정체성 배지·스템·점에만)',
  '· 색은 2.0 컬렉션에서만 바인딩 — 레거시 Primitives/Semantic에 같은 이름이 있어 구 색이 붙던 문제가 있었다',
  '확정되면 GvPinSlots.tsx·GvMarkerIcon.tsx 이식 (GvDsCard·GvExpandedStack·GvStackRow 삭제)',
].join('\n'), '2.0/meta', 'neutral/600', { font: P('Regular'), size: 12 }))

section.resizeWithoutConstraints(root.width, root.height)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`GV 핀 v3${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log([...new Set(report)].join('\n'))
