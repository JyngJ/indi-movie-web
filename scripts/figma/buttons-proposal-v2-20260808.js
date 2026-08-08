// Buttons 2.0 제안 v2 (2026-08-08) — 변형 확장판. 같은 섹션 지우고 재생성.
//  · 2.0/Button: Variant=Primary/Secondary/Tertiary/TextOnly/Error × Size=sm/md/lg × Icon=none/left/right × State
//      - State(hover/pressed/disabled)는 md·Icon=none에만 생성 (임시 검토용 sparse 세트)
//      - 아이콘은 2.0/icon/_placeholder 인스턴스 — 쓸 때 swap
//  · 2.0/IconButton: Variant=ghost/overlay × Size=32/44 × State=default/hover/pressed (아이콘: chevron-left/x 인스턴스)
//  · 2.0/Chip: Type=filter/dropdown × State=off/on × Hover=default/hover (dropdown=chevron-down 포함)
//  · 2.0/SortToggle: State=default/active × Hover=default/hover
//  · 2.0/FAB, 2.0/ScrollNavButton: 유지 (인터랙션은 노트)
// 상태 규칙(노트에도 기록):
//  Primary 700→hover 800→pressed 900 · Secondary 150→200→300 · Tertiary(아웃라인) 투명→150→200
//  TextOnly 투명→raised(200)→300 · Error 900→-10%→-20% · disabled = 40% 불투명
// Scripter에서 Run.

const HEX = {
  'neutral/100': '#FAF9F8', 'neutral/150': '#F3F0ED', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/900': '#0C0A08',
  'white': '#FFFFFF',
  'primary/700': '#404E81', 'primary/800': '#2F3A65', 'primary/900': '#1F2747', 'primary/100': '#ECEFF9',
  'error/900': '#9B3331', 'error/hover': '#872C2A', 'error/pressed': '#722523',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
const report = []
function paint(name, opacity) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  if (opacity != null) solid.opacity = opacity
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)

function T(chars, size, style, colorName) {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style }
  t.fontSize = size
  t.characters = chars
  t.fills = [paint(colorName)]
  return t
}
function comp(name) {
  for (const page of figma.root.children) {
    const found = page.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === name)
    if (found) return found.type === 'COMPONENT_SET' ? found.defaultVariant : found
  }
  report.push(`컴포넌트 없음: ${name}`)
  return null
}
function iconInstance(name, targetSize, colorName) {
  const c = comp(name)
  if (!c) return null
  const inst = c.createInstance()
  if (inst.width !== targetSize) inst.rescale(targetSize / inst.width)   // resize는 크롭 — rescale 사용
  // 색 오버라이드: 벡터 자식 fills 교체
  const p = paint(colorName)
  for (const v of inst.findAll(n => 'fills' in n || 'strokes' in n)) {
    try {
      if (v.strokes && v.strokes.length) v.strokes = [p]
      if (v.fills && v.fills !== figma.mixed && v.fills.length) v.fills = [p]
    } catch { /* 잠긴 속성 무시 */ }
  }
  return inst
}

/* ── 1. 2.0/Button ────────────────────────────────────────────── */
const SIZES = { sm: { h: 32, px: 12, fs: 12, icon: 14 }, md: { h: 44, px: 16, fs: 14, icon: 16 }, lg: { h: 52, px: 24, fs: 16, icon: 18 } }
// state → {bg, text, border, opacity}
const VARIANTS = {
  Primary: {
    label: '적용하기',
    states: {
      default:  { bg: 'primary/700', text: 'white' },
      hover:    { bg: 'primary/800', text: 'white' },
      pressed:  { bg: 'primary/900', text: 'white' },
      disabled: { bg: 'primary/700', text: 'white', opacity: 0.4 },
    },
  },
  Secondary: {
    label: '지도에서 보기',
    states: {
      default:  { bg: 'neutral/150', text: 'neutral/900' },
      hover:    { bg: 'neutral/200', text: 'neutral/900' },
      pressed:  { bg: 'neutral/300', text: 'neutral/900' },
      disabled: { bg: 'neutral/150', text: 'neutral/900', opacity: 0.4 },
    },
  },
  Tertiary: {
    label: '더보기',
    states: {
      default:  { bg: null, text: 'neutral/700', border: 'neutral/200' },
      hover:    { bg: 'neutral/150', text: 'neutral/700', border: 'neutral/200' },
      pressed:  { bg: 'neutral/200', text: 'neutral/900', border: 'neutral/200' },
      disabled: { bg: null, text: 'neutral/700', border: 'neutral/200', opacity: 0.4 },
    },
  },
  TextOnly: {
    label: '건너뛰기',
    states: {
      default:  { bg: null, text: 'neutral/600' },
      hover:    { bg: 'neutral/200', text: 'neutral/700' },   // hover-raise 문법
      pressed:  { bg: 'neutral/300', text: 'neutral/900' },
      disabled: { bg: null, text: 'neutral/600', opacity: 0.4 },
    },
  },
  Error: {
    label: '삭제',
    states: {
      default:  { bg: 'error/900', text: 'white' },
      hover:    { bg: 'error/hover', text: 'white' },
      pressed:  { bg: 'error/pressed', text: 'white' },
      disabled: { bg: 'error/900', text: 'white', opacity: 0.4 },
    },
  },
}

