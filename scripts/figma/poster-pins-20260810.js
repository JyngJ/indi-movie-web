// 지도 포스터 핀 규격 정리 v2 (2026-08-10)
//  v1(20260809)은 전부 수동 x/y 배치라 카드가 래퍼 밖으로 삐져나가고(일정 모드 187×88 래퍼에 217×100 카드)
//  +N 칩이 래퍼 밖 형제로 떨어져 나왔다. 전부 오토 레이아웃 + 배리언트로 재작성.
//
//  치수는 코드 실측 유지 (지도 위 오브젝트라 키우면 지도가 답답해진다):
//    포스터 44×66 r4 · 카드 pad 8 · 슬롯 간격 4 · r8 · 보더 1.5 · 꼬리 10×10
//  "여유"는 시안 배치에만 적용 — 배리언트 간격 48, 세트 패딩 48
//
//  세트: 2.0/PosterPin       Capacity=1|3|6 × State=default|selected
//        2.0/PosterPinSchedule Mode=full|dates   (단일 영화 필터 시 일정 모드)
//  소스: src/components/map/PosterGrid.tsx · PosterThumb.tsx · lib/map/posterLogic.ts
// Scripter에서 Run. 기존 '지도 포스터 핀' 섹션은 교체된다.

const report = []

/* ── 토큰 인프라 ─────────────────────────────────────────────── */
const HEX = {
  'primary/700': '#404E81', 'primary/500': '#6D7CB0', 'primary/100': '#ECEFF9',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/500': '#8D8781',
  'neutral/600': '#726B65', 'neutral/800': '#2B2622', 'neutral/900': '#0C0A08',
  'error/900': '#9B3331', 'white': '#FFFFFF',
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
let MONO = P('SemiBold')
for (const cand of [{ family: 'SF Mono', style: 'Semibold' }, { family: 'SF Mono', style: 'Medium' }]) {
  try { await figma.loadFontAsync(cand); MONO = cand; break } catch { /* 없으면 Pretendard */ }
}

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
    if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
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
  if (o.dash) f.dashPattern = o.dash
  f.clipsContent = o.clip ?? false
  autoBind(f)
  return f
}

/* ── 규격 (코드 실측) ───────────────────────────────────────── */
const PW = 44, PH = 66        // 모바일 기본 포스터 (줌 17·18·19 → 56·60·66폭)
const SLOT_GAP = 4
const CARD_PAD = 8
const TAIL = 10               // 꼬리 사각 한 변, rotate45
const CHIP_BLEED = 8          // 칩이 카드 밖으로 나오는 양

/** 포스터 한 장 — PosterThumb placeholder */
async function poster(title, { highlighted = false } = {}) {
  const p = F('poster', { dir: 'V', w: PW, h: PH, r: 4, fill: ['neutral/800'], align: 'CENTER', mainAlign: 'CENTER', pad: [4, 4, 4, 4], clip: true })
  p.strokes = [{ type: 'SOLID', color: rgb('#000000'), opacity: 0.12 }]
  p.strokeWeight = 1
  p.strokeAlign = 'INSIDE'
  const t = await ST(title, '2.0/caption', ['on-accent', 'white'], { font: P('Bold'), size: 11 })
  t.textAlignHorizontal = 'CENTER'
  p.appendChild(t)
  t.textAutoResize = 'HEIGHT'
  t.layoutSizingHorizontal = 'FILL'
  if (highlighted) {
    p.strokes = [paint(['primary/base', 'primary/700'])]
    p.strokeWeight = 2
  }
  return p
}

/** 코너 칩 — "+N" / "N편 일치" / "N회" 공용 */
async function cornerChip(label) {
  const c = F('chip', { dir: 'H', pad: [4, 8, 4, 8], r: 9999, fill: ['primary/base', 'primary/700'], align: 'CENTER' })
  c.strokes = [paint(['neutral/100', 'surface/bg'])]
  c.strokeWeight = 1.5
  c.strokeAlign = 'OUTSIDE'
  await applyShadow(c, '2.0/shadow/sm', [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 1 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' },
  ])
  c.appendChild(await ST(label, '2.0/label', ['on-accent', 'white'], { font: P('Bold'), size: 10 }))
  return c
}

