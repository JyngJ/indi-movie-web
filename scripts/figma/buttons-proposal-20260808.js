// Buttons 2.0 제안 세트 (2026-08-08) — "Design System - work" 페이지에 임시 컴포넌트 생성
// 인벤토리(버튼 297곳) 정리 결과 → 6개 세트:
//  1. 2.0/Button        Variant=Primary/Secondary/Ghost/Danger × Size=sm/md/lg (32/44/52)
//  2. 2.0/IconButton    Variant=ghost/overlay × Size=32/44
//  3. 2.0/Chip          State=off/on (필터·감독 pill)
//  4. 2.0/SortToggle    State=default/active (텍스트 pill — 최신순·예매 가능만)
//  5. 2.0/FAB           Type=round/pill (코드 프리미티브 실측)
//  6. 2.0/ScrollNavButton (단일, 32)
//  BookingCta는 별도 세트 없음 — Button Primary lg로 흡수 (결정 2026-08-08, 노트 참조)
// Scripter에서 Run. 색은 로컬 변수 있으면 바인딩, 없으면 hex.

const HEX = {
  'neutral/100': '#FAF9F8', 'neutral/150': '#F3F0ED', 'neutral/200': '#EAE5E1',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/700': '#58524B',
  'neutral/900': '#0C0A08', 'white': '#FFFFFF',
  'primary/700': '#404E81', 'primary/900': '#1F2747', 'primary/100': '#ECEFF9',
  'error/900': '#9B3331',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name, opacity) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  if (opacity != null) solid.opacity = opacity
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
const overlayPaint = () => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.06 })
for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)

function T(chars, size, style, colorName) {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style }
  t.fontSize = size
  t.characters = chars
  t.fills = [paint(colorName)]
  return t
}

/* ── 1. 2.0/Button ────────────────────────────────────────────── */
const BTN_SIZES = { sm: { h: 32, px: 12, fs: 12 }, md: { h: 44, px: 16, fs: 14 }, lg: { h: 52, px: 24, fs: 16 } }
const BTN_VARIANTS = {
  Primary:   { bg: 'primary/700', text: 'white', label: '적용하기' },
  Secondary: { bg: 'neutral/150', text: 'neutral/900', label: '지도에서 보기' },
  Ghost:     { bg: null, text: 'neutral/700', label: '건너뛰기' },
  Danger:    { bg: 'error/900', text: 'white', label: '삭제' },
}
function buttonComp(vName, sName) {
  const v = BTN_VARIANTS[vName], z = BTN_SIZES[sName]
  const c = figma.createComponent()
  c.name = `Variant=${vName}, Size=${sName}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = z.px; c.paddingRight = z.px
  c.itemSpacing = 8
  c.fills = v.bg ? [paint(v.bg)] : []
  c.cornerRadius = 8   // --radius-button
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.appendChild(T(v.label, z.fs, 'Medium', v.text))
  c.resize(Math.max(c.width, 64), z.h)
  return c
}

/* ── 2. 2.0/IconButton ───────────────────────────────────────── */
function iconGlyph(size, colorName) {
  // × 글리프 벡터 대용 — 라인 2개
  const g = figma.createFrame()
  g.name = 'icon'
  g.resize(size, size)
  g.fills = []
  for (const rot of [45, -45]) {
    const r = figma.createRectangle()
    r.resize(Math.round(size * 0.62), 1.75)
    r.fills = [paint(colorName)]
    r.cornerRadius = 1
    g.appendChild(r)
    r.x = size / 2 - r.width / 2; r.y = size / 2 - r.height / 2
    r.rotation = rot
  }
  return g
}
function iconButtonComp(variant, size) {
  const c = figma.createComponent()
  c.name = `Variant=${variant}, Size=${size}`
  c.resize(size, size)
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.fills = variant === 'overlay' ? [overlayPaint()] : []
  c.cornerRadius = variant === 'overlay' ? size / 2 : 8
  c.appendChild(iconGlyph(Math.round(size * 0.5), 'neutral/700'))
  c.resize(size, size)
  return c
}

/* ── 3. 2.0/Chip ─────────────────────────────────────────────── */
function chipComp(state) {
  const on = state === 'on'
  const c = figma.createComponent()
  c.name = `State=${state}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 14; c.paddingRight = 14
  c.fills = [paint(on ? 'primary/100' : 'neutral/200')]
  if (on) { c.strokes = [paint('primary/700')]; c.strokeWeight = 1 }
  c.cornerRadius = 9999
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.appendChild(T('독립예술', 13, 'Medium', on ? 'primary/900' : 'neutral/700'))
  c.resize(c.width, 32)
  return c
}

