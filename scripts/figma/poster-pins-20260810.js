// 지도 포스터 핀 규격 v3 (2026-08-10) — 덤프 지적 반영
//  · 색: 2.0 컬렉션에서만 변수를 찾는다. 레거시 Primitives/Semantic에 같은 이름이 있어
//    primary/base가 구 블루(#4A6380)로 붙던 문제 해소 (자세한 건 _pin-common.md)
//  · 꼬리: 회전 사각형 → 삼각형 폴리곤. 회전 원점 때문에 마름모가 카드 위에 붕 떠 있었다
//  · 배치: 섹션 절대 좌표 폐지 → 섹션 안 루트 오토 레이아웃 프레임 하나에 전부 쌓는다
//  · 여백: 카드 패딩 12 · 슬롯 간격 8로 확대, 일정 모드도 같은 값으로 통일
//  세트: 2.0/PosterPin (Capacity=1|3|6 × State=default|selected) · 2.0/PosterPinSchedule (Mode=full|dates)
// Scripter에서 Run. 기존 '지도 포스터 핀' 섹션은 교체된다.

const report = []

/* ── 토큰 인프라 — 2.0 컬렉션만 ──────────────────────────────── */
const HEX = {
  'primary/700': '#404E81', 'primary/500': '#6D7CB0', 'primary/100': '#ECEFF9',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/500': '#8D8781',
  'neutral/600': '#726B65', 'neutral/800': '#2B2622', 'neutral/900': '#0C0A08',
  'error/900': '#9B3331', 'white': '#FFFFFF',
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
  if (o.stroke) { f.strokes = [paint(o.stroke, o.strokeOpacity)]; f.strokeWeight = o.strokeW ?? 1.5; f.strokeAlign = o.strokeAlign ?? 'INSIDE' }
  if (o.dash) f.dashPattern = o.dash
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
   포스터 44×66 r4 · 카드 패딩 8 · 슬롯 간격 8 · r8 · 보더 1.5 (사용자 확정, 3열 카드 폭 164)
   일정 모드: 포스터가 카드 세로를 꽉 채우고(2:3 유지) · 디바이더 실선 · 시간 2.0/num/seat(12) */
const PW = 44, PH = 66
const SLOT_GAP = 8
const CARD_PAD = 8
const TAIL = 11                    // 지역 힌트 팝업과 동일 (11×11 rotate45, 팁 r4)
const CHIP_BLEED = 8

/** 포스터 한 장 — PosterThumb placeholder */
async function poster(title, { highlighted = false, w = PW, h = PH } = {}) {
  const p = F('poster', { dir: 'V', w, h, r: 4, fill: 'neutral/800', align: 'CENTER', mainAlign: 'CENTER', pad: 4, clip: true })
  const t = await ST(title, '2.0/caption', 'white', { font: P('Bold'), size: 11 })
  t.textAlignHorizontal = 'CENTER'
  p.appendChild(t)
  t.textAutoResize = 'HEIGHT'
  t.layoutSizingHorizontal = 'FILL'
  if (highlighted) { p.strokes = [paint('primary/700')]; p.strokeWeight = 2; p.strokeAlign = 'OUTSIDE' }
  return p
}

/** 코너 칩 — "+N" / "N편 일치" / "N회" 공용 */
async function cornerChip(label) {
  const c = F('chip', { dir: 'H', pad: [4, 8, 4, 8], r: 9999, fill: 'primary/700', align: 'CENTER' })
  c.strokes = [paint('neutral/100')]
  c.strokeWeight = 1.5
  c.strokeAlign = 'OUTSIDE'
  await applyShadow(c, '2.0/shadow/sm')
  c.appendChild(await ST(label, '2.0/label', 'white', { font: P('Bold'), size: 10 }))
  return c
}

/** 카드 껍데기 — 면·보더·그림자 공통 */
async function shell(name, o) {
  const card = F(name, {
    dir: o.dir, gap: o.gap ?? SLOT_GAP, pad: CARD_PAD, r: 8, align: o.align,
    fill: o.selected ? 'primary/700' : 'white',
  })
  card.strokes = [o.selected ? { type: 'SOLID', color: rgb('#000000'), opacity: 0.14 } : paint('neutral/200')]
  card.strokeWeight = 1.5
  card.strokeAlign = 'INSIDE'
  await applyShadow(card, o.selected ? '2.0/shadow/lg' : '2.0/shadow/md')
  return card
}

/** 포스터 그리드 카드 (용량 1 / 3 / 6) */
async function gridCard({ capacity, selected, highlightFirst = false }) {
  const card = await shell('card', { dir: 'V', selected })
  const TITLES = ['괴인', '너와 나', '세기말의 사랑', '미지수', '장손', '한국이 싫어서']
  const perRow = capacity > 3 ? 3 : capacity
  for (let r = 0; r < (capacity > 3 ? 2 : 1); r++) {
    const row = F('row', { dir: 'H', gap: SLOT_GAP })
    card.appendChild(row)
    for (let c = 0; c < perRow; c++) {
      row.appendChild(await poster(TITLES[(r * perRow + c) % TITLES.length], { highlighted: highlightFirst && r === 0 && c === 0 }))
    }
  }
  return card
}

/** 일정 모드 카드 — 포스터가 세로를 꽉 채우고(2:3 비율 유지) · 실선 디바이더 · 일정 열.
 *  포스터/디바이더는 h:FILL이라 카드 높이는 일정 열이 결정한다. 그래서 열을 먼저 만들어
 *  높이를 재고, 그 높이에서 2:3으로 포스터 폭을 정한다. */
async function scheduleCard({ showTimes }) {
  const card = await shell('card', { dir: 'H', selected: false, align: 'CENTER' })

  /* 일정 열 먼저 — 높이가 카드 높이를 결정한다 */
  const col = F('schedule', { dir: 'V', gap: SLOT_GAP })
  const pill = F('pill', { dir: 'H', pad: [4, 8, 4, 8], r: 9999, fill: 'primary/100', align: 'CENTER' })
  const pillText = await ST('상영 일정', '2.0/label', 'primary/700', { font: P('Bold'), size: 10 })
  pill.appendChild(pillText)
  col.appendChild(pill)
  pill.layoutSizingHorizontal = 'FILL'
  pillText.textAlignHorizontal = 'CENTER'
  pillText.textAutoResize = 'HEIGHT'
  pillText.layoutSizingHorizontal = 'FILL'

  const ROWS = showTimes
    ? [
        { label: '오늘', color: 'primary/700', times: ['19:30', '21:10'] },
        { label: '토', color: 'primary/500', times: ['14:00', '16:20'], more: 2 },
        { label: '일', color: 'error/900', times: ['15:30'] },
      ]
    : [
        { label: '오늘', color: 'primary/700', times: [] },
        { label: '토', color: 'primary/500', times: [] },
        { label: '일', color: 'error/900', times: [] },
      ]
  for (const r of ROWS) {
    const row = F('row', { dir: 'H', gap: SLOT_GAP, align: 'CENTER' })
    col.appendChild(row)
    const lb = await ST(r.label, '2.0/label', r.color, { font: P('Bold'), size: 10 })
    row.appendChild(lb)
    lb.textAutoResize = 'HEIGHT'
    lb.resize(28, lb.height)              // 요일 열 정렬선
    // 시간이 없는 dates 모드에서 빈 times 프레임을 만들면 폭·높이가 늘어난다 — 아예 만들지 않는다
    if (r.times.length === 0 && !r.more) continue
    const times = F('times', { dir: 'H', gap: 4, align: 'CENTER' })
    row.appendChild(times)
    for (const tm of r.times) times.appendChild(await ST(tm, '2.0/num/seat', 'neutral/900', { font: P('SemiBold'), size: 12 }))
    if (r.more) times.appendChild(await ST(`+${r.more}`, '2.0/label', 'neutral/500', { font: P('SemiBold'), size: 10 }))
  }

  /* 포스터 — 일정 열 높이에 맞춰 2:3 */
  const colH = col.height
  const pw = Math.round(colH * 2 / 3)
  const ps = await poster('꽁치의 맛', { w: pw, h: colH })
  card.appendChild(ps)

  /* 실선 디바이더 (점선에서 변경) */
  const div = F('divider', { dir: 'V', w: 1, h: colH })
  div.fills = []
  div.strokes = [paint('neutral/200')]
  div.strokeWeight = 1
  card.appendChild(div)

  card.appendChild(col)
  // 셋 다 카드 세로를 꽉 채운다
  for (const n of [ps, div, col]) { try { n.layoutSizingVertical = 'FILL' } catch { /* 무시 */ } }
  return card
}

/** 꼬리 — 지역 힌트 팝업과 같은 문법: 11×11 정사각 · r4 · rotate45.
 *  팝업은 면이 솔리드라 보더가 없지만 카드는 보더가 있으니, rotate45에서 팁이 되는
 *  꼭짓점(좌상단)에서 만나는 두 변(top·left)에만 같은 보더를 준다. 나머지 두 변은
 *  카드에 가려지므로 0. (코드의 BubbleTail 프리미티브와 동일)
 *  회전 원점 때문에 x/y 계산이 어긋나므로, 붙인 뒤 실제 바운딩박스로 위치를 보정한다. */
function tail({ selected }) {
  const t = figma.createRectangle()
  t.name = 'tail'
  t.resize(TAIL, TAIL)
  t.cornerRadius = 4
  t.fills = [selected ? paint('primary/700') : paint('white')]
  t.strokes = [selected ? { type: 'SOLID', color: rgb('#000000'), opacity: 0.14 } : paint('neutral/200')]
  t.strokeAlign = 'INSIDE'
  // 개별 변 두께 — 팁 쪽 두 변만 (미지원 환경이면 전체 두께로 폴백)
  try {
    t.strokeTopWeight = 1.5
    t.strokeLeftWeight = 1.5
    t.strokeRightWeight = 0
    t.strokeBottomWeight = 0
  } catch { t.strokeWeight = 1.5 }
  t.rotation = 45
  return t
}

/** 회전 후 실제 바운딩박스 기준으로 꼬리를 카드 상단 중앙에 맞춘다.
 *  목표: 팝업과 동일하게 사각형 중심이 카드 상단 모서리에 얹힌다(팝업 top:-5, 11px → 중심 +0.5) */
function placeTail(tl, area, card) {
  const ab = area.absoluteBoundingBox, tb = tl.absoluteBoundingBox
  if (!ab || !tb) { tl.x = card.x + card.width / 2 - TAIL / 2; tl.y = card.y - TAIL / 2; return }
  const wantCx = ab.x + card.x + card.width / 2
  const wantCy = ab.y + card.y + 0.5
  tl.x += wantCx - (tb.x + tb.width / 2)
  tl.y += wantCy - (tb.y + tb.height / 2)
}

/** 카드 + 꼬리 + 코너 칩 (겹침이라 오토 레이아웃 밖).
 *  꼬리 위치 보정에 absoluteBoundingBox가 필요해서 부모에 먼저 붙인다. */
async function pinFrame(parent, card, { selected, chipLabel }) {
  const area = F('PosterPin', { dir: 'NONE' })
  area.clipsContent = false
  parent.appendChild(area)
  const top = Math.ceil(TAIL * Math.SQRT2 / 2) + CHIP_BLEED   // 꼬리 팁과 칩이 카드 위로 나오는 여유
  area.resize(card.width + CHIP_BLEED, card.height + top)
  const tl = tail({ selected })
  area.appendChild(tl)                       // 카드보다 먼저 = 뒤
  area.appendChild(card)
  card.x = 0; card.y = top
  area.resize(card.width + CHIP_BLEED, card.height + top)   // 카드 최종 크기로 다시 맞춘다
  placeTail(tl, area, card)
  if (chipLabel) {
    const chip = await cornerChip(chipLabel)
    area.appendChild(chip)
    chip.x = card.width - chip.width + CHIP_BLEED
    chip.y = top - CHIP_BLEED
  }
  return area
}

/* ── 섹션: 루트 오토 레이아웃 하나에 전부 쌓는다 ──────────── */
const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('지도 포스터 핀'))
const section = figma.createSection()
section.name = '지도 포스터 핀 — 규격 v3 (2026-08-10)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
  section.x = maxX + 200; section.y = 0
}