/** 카드 몸통 — 포스터 그리드(1 / 3 / 3×2) */
async function gridCard({ capacity, selected, highlightFirst = false }) {
  const card = F('card', {
    dir: 'V', gap: SLOT_GAP, pad: [CARD_PAD, CARD_PAD, CARD_PAD, CARD_PAD], r: 8,
    fill: selected ? ['primary/base', 'primary/700'] : ['surface/card', 'white'],
    stroke: selected ? ['neutral/900', 'text/primary'] : ['neutral/200', 'border'],
    strokeW: 1.5,
  })
  if (selected) card.strokes = [{ type: 'SOLID', color: rgb('#000000'), opacity: 0.14 }]
  await applyShadow(card, selected ? '2.0/shadow/lg' : '2.0/shadow/md', [
    { type: 'DROP_SHADOW', color: { r: 0.08, g: 0.06, b: 0.04, a: 0.10 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' },
  ])
  const TITLES = ['괴인', '너와 나', '세기말의 사랑', '미지수', '장손', '한국이 싫어서']
  const perRow = capacity > 3 ? 3 : capacity
  const rows = capacity > 3 ? 2 : 1
  for (let r = 0; r < rows; r++) {
    const row = F('row', { dir: 'H', gap: SLOT_GAP })
    card.appendChild(row)
    for (let c = 0; c < perRow; c++) {
      const i = r * perRow + c
      row.appendChild(await poster(TITLES[i % TITLES.length], { highlighted: highlightFirst && i === 0 }))
    }
  }
  return card
}

/** 꼬리 — 지역 힌트 툴팁과 같은 문법(rotate45, 팁 쪽 두 변만 보더) */
function tail({ selected }) {
  const t = figma.createRectangle()
  t.name = 'tail'
  t.resize(TAIL, TAIL)
  t.fills = [selected ? paint(['primary/base', 'primary/700']) : paint(['surface/card', 'white'])]
  t.strokes = [selected ? { type: 'SOLID', color: rgb('#000000'), opacity: 0.14 } : paint(['neutral/200', 'border'])]
  t.strokeWeight = 1.5
  t.strokeAlign = 'INSIDE'
  t.topLeftRadius = 4
  t.rotation = 45
  return t
}

/** 카드 + 꼬리 + 코너 칩을 한 프레임에 (겹침이라 오토 레이아웃 밖) */
async function pinFrame(card, { selected, chipLabel }) {
  const area = F('PosterPin', { dir: 'NONE' })
  area.clipsContent = false
  const tw = TAIL * Math.SQRT2                      // 회전 후 실제 폭
  const top = Math.round(tw / 2)                    // 꼬리·칩이 카드 위로 나오는 여유
  area.resize(card.width + CHIP_BLEED, card.height + top)
  const tl = tail({ selected })
  area.appendChild(tl)
  area.appendChild(card)
  card.x = 0; card.y = top
  // rotate45 사각형은 좌상단 꼭짓점이 위로 간다 — 중심을 카드 상단 모서리에 올린다
  tl.x = card.width / 2 + TAIL / 2
  tl.y = top - Math.round(tw / 2)
  if (chipLabel) {
    const chip = await cornerChip(chipLabel)
    area.appendChild(chip)
    chip.x = card.width - chip.width + CHIP_BLEED
    chip.y = top - CHIP_BLEED
  }
  return area
}

/* ── 일정 모드 — 포스터 + 점선 + 일정 열 ─────────────────── */
async function scheduleCard({ showTimes }) {
  const card = F('card', {
    dir: 'H', gap: 8, pad: [CARD_PAD, CARD_PAD, CARD_PAD, CARD_PAD], r: 8, align: 'CENTER',
    fill: ['surface/card', 'white'], stroke: ['neutral/200', 'border'], strokeW: 1.5,
  })
  await applyShadow(card, '2.0/shadow/md', null)
  card.appendChild(await poster('꽁치의 맛'))

  const div = F('divider', { dir: 'V', w: 1, h: PH })
  div.fills = []
  div.strokes = [paint(['neutral/200', 'border'])]
  div.strokeWeight = 1
  div.dashPattern = [3, 3]
  card.appendChild(div)

  const col = F('schedule', { dir: 'V', gap: 4 })
  card.appendChild(col)
  const pill = F('pill', { dir: 'H', pad: [4, 8, 4, 8], r: 9999, fill: ['primary/subtle-l', 'primary/100'], align: 'CENTER' })
  pill.appendChild(await ST('상영 일정', '2.0/label', ['primary/base', 'primary/700'], { font: P('Bold'), size: 10 }))
  col.appendChild(pill)

  const ROWS = showTimes
    ? [
        { label: '오늘', color: ['primary/base', 'primary/700'], times: ['19:30', '21:10'] },
        { label: '토', color: ['primary/500'], times: ['14:00', '16:20'], more: 2 },
        { label: '일', color: ['error', 'error/900'], times: ['15:30'] },
      ]
    : [{ label: '오늘', color: ['primary/base', 'primary/700'], times: [] }]
  for (const r of ROWS) {
    const row = F('row', { dir: 'H', gap: 8, align: 'CENTER' })
    col.appendChild(row)
    const lb = await ST(r.label, '2.0/label', r.color, { font: P('Bold'), size: 10 })
    row.appendChild(lb)
    lb.textAutoResize = 'HEIGHT'
    lb.resize(29, lb.height)          // 코드의 minWidth 29 — 요일 열 정렬선
    for (const tm of r.times) {
      const t = await ST(tm, '2.0/label', ['neutral/900', 'text/primary'], { font: MONO, size: 10 })
      if (!tStyle('2.0/label')) t.fontName = MONO
      row.appendChild(t)
    }
    if (r.more) row.appendChild(await ST(`+${r.more}`, '2.0/label', ['neutral/500', 'text/caption'], { font: P('SemiBold'), size: 10 }))
  }
  return card
}

/* ── 컴포넌트화 ─────────────────────────────────────────────── */
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
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('지도 포스터 핀'))
const section = figma.createSection()
section.name = '지도 포스터 핀 — 규격 v2 (2026-08-10)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
  section.x = maxX + 200; section.y = 0
}
const OX = section.x, OY = section.y