/* ── 4. 2.0/SortToggle ───────────────────────────────────────── */
function sortToggleComp(state) {
  const active = state === 'active'
  const c = figma.createComponent()
  c.name = `State=${state}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 10; c.paddingRight = 10
  c.itemSpacing = 4
  c.fills = []
  c.cornerRadius = 9999
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.appendChild(T('최신순 ↓', 12, 'Medium', active ? 'primary/700' : 'neutral/500'))
  c.resize(c.width, 28)
  return c
}

/* ── 5. 2.0/FAB ──────────────────────────────────────────────── */
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
  c.appendChild(iconGlyph(18, 'neutral/700'))
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
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  const badge = figma.createFrame()
  badge.resize(22, 22); badge.cornerRadius = 11
  badge.fills = [paint('primary/100')]
  c.appendChild(badge)
  c.appendChild(T('극장 탐색', 13, 'SemiBold', 'neutral/900'))
  c.appendChild(T('↔ 영화 탐색', 13, 'Medium', 'neutral/500'))
  c.resize(c.width, 44)
  return c
}

/* ── 6. 2.0/ScrollNavButton ──────────────────────────────────── */
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
  c.appendChild(T('‹', 14, 'Medium', 'neutral/900'))
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

let y = 100
function place(nodes, setName, gapX = 24) {
  let x = 60
  for (const n of nodes) { section.appendChild(n); n.x = x; n.y = y; x += n.width + gapX }
  const set = figma.combineAsVariants(nodes, section)
  set.name = setName
  set.x = 60; set.y = y
  y += set.height + 80
  return set
}

// Button: variant 행 × size 열 순서로 생성 (같은 세트에 12개)
const btnComps = []
for (const vName of Object.keys(BTN_VARIANTS)) for (const sName of Object.keys(BTN_SIZES)) btnComps.push(buttonComp(vName, sName))
// 격자 배치 후 combine
{
  let cy = y
  for (let vi = 0; vi < 4; vi++) {
    let cx = 60
    for (let si = 0; si < 3; si++) {
      const c = btnComps[vi * 3 + si]
      section.appendChild(c); c.x = cx; c.y = cy
      cx += 200
    }
    cy += 72
  }
  const set = figma.combineAsVariants(btnComps, section)
  set.name = '2.0/Button'
  set.x = 60; set.y = y
  y += set.height + 80
}

place([iconButtonComp('ghost', 32), iconButtonComp('ghost', 44), iconButtonComp('overlay', 32), iconButtonComp('overlay', 44)], '2.0/IconButton')
place([chipComp('off'), chipComp('on')], '2.0/Chip')
place([sortToggleComp('default'), sortToggleComp('active')], '2.0/SortToggle')
place([fabRoundComp(), fabPillComp()], '2.0/FAB')
{
  const c = scrollNavComp()
  section.appendChild(c); c.x = 60; c.y = y
  y += c.height + 80
}

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  'Buttons 2.0 제안 (2026-08-08) — 인벤토리 297곳 정리안. 임시 스펙, 확정 전.',
  '· Button: r8(--radius-button) · fw500 · sm 32/fs12 · md 44/fs14 · lg 52/fs16. Secondary는 neutral/150 소프트 면(보더 없음)으로 아웃라인·흰 카드·소프트 면 3중 통일 (83곳 흡수).',
  '· Danger는 확인 모달 전용 — 목록 안 파괴 액션은 Secondary/Ghost (Refactoring UI p.62).',
  '· IconButton: ghost=투명 r8, overlay=black 6% 원형(닫기 ×). 49곳 흡수. 아이콘은 인스턴스에서 교체.',
  '· Chip: off=neutral/200 · on=primary/100+primary/700 보더 (기존 ActiveFilterChip 계승). h32 px14 fs13.',
  '· SortToggle: 텍스트 pill h28 fs12 — default=neutral/500 · active=primary/700.',
  '· FAB·ScrollNavButton: 코드 프리미티브 실측 그대로.',
  '· BookingCta: 별도 세트 안 만듦 — Button Primary lg(52) 풀폭으로 흡수 결정. 좌석·시간 부가정보는 버튼 밖 캡션.',
  '· neutral/150 변수 없으면 hex 폴백으로 그려짐 — 피그마에 150 스탑 추가 후 재실행하면 바인딩됨.',
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 24
note.resize(920, note.height)

section.resizeWithoutConstraints(1100, y + 200)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('Buttons 2.0 제안 세트 6종 생성 완료')