function buttonComp(vName, sName, icon, state) {
  const v = VARIANTS[vName], z = SIZES[sName], st = v.states[state]
  const c = figma.createComponent()
  c.name = `Variant=${vName}, Size=${sName}, Icon=${icon}, State=${state}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = z.px; c.paddingRight = z.px
  c.itemSpacing = 6
  c.fills = st.bg ? [paint(st.bg)] : []
  if (st.border) { c.strokes = [paint(st.border)]; c.strokeWeight = 1 }
  c.cornerRadius = 8
  if (st.opacity != null) c.opacity = st.opacity
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  const textNode = T(v.label, z.fs, 'Medium', st.text)
  if (icon === 'left') { const i = iconInstance('2.0/icon/_placeholder', z.icon, st.text); if (i) c.appendChild(i) }
  c.appendChild(textNode)
  if (icon === 'right') { const i = iconInstance('2.0/icon/_placeholder', z.icon, st.text); if (i) c.appendChild(i) }
  c.resize(Math.max(c.width, 64), z.h)
  return c
}

/* ── 2. 2.0/IconButton ───────────────────────────────────────── */
const ICONBTN_STATES = {
  ghost:   { default: { bg: null }, hover: { bg: 'neutral/200' }, pressed: { bg: 'neutral/300' } },   // hover-raise
  overlay: { default: { bg: 'ovl6' }, hover: { bg: 'ovl10' }, pressed: { bg: 'ovl14' } },
}
const ovl = (o) => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: o })
function iconButtonComp(variant, size, state) {
  const st = ICONBTN_STATES[variant][state]
  const c = figma.createComponent()
  c.name = `Variant=${variant}, Size=${size}, State=${state}`
  c.resize(size, size)
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'
  if (st.bg === 'ovl6') c.fills = [ovl(0.06)]
  else if (st.bg === 'ovl10') c.fills = [ovl(0.10)]
  else if (st.bg === 'ovl14') c.fills = [ovl(0.14)]
  else c.fills = st.bg ? [paint(st.bg)] : []
  c.cornerRadius = variant === 'overlay' ? size / 2 : 8
  const iconName = variant === 'overlay' ? '2.0/icon/x' : '2.0/icon/chevron-left'
  const i = iconInstance(iconName, Math.round(size * 0.5), 'neutral/700')
  if (i) c.appendChild(i)
  c.resize(size, size)
  return c
}

/* ── 3. 2.0/Chip ─────────────────────────────────────────────── */
function chipComp(type, state, hover) {
  const on = state === 'on', hv = hover === 'hover'
  const c = figma.createComponent()
  c.name = `Type=${type}, State=${state}, Hover=${hover}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 14; c.paddingRight = type === 'dropdown' ? 10 : 14
  c.itemSpacing = 4
  const bg = on ? 'primary/100' : (hv ? 'neutral/300' : 'neutral/200')
  c.fills = [paint(bg)]
  if (on) { c.strokes = [paint('primary/700')]; c.strokeWeight = 1; if (hv) c.opacity = 0.85 }
  c.cornerRadius = 9999
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  const txtColor = on ? 'primary/900' : 'neutral/700'
  c.appendChild(T('독립예술', 13, 'Medium', txtColor))
  if (type === 'dropdown') { const i = iconInstance('2.0/icon/chevron-down', 12, txtColor); if (i) c.appendChild(i) }
  c.resize(c.width, 32)
  return c
}