/* 포스터 핀 배리언트 — Capacity 1|3|6 × State default|selected */
const OVERFLOW = { 1: '+11', 3: '+9', 6: '+4' }
const pinComps = []
for (const capacity of [1, 3, 6]) {
  for (const selected of [false, true]) {
    const card = await gridCard({ capacity, selected })
    const area = await pinFrame(card, { selected, chipLabel: OVERFLOW[capacity] })
    section.appendChild(area)
    pinComps.push(toComponent(area, `Capacity=${capacity}, State=${selected ? 'selected' : 'default'}`))
  }
}
const pinSet = figma.combineAsVariants(pinComps, section)
pinSet.name = '2.0/PosterPin'
pinSet.layoutMode = 'HORIZONTAL'
pinSet.itemSpacing = 48
pinSet.counterAxisAlignItems = 'MIN'
pinSet.paddingTop = 48; pinSet.paddingBottom = 48; pinSet.paddingLeft = 48; pinSet.paddingRight = 48
pinSet.primaryAxisSizingMode = 'AUTO'
pinSet.counterAxisSizingMode = 'AUTO'
pinSet.x = OX + 80; pinSet.y = OY + 120

/* 일정 모드 배리언트 — Mode full|dates */
const schComps = []
for (const showTimes of [true, false]) {
  const card = await scheduleCard({ showTimes })
  const area = await pinFrame(card, { selected: false, chipLabel: showTimes ? '3회' : '1회' })
  section.appendChild(area)
  schComps.push(toComponent(area, `Mode=${showTimes ? 'full' : 'dates'}`))
}
const schSet = figma.combineAsVariants(schComps, section)
schSet.name = '2.0/PosterPinSchedule'
schSet.layoutMode = 'HORIZONTAL'
schSet.itemSpacing = 48
schSet.counterAxisAlignItems = 'MIN'
schSet.paddingTop = 48; schSet.paddingBottom = 48; schSet.paddingLeft = 48; schSet.paddingRight = 48
schSet.primaryAxisSizingMode = 'AUTO'
schSet.counterAxisSizingMode = 'AUTO'
schSet.x = OX + 80
schSet.y = pinSet.y + pinSet.height + 96

