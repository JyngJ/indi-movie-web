// Components 2.0 신규 세트 2종 (2026-08-07) — "Design System" 페이지에 섹션 생성
//  1. 2.0/ShowtimeGroupCard — [헤더 + 회차 3열] 카드, Header=Theater/Movie 배리언트
//     (영화 상세의 극장 카드 ↔ 극장 상세의 영화 카드 공용. 기존 2.0/MovieCard(시트용)와 별개)
//  2. 2.0/Avatar — 감독 원형, Size=160/100/48/28 배리언트 (이니셜 폴백 + 보더)
// Scripter에서 Run. 수치는 코드 실측 (r16 카드·ShowtimeCell 3열 FILL·아바타 보더+링).

const HEX = {
  'neutral/50': '#FAF9F8', 'neutral/100': '#EAE5E1', 'neutral/200': '#EAE5E1',
  'neutral/300': '#C6BFB9', 'neutral/500': '#8D8781', 'neutral/600': '#726B65',
  'neutral/900': '#0C0A08', 'white': '#FFFFFF', 'primary/700': '#404E81',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const report = []
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch { report.push('KIMM_Bold 폰트 로드 실패') }

function comp(name, variantName) {
  for (const page of figma.root.children) {
    const found = page.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === name)
    if (found) {
      if (found.type === 'COMPONENT_SET') {
        const v = variantName ? found.children.find(c => c.name === variantName) : null
        return v || found.defaultVariant
      }
      return found
    }
  }
  report.push(`컴포넌트 없음: ${name}`)
  return null
}
function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL'
  if (o.gap != null) f.itemSpacing = o.gap
  if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
  f.fills = o.fill ? [paint(o.fill)] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW || 1 }
  if (o.align) f.counterAxisAlignItems = o.align
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
  f.clipsContent = o.clip ?? false
  return f
}
function T(chars, o = {}) {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style: o.weight || 'Regular' }
  t.fontSize = o.size || 14
  t.characters = chars
  t.fills = [paint(o.color || 'neutral/900')]
  return t
}
function box(w, h, o = {}) {
  const r = figma.createRectangle()
  r.resize(w, h)
  r.fills = [paint(o.fill || 'neutral/300')]
  r.cornerRadius = o.r ?? 2
  return r
}

/* ── 1. ShowtimeGroupCard 배리언트 2종 ─────────────────────────── */
const CARD_W = 464   // PC 절반 폭 기준

function showtimeRow(width) {
  const grid = F('showtimes', { dir: 'H', gap: 8, pad: [12, 16, 16, 16], w: width })
  for (let i = 0; i < 3; i++) {
    const cell = comp('2.0/ShowtimeCell', 'State=예정')
    const node = cell ? cell.createInstance() : box(104, 95, { r: 12 })
    grid.appendChild(node)
    node.layoutSizingHorizontal = 'FILL'
  }
  return grid
}