/* ── 4. 2.0/SortToggle ───────────────────────────────────────── */
function sortToggleComp(state, hover) {
  const active = state === 'active', hv = hover === 'hover'
  const c = figma.createComponent()
  c.name = `State=${state}, Hover=${hover}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 10; c.paddingRight = 10
  c.itemSpacing = 4
  c.fills = hv ? [paint('neutral/200')] : []   // hover-raise
  c.cornerRadius = 9999
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.appendChild(T('최신순 ↓', 12, 'Medium', active ? 'primary/700' : 'neutral/500'))
  c.resize(c.width, 28)
  return c
}

/* ── 5·6. FAB / ScrollNavButton (v1 유지) ────────────────────── */
const fabShadow = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 4 }, radius: 12, visible: true, blendMode: 'NORMAL' }]
function fabRoundComp() {
  const c = figma.createComponent()
  c.name = 'Type=round'
  c.resize(44, 44)
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'
  c.fills = [paint('white')]
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.cornerRadius = 22
  c.effects = fabShadow
  const i = iconInstance('2.0/icon/locate-fixed', 18, 'neutral/700')
  if (i) c.appendChild(i)
  c.resize(44, 44)
  return c
}
function fabPillComp() {
  const c = figma.createComponent()
  c.name = 'Type=pill'
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 12; c.paddingRight = 16
  c.itemSpacing = 8
  c.fills = [paint('white')]
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.cornerRadius = 9999
  c.effects = fabShadow
  c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'
  const badge = figma.createFrame()
  badge.resize(22, 22); badge.cornerRadius = 11
  badge.fills = [paint('primary/100')]
  c.appendChild(badge)
  c.appendChild(T('극장 탐색', 13, 'SemiBold', 'neutral/900'))
  c.appendChild(T('↔ 영화 탐색', 13, 'Medium', 'neutral/500'))
  c.resize(c.width, 44)
  return c
}
function scrollNavComp() {
  const c = figma.createComponent()
  c.name = '2.0/ScrollNavButton'
  c.resize(32, 32)
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'
  c.fills = [paint('neutral/100')]
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.cornerRadius = 16
  c.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 8, visible: true, blendMode: 'NORMAL' }]
  const i = iconInstance('2.0/icon/chevron-left', 14, 'neutral/900')
  if (i) c.appendChild(i)
  c.resize(32, 32)
  return c
}

/* ── 조립 ────────────────────────────────────────────────────── */
const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)

const SECTION_NAME = 'Buttons 2.0 제안 (2026-08-08)'
const prev = page.children.find(n => n.type === 'SECTION' && n.name === SECTION_NAME)
if (prev) prev.remove()
const section = figma.createSection()
section.name = SECTION_NAME
page.appendChild(section)

function label(txt, x, yy) {
  const t = T(txt, 14, 'Bold', 'neutral/900')
  section.appendChild(t); t.x = x; t.y = yy
}

let y = 320

// Button — 행: variant×(default 줄, states 줄), 열: size×icon
{
  const comps = []
  let cy = y
  for (const vName of Object.keys(VARIANTS)) {
    label(vName, 60, cy - 22)
    let cx = 60
    for (const sName of Object.keys(SIZES)) {
      for (const icon of ['none', 'left', 'right']) {
        const c = buttonComp(vName, sName, icon, 'default')
        comps.push(c); section.appendChild(c); c.x = cx; c.y = cy
        cx += c.width + 20
      }
      cx += 20
    }
    // states 줄 (md, Icon=none)
    let sx = 60, sy2 = cy + SIZES.lg.h + 16
    for (const state of ['hover', 'pressed', 'disabled']) {
      const c = buttonComp(vName, 'md', 'none', state)
      comps.push(c); section.appendChild(c); c.x = sx; c.y = sy2
      const st = T(state, 10, 'Regular', 'neutral/500')
      section.appendChild(st); st.x = sx; st.y = sy2 + 48
      sx += c.width + 20
    }
    cy = sy2 + 44 + 40
  }
  const set = figma.combineAsVariants(comps, section)
  set.name = '2.0/Button'
  set.x = 60; set.y = y
  y = set.y + set.height + 100
}

// IconButton
{
  label('2.0/IconButton — ghost(뒤로가기류) / overlay(닫기 ×) × 32/44 × default/hover/pressed', 60, y - 26)
  const comps = []
  let cx = 60
  for (const variant of ['ghost', 'overlay']) for (const size of [32, 44]) for (const state of ['default', 'hover', 'pressed']) {
    const c = iconButtonComp(variant, size, state)
    comps.push(c); section.appendChild(c); c.x = cx; c.y = y
    cx += size + 20
  }
  const set = figma.combineAsVariants(comps, section)
  set.name = '2.0/IconButton'
  set.x = 60; set.y = y
  y = set.y + set.height + 100
}

// Chip
{
  label('2.0/Chip — filter/dropdown × off/on × default/hover', 60, y - 26)
  const comps = []
  let cx = 60
  for (const type of ['filter', 'dropdown']) for (const state of ['off', 'on']) for (const hover of ['default', 'hover']) {
    const c = chipComp(type, state, hover)
    comps.push(c); section.appendChild(c); c.x = cx; c.y = y
    cx += c.width + 16
  }
  const set = figma.combineAsVariants(comps, section)
  set.name = '2.0/Chip'
  set.x = 60; set.y = y
  y = set.y + set.height + 100
}

// SortToggle
{
  label('2.0/SortToggle — default/active × default/hover', 60, y - 26)
  const comps = []
  let cx = 60
  for (const state of ['default', 'active']) for (const hover of ['default', 'hover']) {
    const c = sortToggleComp(state, hover)
    comps.push(c); section.appendChild(c); c.x = cx; c.y = y
    cx += c.width + 16
  }
  const set = figma.combineAsVariants(comps, section)
  set.name = '2.0/SortToggle'
  set.x = 60; set.y = y
  y = set.y + set.height + 100
}

// FAB + ScrollNav
{
  label('2.0/FAB · 2.0/ScrollNavButton — hover는 opacity 70%(active) 문법, 노트 참조', 60, y - 26)
  const r = fabRoundComp(), p = fabPillComp()
  section.appendChild(r); r.x = 60; r.y = y
  section.appendChild(p); p.x = 130; p.y = y
  const fabSet = figma.combineAsVariants([r, p], section)
  fabSet.name = '2.0/FAB'
  fabSet.x = 60; fabSet.y = y
  const sn = scrollNavComp()
  section.appendChild(sn); sn.x = fabSet.x + fabSet.width + 60; sn.y = y
  y += Math.max(fabSet.height, 60) + 80
}

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  'Buttons 2.0 제안 v2 (2026-08-08) — 임시. 인벤토리 297곳 정리안.',
  '',
  '상태 규칙 (Primer식 단계 다크닝 + 우리 hover-raise 문법):',
  '· Primary: 700 → hover 800 → pressed 900 (코드 기존 hover와 동일)',
  '· Secondary(소프트 면): 150 → 200 → 300 — 아웃라인·흰 카드·소프트 면 3중 통일, 83곳 흡수',
  '· Tertiary(아웃라인): 투명+200보더 → bg 150 → bg 200',
  '· TextOnly: 투명 → bg 200(hover-raise) → bg 300. 온보딩 건너뛰기·접기류',
  '· Error: 900 → -10% → -20%. 확인 모달 전용 (Refactoring UI p.62)',
  '· disabled 전 variant 공통: 40% 불투명',
  '· 아이콘: Icon=left/right — _placeholder 인스턴스, 쓸 때 swap. sm14/md16/lg18',
  '· State 변형은 md·Icon=none에만 임시 생성 — 확정되면 전체 매트릭스로 확장',
  '· IconButton overlay: black 6% → 10% → 14% (Material state-layer식)',
  '· Chip dropdown: chevron-down 12 — FilterChip(지역·장르 드롭다운) 흡수',
  '· FAB·ScrollNav 인터랙션: active 시 opacity 70% (코드 기존), hover 변형 생략',
  '· BookingCta: Button Primary lg(52) 풀폭으로 흡수 — 별도 세트 없음',
  ...(report.length ? ['', '경고:', ...[...new Set(report)]] : []),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 24
note.resize(980, note.height)

section.resizeWithoutConstraints(1700, y + 120)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`Buttons 2.0 v2 생성 완료${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