const root = F('규격', { dir: 'V', gap: 64, pad: 64, fill: 'neutral/100' })
section.appendChild(root)
root.x = section.x; root.y = section.y      // 좌표를 만지는 곳은 여기 한 곳뿐

/** 라벨 + 내용 한 덩어리 */
async function group(title, desc) {
  const g = F('group', { dir: 'V', gap: 24 })
  root.appendChild(g)
  const head = F('head', { dir: 'V', gap: 4 })
  g.appendChild(head)
  head.appendChild(await ST(title, '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 }))
  if (desc) head.appendChild(await ST(desc, '2.0/meta', 'neutral/600', { font: P('Regular'), size: 12 }))
  return g
}

/* 1. 포스터 핀 — Capacity 1|3|6 × State */
const g1 = await group('2.0/PosterPin', '줌 용량 1 / 3 / 6 × 기본 / 선택 — 초과분은 오버레이 없이 우상단 +N 칩')
const OVERFLOW = { 1: '+11', 3: '+9', 6: '+4' }
const pinComps = []
for (const capacity of [1, 3, 6]) {
  for (const selected of [false, true]) {
    const card = await gridCard({ capacity, selected })
    const area = await pinFrame(g1, card, { selected, chipLabel: OVERFLOW[capacity] })
    pinComps.push(toComponent(area, `Capacity=${capacity}, State=${selected ? 'selected' : 'default'}`))
  }
}
const pinSet = figma.combineAsVariants(pinComps, g1)
pinSet.name = '2.0/PosterPin'
pinSet.layoutMode = 'HORIZONTAL'
pinSet.itemSpacing = 48
pinSet.counterAxisAlignItems = 'MIN'
pinSet.paddingTop = 48; pinSet.paddingBottom = 48; pinSet.paddingLeft = 48; pinSet.paddingRight = 48
pinSet.primaryAxisSizingMode = 'AUTO'
pinSet.counterAxisSizingMode = 'AUTO'

/* 2. 일정 모드 */
const g2 = await group('2.0/PosterPinSchedule', '단일 영화 필터 시 — full(요일+시간) / dates(요일만). 패딩·간격은 포스터 핀과 동일')
const schComps = []
for (const showTimes of [true, false]) {
  const card = await scheduleCard({ showTimes })
  const area = await pinFrame(g2, card, { selected: false, chipLabel: showTimes ? '3회' : '1회' })
  schComps.push(toComponent(area, `Mode=${showTimes ? 'full' : 'dates'}`))
}
const schSet = figma.combineAsVariants(schComps, g2)
schSet.name = '2.0/PosterPinSchedule'
schSet.layoutMode = 'HORIZONTAL'
schSet.itemSpacing = 48
schSet.counterAxisAlignItems = 'MIN'
schSet.paddingTop = 48; schSet.paddingBottom = 48; schSet.paddingLeft = 48; schSet.paddingRight = 48
schSet.primaryAxisSizingMode = 'AUTO'
schSet.counterAxisSizingMode = 'AUTO'

/* 3. 필터 매치 예시 — 배리언트는 늘리지 않는다 */
const g3 = await group('필터 매치', '칩 라벨이 "N편 일치"로 바뀌고 매칭 포스터에 primary 링')
const matchCard = await gridCard({ capacity: 3, selected: false, highlightFirst: true })
const matchArea = await pinFrame(g3, matchCard, { selected: false, chipLabel: '3편 일치' })

/* 4. 노트 */
const g4 = await group('규격 노트', null)
const note = await ST([
  `· 포스터 ${PW}×${PH} r4(badge) · 카드 패딩 ${CARD_PAD} · 슬롯 간격 ${SLOT_GAP} · r8(button) · 보더 1.5 neutral/200 · shadow md(선택 시 lg) → 3열 카드 폭 ${PW * 3 + SLOT_GAP * 2 + CARD_PAD * 2}`,
  '· 일정 모드(사용자 확정): 포스터가 카드 세로를 꽉 채운다(2:3 유지) · 디바이더 실선 · 시간 2.0/num/seat(12) · 요일 라벨 2.0/label(10) 28px 정렬선',
  `· 꼬리: 지역 힌트 팝업과 동일 문법 — ${TAIL}×${TAIL} 정사각 r4 rotate45, 팁 쪽 두 변(top·left)만 보더. 회전 원점 탓에 좌표가 어긋나므로 바운딩박스로 보정한다`,
  '· 코너 칩 공용: 2.0/label(10) · pad 4/8 · pill · primary/700 면 · neutral/100 보더 1.5 · shadow sm',
  '· 줌 용량: ≤13 → 0(점 핀) · 14 → 1 · 15 → 3 · 16+ → 6(3×2)',
  '· 포스터 줌 스케일(모바일): 기본 44×66 · 17 → 56×84 · 18 → 60×90 · 19 → 66×99 / 데스크톱 74·90·108·126 폭',
  '· 일정 모드 임계값: 데스크톱 dates 15 / full 17 · 모바일 dates 13 / full 15',
  '· 색은 2.0 컬렉션에서만 바인딩 — 레거시 Primitives/Semantic에 같은 이름이 있어 구 블루가 붙던 문제가 있었다',
  '· 호버 툴팁(pm-tip)·전체 목록(po-list)은 CSS 모듈 — 이 시안 범위 밖',
].join('\n'), '2.0/meta', 'neutral/600', { font: P('Regular'), size: 12 })
g4.appendChild(note)

section.resizeWithoutConstraints(root.width, root.height)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`포스터 핀 규격 v3${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log([...new Set(report)].join('\n'))