function groupCardTheater() {
  const c = figma.createComponent()
  c.name = 'Header=Theater'
  c.layoutMode = 'VERTICAL'
  c.resize(CARD_W, 100)
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.fills = [paint('white')]
  c.cornerRadius = 16
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.clipsContent = true
  const head = F('head', { dir: 'H', gap: 12, pad: [16, 16, 12, 16], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: CARD_W })
  head.strokes = [paint('neutral/200')]; head.strokeWeight = 1; head.strokeAlign = 'INSIDE'
  head.strokeTopWeight = 0; head.strokeLeftWeight = 0; head.strokeRightWeight = 0; head.strokeBottomWeight = 1
  const info = F('info', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  info.appendChild(T('라이카시네마', { size: 14, weight: 'Bold' }))
  info.appendChild(T('📍 서울 서대문구 연희로8길 18', { size: 12, color: 'neutral/600' }))
  head.appendChild(info)
  const chev = comp('2.0/icon/chevron-right')
  if (chev) head.appendChild(chev.createInstance())
  c.appendChild(head)
  c.appendChild(showtimeRow(CARD_W))
  return c
}

function groupCardMovie() {
  const c = figma.createComponent()
  c.name = 'Header=Movie'
  c.layoutMode = 'VERTICAL'
  c.resize(CARD_W, 100)
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.fills = [paint('white')]
  c.cornerRadius = 16
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.clipsContent = true
  const head = F('head', { dir: 'H', gap: 16, pad: [16, 16, 12, 16], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: CARD_W })
  const left = F('l', { dir: 'H', gap: 16, pad: [0, 0, 0, 0], align: 'CENTER' })
  left.appendChild(box(68, 102))
  const info = F('info', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  info.appendChild(T('어떻게 해야 했을까?', { size: 16, weight: 'Bold' }))
  info.appendChild(T('후지노 토모아키 · 🇯🇵일본 · 2024 · 101분', { size: 12, color: 'neutral/500' }))
  left.appendChild(info)
  head.appendChild(left)
  const chev = comp('2.0/icon/chevron-right')
  if (chev) head.appendChild(chev.createInstance())
  c.appendChild(head)
  c.appendChild(showtimeRow(CARD_W))
  return c
}

/* ── 2. Avatar 배리언트 4종 ────────────────────────────────────── */
function avatarVariant(size) {
  const c = figma.createComponent()
  c.name = `Size=${size}`
  c.resize(size, size)
  c.cornerRadius = size / 2
  c.fills = [paint('neutral/100')]
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.clipsContent = true
  const initial = T('라', { size: Math.round(size * 0.36), weight: 'Bold', color: 'neutral/500' })
  c.appendChild(initial)
  return c
}

/* ── 조립: Design System 페이지에 섹션 ─────────────────────────── */
const dsPage = figma.root.children.find(p => p.name === 'Design System')
if (!dsPage) { figma.notify('Design System 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(dsPage)

const SECTION_NAME = 'Components 2.0 — Detail 추출 (2026-08-07)'
const prev = dsPage.children.find(n => n.type === 'SECTION' && n.name === SECTION_NAME)
if (prev) { prev.remove(); report.push('기존 섹션 삭제 후 재생성') }
const section = figma.createSection()
section.name = SECTION_NAME
dsPage.appendChild(section)

// ShowtimeGroupCard 세트
const gTheater = groupCardTheater()
const gMovie = groupCardMovie()
section.appendChild(gTheater); section.appendChild(gMovie)
gTheater.x = 60; gTheater.y = 120
gMovie.x = 60 + CARD_W + 60; gMovie.y = 120
const groupSet = figma.combineAsVariants([gTheater, gMovie], section)
groupSet.name = '2.0/ShowtimeGroupCard'
groupSet.x = 60; groupSet.y = 120

// Avatar 세트
const avatars = [160, 100, 48, 28].map(avatarVariant)
avatars.forEach((a, i) => { section.appendChild(a); a.x = 60 + i * 200; a.y = 520 })
const avatarSet = figma.combineAsVariants(avatars, section)
avatarSet.name = '2.0/Avatar'
avatarSet.x = 60; avatarSet.y = 520

// 노트
const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  'Detail 추출 컴포넌트 (2026-08-07, 코드 실측)',
  '· 2.0/ShowtimeGroupCard — [헤더+회차 3열 FILL] 카드 r16. Header=Theater(영화 상세에서)/Movie(극장 상세에서). 시트용 2.0/MovieCard와 별개.',
  '· 2.0/Avatar — 감독 원형 Size=160(히어로 PC)/100(히어로 모바일)/48(사이드 카드)/28(DirectorChip). 이니셜 폴백, 사진은 인스턴스에서 이미지 fill로 교체.',
  '· ShowtimeChip(극장 상세 구식)은 폐기 예정 — 2.0/ShowtimeCell로 통일 (코드 작업).',
  ...(report.length ? ['', '경고:', ...report] : []),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 24
section.resizeWithoutConstraints(1200, 800)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`Detail 컴포넌트 세트 2종 생성${report.length ? ` · 경고 ${report.length}` : ''}`)
