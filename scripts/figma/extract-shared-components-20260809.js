// 공용 컴포넌트 6종 추출 v2 (2026-08-09) — 전부 토큰 기반:
//  색 = 2.0 변수 컬렉션 바인딩 · 스페이싱/래디우스 = spacing/*·radius/* 변수 바인딩
//  타이포 = 2.0/* 텍스트 스타일 링크 · 그림자 = 2.0/shadow/* 이펙트 스타일 링크
// 세트: SurveyChoice · BookingCTA · DetailTopBar · SectionHeader · Dropdown(+Row) · RegionHintBubble
// Scripter에서 Run. "Design System" 페이지 섹션 재생성.

const report = []

/* ── 토큰 인프라 ─────────────────────────────────────────────── */
const HEX = {
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/900': '#0C0A08',
  'white': '#FFFFFF', 'primary/700': '#404E81', 'primary/900': '#1F2747', 'primary/100': '#ECEFF9',
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
function paint(name, opacity) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  if (opacity != null) solid.opacity = opacity
  const v = colorVar.get(name)
  if (!v) { report.push('색 변수 없음: ' + name); return solid }
  return figma.variables.setBoundVariableForPaint(solid, 'color', v)
}
const SPACING = { 4: 'spacing/1', 8: 'spacing/2', 12: 'spacing/3', 16: 'spacing/4', 24: 'spacing/6', 32: 'spacing/8', 48: 'spacing/12' }
const RADIUS = { 4: 'radius/badge', 8: 'radius/button', 12: 'radius/control', 16: 'radius/popover', 20: 'radius/sheet', 9999: 'radius/pill' }
function bind(node, field, varName) {
  const v = floatVar.get(varName)
  if (!v) { report.push('변수 없음: ' + varName); return }
  try { node.setBoundVariable(field, v) } catch { report.push('바인딩 실패: ' + field + '←' + varName) }
}
function autoBind(node) {
  // 패딩·간격 → spacing 변수, radius → radius 변수 (정확히 일치하는 값만)
  for (const f of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing']) {
    const val = node[f]
    if (SPACING[val]) bind(node, f, SPACING[val])
  }
  const r = node.cornerRadius
  if (typeof r === 'number' && RADIUS[r]) {
    for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(node, f, RADIUS[r])
  }
}

const textStyles = await figma.getLocalTextStylesAsync()
const tStyle = (name) => textStyles.find(s => s.name === name)
const effectStyles = await figma.getLocalEffectStylesAsync()
const eStyle = (name) => effectStyles.find(s => s.name === name)
async function applyShadow(node, name) {
  const st = eStyle(name)
  if (!st) { report.push('이펙트 스타일 없음: ' + name); return }
  await node.setEffectStyleIdAsync(st.id)
}

for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch { report.push('KIMM 폰트 미로드') }

/** 텍스트 = 2.0 스타일 링크 + 색 변수 fill */
async function ST(chars, styleName, colorName) {
  const t = figma.createText()
  const st = tStyle(styleName)
  if (st) { await t.setTextStyleIdAsync(st.id) } else { report.push('텍스트 스타일 없음: ' + styleName) }
  try { t.characters = chars } catch { /* 폰트 미로드 */ }
  t.fills = [paint(colorName || 'neutral/900')]
  return t
}