/* 필터 매치 예시 — 배리언트를 늘리지 않고 한 장만 */
const matchCard = await gridCard({ capacity: 3, selected: false, highlightFirst: true })
const matchArea = await pinFrame(matchCard, { selected: false, chipLabel: '3편 일치' })
matchArea.name = '필터 매치 예시 (칩 라벨 + 첫 포스터 primary 링)'
section.appendChild(matchArea)
matchArea.x = OX + 80
matchArea.y = schSet.y + schSet.height + 96

/* 라벨·노트 */
async function label(chars, x, y) {
  const t = await ST(chars, '2.0/body-strong', ['neutral/600', 'text/sub'], { font: P('SemiBold'), size: 14 })
  section.appendChild(t); t.x = x; t.y = y
  return t
}
await label('2.0/PosterPin — 줌 용량 1 / 3 / 6 × 기본 / 선택', OX + 80, OY + 64)
await label('2.0/PosterPinSchedule — 단일 영화 필터 시 일정 모드 (full / dates-only)', OX + 80, schSet.y - 56)
await label('필터 매치', OX + 80, matchArea.y - 56)

const note = await ST([
  '지도 포스터 핀 — 규격 v2',
  '· v1은 전부 수동 x/y라 일정 모드 카드가 래퍼 밖으로 삐져나가고(187×88 래퍼 / 217×100 카드) +N 칩이 래퍼 밖 형제로 떨어졌다. 전부 오토 레이아웃으로 재작성.',
  `· 치수는 코드 실측 유지 — 포스터 ${PW}×${PH} r4 · 카드 pad ${CARD_PAD} · 슬롯 간격 ${SLOT_GAP} · r8 · 보더 1.5 · 꼬리 ${TAIL}×${TAIL} rotate45(팁 r4)`,
  '  (지도 위 오브젝트라 규격을 키우면 지도가 답답해진다 — 여유는 시안 배치 쪽에만 줬다)',
  '· 줌 용량: ≤13 → 0(점 핀) · 14 → 1 · 15 → 3 · 16+ → 6(3×2). 초과분은 오버레이 없이 우상단 +N 칩 하나로.',
  '· 포스터 줌 스케일(모바일): 기본 44×66 · 17 → 56×84 · 18 → 60×90 · 19 → 66×99 / 데스크톱 74·90·108·126 폭',
  '· 일정 모드 임계값: 데스크톱 dates 15 / full 17 · 모바일 dates 13 / full 15 — dates~full 구간은 요일만',
  '· 코너 칩 공용 문법: 2.0/label(10) · pad 4/8 · pill · primary 면 · surface-bg 보더 1.5. "N편 일치"와 같은 규격.',
  '· 호버 툴팁(pm-tip)·전체 목록(po-list)은 CSS 모듈 — 이 시안 범위 밖',
].join('\n'), '2.0/meta', ['neutral/600', 'text/sub'], { font: P('Regular'), size: 12 })
section.appendChild(note)
note.x = OX + 80
note.y = matchArea.y + matchArea.height + 64

section.resizeWithoutConstraints(
  Math.max(pinSet.x + pinSet.width, schSet.x + schSet.width, note.x + note.width) - OX + 80,
  note.y + note.height - OY + 80,
)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`포스터 핀 규격 v2 생성${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log([...new Set(report)].join('\n'))