function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL'
  if (o.gap != null) f.itemSpacing = o.gap
  if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
  f.fills = o.fill ? [paint(o.fill)] : []
  if (o.r != null) f.cornerRadius = o.r
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
  autoBind(f)
  return f
}
function findComp(name) {
  for (const page of figma.root.children) {
    const found = page.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === name)
    if (found) return found.type === 'COMPONENT_SET' ? found.defaultVariant : found
  }
  report.push('컴포넌트 없음: ' + name)
  return null
}
function findVariant(setName, variantName) {
  for (const page of figma.root.children) {
    const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === setName)
    if (set) return set.children.find(c => c.name === variantName) ?? null
  }
  report.push('배리언트 없음: ' + setName + ' / ' + variantName)
  return null
}
function iconInst(name, size) {
  const c = findComp(name)
  if (!c) return null
  const i = c.createInstance()
  if (i.width !== size) i.rescale(size / i.width)
  return i
}
function buttonInst(label, variantName, sizeName, w) {
  const v = findVariant('2.0/Button', `Variant=${variantName}, Size=${sizeName}, Icon=none, State=default`)
  if (!v) return F('btn-missing', { dir: 'H', w: w || 120, h: 44, fill: 'neutral/200', r: 8 })
  const inst = v.createInstance()
  const t = inst.findOne(n => n.type === 'TEXT')
  if (t) { try { t.characters = label } catch { /* 무시 */ } }
  if (w) inst.resize(w, inst.height)
  return inst
}
function iconButtonInst(variant, size, iconName) {
  const v = findVariant('2.0/IconButton', `Variant=${variant}, Size=${size}, State=default`)
  if (!v) return F('iconbtn-missing', { dir: 'H', w: size, h: size, fill: 'neutral/200', r: size / 2 })
  const inst = v.createInstance()
  const inner = inst.findOne(n => n.type === 'INSTANCE')
  const target = iconName ? findComp(iconName) : null
  if (inner && target) { try { inner.swapComponent(target) } catch { /* 무시 */ } }
  return inst
}
function asComponent(name) {
  const c = figma.createComponent()
  c.name = name
  return c
}
function frameToComponent(f, name) {
  const c = asComponent(name)
  c.layoutMode = f.layoutMode
  c.itemSpacing = f.itemSpacing
  c.paddingTop = f.paddingTop; c.paddingRight = f.paddingRight; c.paddingBottom = f.paddingBottom; c.paddingLeft = f.paddingLeft
  c.fills = f.fills; c.strokes = f.strokes; c.strokeWeight = f.strokeWeight
  c.cornerRadius = typeof f.cornerRadius === 'number' ? f.cornerRadius : 0
  c.counterAxisAlignItems = f.counterAxisAlignItems
  c.primaryAxisAlignItems = f.primaryAxisAlignItems
  c.resize(f.width, f.height)
  c.primaryAxisSizingMode = f.primaryAxisSizingMode
  c.counterAxisSizingMode = f.counterAxisSizingMode
  for (const k of [...f.children]) c.appendChild(k)
  autoBind(c)
  f.remove()
  return c
}

/* ── 1. SurveyChoice ─────────────────────────────────────────── */
async function surveyChoice(on) {
  const f = F('tmp', { dir: 'H', gap: 12, pad: [0, 16, 0, 16], align: 'CENTER', w: 392, h: 48, fill: on ? 'primary/100' : 'neutral/200', r: 12 })
  const circle = figma.createEllipse()
  circle.resize(18, 18)
  if (on) circle.fills = [paint('primary/700')]
  else { circle.fills = []; circle.strokes = [paint('neutral/300')]; circle.strokeWeight = 1.5 }
  f.appendChild(circle)
  f.appendChild(await ST('지도로 한눈에 보여서 편해요', on ? '2.0/body-strong' : '2.0/body', on ? 'primary/900' : 'neutral/700'))
  const c = frameToComponent(f, `State=${on ? 'on' : 'off'}`)
  if (on) { c.strokes = [paint('primary/700')]; c.strokeWeight = 1 }
  return c
}

/* ── 2. BookingCTA ───────────────────────────────────────────── */
async function bookingCard() {
  const f = F('tmp', { dir: 'V', gap: 12, pad: [16, 16, 16, 16], fill: 'white', r: 16, w: 320 })
  const meta = F('meta', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  meta.appendChild(await ST('회차 선택됨', '2.0/label', 'neutral/500'))
  meta.appendChild(await ST('스파이더맨: 브랜드 뉴 데이', '2.0/body-strong', 'neutral/900'))
  meta.appendChild(await ST('16:00 → 18:24 · 잔여석 69/89석', '2.0/meta', 'neutral/600'))
  f.appendChild(meta)
  const row = F('actions', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], align: 'CENTER', w: 288 })
  const share = iconButtonInst('overlay', 44, '2.0/icon/share-2')
  if (share) row.appendChild(share)
  const cta = buttonInst('예매하러 가기', 'Primary', 'md')
  row.appendChild(cta)
  cta.layoutSizingHorizontal = 'FILL'
  f.appendChild(row)
  const c = frameToComponent(f, 'Type=card')
  await applyShadow(c, '2.0/shadow/lg')
  return c
}
async function bookingBar() {
  const f = F('tmp', { dir: 'H', gap: 12, pad: [12, 12, 12, 16], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', fill: 'white', r: 16, w: 390, h: 68 })
  const meta = F('meta', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  meta.appendChild(await ST('스파이더맨: 브랜드 뉴 데이', '2.0/body-strong', 'neutral/900'))
  meta.appendChild(await ST('16:00 · 잔여 69석', '2.0/meta', 'neutral/600'))
  f.appendChild(meta)
  const right = F('actions', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], align: 'CENTER' })
  right.appendChild(buttonInst('예매하러 가기', 'Primary', 'sm'))
  const close = iconButtonInst('overlay', 32, '2.0/icon/x')
  if (close) right.appendChild(close)
  f.appendChild(right)
  const c = frameToComponent(f, 'Type=bar')
  await applyShadow(c, '2.0/shadow/lg')
  return c
}

/* ── 3. DetailTopBar ─────────────────────────────────────────── */
async function detailTopBar() {
  const f = F('tmp', { dir: 'H', gap: 4, pad: [0, 12, 0, 4], align: 'CENTER', fill: 'neutral/100', w: 800, h: 52 })
  const back = iconButtonInst('ghost', 44, '2.0/icon/chevron-left')
  if (back) f.appendChild(back)
  f.appendChild(await ST('영화', '2.0/meta', 'neutral/500'))
  f.appendChild(await ST('>', '2.0/meta', 'neutral/500'))
  const title = await ST('어떻게 해야 했을까?', '2.0/caption', 'neutral/900')
  f.appendChild(title)
  title.layoutSizingHorizontal = 'FILL'
  const trailing = F('trailing 슬롯', { dir: 'H', gap: 0, pad: [4, 8, 4, 8], fill: 'neutral/200', r: 8 })
  trailing.appendChild(await ST('trailing', '2.0/label', 'neutral/500'))
  f.appendChild(trailing)
  const c = frameToComponent(f, '2.0/DetailTopBar')
  c.strokes = [paint('neutral/200')]
  c.strokeWeight = 1
  c.strokeAlign = 'INSIDE'
  return c
}

/* ── 4. SectionHeader ────────────────────────────────────────── */
async function sectionHeader(withMore) {
  const f = F('tmp', { dir: 'H', pad: [0, 0, 0, 0], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: 392, h: 32 })
  f.appendChild(await ST('주목할 영화제', '2.0/display/h2', 'neutral/900'))
  if (withMore) {
    const more = F('more', { dir: 'H', gap: 4, pad: [0, 0, 0, 0], align: 'CENTER' })
    more.appendChild(await ST('더보기', '2.0/caption', 'neutral/500'))
    const chev = iconInst('2.0/icon/chevron-right', 12)
    if (chev) more.appendChild(chev)
    f.appendChild(more)
  }
  return frameToComponent(f, `Trailing=${withMore ? 'more' : 'none'}`)
}

/* ── 5. Dropdown + DropdownRow ───────────────────────────────── */
async function dropdownRow(selected) {
  const f = F('tmp', { dir: 'H', gap: 8, pad: [0, 16, 0, 16], align: 'CENTER', w: 220, h: 44 })
  if (selected) f.fills = [paint('primary/100')]
  const label = await ST('서울', selected ? '2.0/body-strong' : '2.0/body', selected ? 'primary/900' : 'neutral/700')
  f.appendChild(label)
  label.layoutSizingHorizontal = 'FILL'
  if (selected) {
    const check = iconInst('2.0/icon/check', 14)
    if (check) f.appendChild(check)
  }
  return frameToComponent(f, `State=${selected ? 'selected' : 'default'}`)
}
async function dropdownContainer(rowSet) {
  const f = F('tmp', { dir: 'V', gap: 0, pad: [8, 0, 8, 0], fill: 'white', r: 16, w: 220 })
  const labels = ['서울', '부산', '대구']
  labels.forEach((l, i) => {
    const v = rowSet.children.find(x => x.name === `State=${i === 0 ? 'selected' : 'default'}`)
    if (!v) return
    const inst = v.createInstance()
    const t = inst.findOne(n => n.type === 'TEXT')
    if (t) { try { t.characters = l } catch { /* 무시 */ } }
    f.appendChild(inst)
    inst.layoutSizingHorizontal = 'FILL'
  })
  const c = frameToComponent(f, '2.0/Dropdown')
  await applyShadow(c, '2.0/shadow/md')
  return c
}

/* ── 6. RegionHintBubble ─────────────────────────────────────── */
async function regionHintBubble() {
  const f = F('tmp', { dir: 'H', gap: 12, pad: [12, 12, 12, 16], align: 'MIN', fill: 'primary/700', r: 12, w: 276 })
  const pin = iconInst('2.0/icon/map-pin', 15)
  if (pin) {
    f.appendChild(pin)
    for (const vec of pin.findAll(n => 'strokes' in n)) {
      try { if (vec.strokes && vec.strokes.length) vec.strokes = [paint('white')] } catch { /* 무시 */ }
    }
  }
  const txt = await ST('지역을 설정해서 내 주변 영화관의 상영 정보를 조회하세요', '2.0/caption', 'white')
  f.appendChild(txt)
  txt.layoutSizingHorizontal = 'FILL'
  const close = F('close', { dir: 'H', align: 'CENTER', mainAlign: 'CENTER', w: 18, h: 18, r: 9 })
  close.fills = [paint('white', 0.2)]
  const x = iconInst('2.0/icon/x', 8)
  if (x) close.appendChild(x)
  f.appendChild(close)
  const c = frameToComponent(f, '2.0/RegionHintBubble')
  await applyShadow(c, '2.0/shadow/md')
  return c
}

/* ── 조립 ────────────────────────────────────────────────────── */
const page = figma.root.children.find(p => p.name === 'Design System')
if (!page) { figma.notify('Design System 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const SECTION_NAME = 'Components 2.0 — 공용 추출 (2026-08-09)'
const prev = page.children.find(n => n.type === 'SECTION' && n.name === SECTION_NAME)
if (prev) prev.remove()
const section = figma.createSection()
section.name = SECTION_NAME
page.appendChild(section)

let y = 80
function place(nodes, setName) {
  let x = 60
  for (const n of nodes) { section.appendChild(n); n.x = x; n.y = y; x += n.width + 32 }
  if (setName) {
    const set = figma.combineAsVariants(nodes, section)
    set.name = setName
    set.x = 60; set.y = y
    y += set.height + 72
    return set
  }
  y += Math.max(...nodes.map(n => n.height)) + 72
  return null
}

place([await surveyChoice(false), await surveyChoice(true)], '2.0/SurveyChoice')
place([await bookingCard(), await bookingBar()], '2.0/BookingCTA')
place([await detailTopBar()])
place([await sectionHeader(true), await sectionHeader(false)], '2.0/SectionHeader')
const rowSet = place([await dropdownRow(false), await dropdownRow(true)], '2.0/DropdownRow')
place([await dropdownContainer(rowSet)])
place([await regionHintBubble()])

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  '공용 추출 6종 v2 (2026-08-09) — 전부 토큰: 색=2.0 변수 · 여백/모서리=spacing·radius 변수 바인딩',
  '· 타이포=2.0/* 텍스트 스타일 링크 · 그림자=2.0/shadow/* 이펙트 스타일',
  '· SurveyChoice 392×48 r-control / BookingCTA card·bar(shadow/lg, Button·IconButton 인스턴스)',
  '· DetailTopBar h52 / SectionHeader(display/h2+caption) / Dropdown(r-popover·shadow/md)+Row 220×44 / HintBubble 276(shadow/md)',
  ...(report.length ? ['', '경고:', ...[...new Set(report)]] : []),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 8
section.resizeWithoutConstraints(1000, y + 60)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`공용 컴포넌트 v2 완료${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
