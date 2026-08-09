// 공용 컴포넌트 추출 (2026-08-09) — "Design System" 페이지에 섹션 생성
// TOBE 프레임들에 로컬로 반복되던 6종을 세트로 승격 (수치는 코드 실측):
//  1. 2.0/SurveyChoice   State=off/on — 설문 선택 카드 h48 r12 (on: primary/100 + 700 보더 + 체크)
//  2. 2.0/BookingCTA     Type=card/bar — 회차 선택 CTA (2.0/Button·IconButton 인스턴스 조립)
//  3. 2.0/DetailTopBar   상세 공통 상단 바 (뒤로 + crumb + trailing)
//  4. 2.0/SectionHeader  섹션 제목(display-h2) + 더보기 trailing (Trailing=none/more)
//  5. 2.0/Dropdown, 2.0/DropdownRow  리스트 팝오버 일반화 (Row State=default/selected)
//  6. 2.0/RegionHintBubble  지역 설정 힌트 말풍선 (w276, 코드 통일 스펙)
// Scripter에서 Run.

const HEX = {
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/900': '#0C0A08',
  'white': '#FFFFFF', 'primary/700': '#404E81', 'primary/900': '#1F2747', 'primary/100': '#ECEFF9',
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
let kimmOK = true
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch { kimmOK = false; report.push('KIMM 폰트 미로드') }

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
  f.clipsContent = false
  return f
}
function T(chars, o = {}) {
  const t = figma.createText()
  if (o.kimm && kimmOK) t.fontName = { family: 'KIMM_Bold', style: 'B' }
  else t.fontName = { family: 'Pretendard', style: o.weight || 'Regular' }
  t.fontSize = o.size || 14
  t.characters = chars
  t.fills = [paint(o.color || 'neutral/900')]
  if (o.ls) t.letterSpacing = { unit: 'PERCENT', value: o.ls }
  return t
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

/* ── 1. SurveyChoice ─────────────────────────────────────────── */
function surveyChoice(on) {
  const c = figma.createComponent()
  c.name = `State=${on ? 'on' : 'off'}`
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 16; c.paddingRight = 16
  c.itemSpacing = 10
  c.fills = [paint(on ? 'primary/100' : 'neutral/200')]
  if (on) { c.strokes = [paint('primary/700')]; c.strokeWeight = 1 }
  c.cornerRadius = 12
  c.resize(392, 48)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  const circle = figma.createEllipse()
  circle.resize(18, 18)
  if (on) circle.fills = [paint('primary/700')]
  else { circle.fills = []; circle.strokes = [paint('neutral/300')]; circle.strokeWeight = 1.5 }
  c.appendChild(circle)
  c.appendChild(T('지도로 한눈에 보여서 편해요', { size: 14, weight: on ? 'SemiBold' : 'Medium', color: on ? 'primary/900' : 'neutral/700' }))
  return c
}

/* ── 2. BookingCTA ───────────────────────────────────────────── */
function bookingCard() {
  const c = figma.createComponent()
  c.name = 'Type=card'
  c.layoutMode = 'VERTICAL'
  c.itemSpacing = 12
  c.paddingTop = 16; c.paddingBottom = 16; c.paddingLeft = 16; c.paddingRight = 16
  c.fills = [paint('white')]
  c.cornerRadius = 16
  c.effects = [{ type: 'DROP_SHADOW', color: { r: 0.08, g: 0.06, b: 0.04, a: 0.18 }, offset: { x: 0, y: 12 }, radius: 32, visible: true, blendMode: 'NORMAL' }]
  c.resize(320, 100)
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  const meta = F('meta', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  meta.appendChild(T('회차 선택됨', { size: 10, weight: 'Medium', color: 'neutral/500' }))
  meta.appendChild(T('스파이더맨: 브랜드 뉴 데이', { size: 14, weight: 'Bold' }))
  meta.appendChild(T('16:00 → 18:24 · 잔여석 69/89석', { size: 12, color: 'neutral/600' }))
  c.appendChild(meta)
  const row = F('actions', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], align: 'CENTER', w: 288 })
  const share = iconButtonInst('overlay', 44, '2.0/icon/share-2')
  if (share) row.appendChild(share)
  const cta = buttonInst('예매하러 가기', 'Primary', 'md')
  row.appendChild(cta)
  cta.layoutSizingHorizontal = 'FILL'
  c.appendChild(row)
  return c
}
function bookingBar() {
  const c = figma.createComponent()
  c.name = 'Type=bar'
  c.layoutMode = 'HORIZONTAL'
  c.itemSpacing = 12
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingTop = 12; c.paddingBottom = 12; c.paddingLeft = 16; c.paddingRight = 12
  c.fills = [paint('white')]
  c.cornerRadius = 16
  c.effects = [{ type: 'DROP_SHADOW', color: { r: 0.08, g: 0.06, b: 0.04, a: 0.16 }, offset: { x: 0, y: -6 }, radius: 24, visible: true, blendMode: 'NORMAL' }]
  c.resize(390, 68)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  const meta = F('meta', { dir: 'V', gap: 2, pad: [0, 0, 0, 0] })
  meta.appendChild(T('스파이더맨: 브랜드 뉴 데이', { size: 13, weight: 'Bold' }))
  meta.appendChild(T('16:00 · 잔여 69석', { size: 11, color: 'neutral/600' }))
  c.appendChild(meta)
  const right = F('actions', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], align: 'CENTER' })
  const cta = buttonInst('예매하러 가기', 'Primary', 'sm')
  right.appendChild(cta)
  const close = iconButtonInst('overlay', 32, '2.0/icon/x')
  if (close) right.appendChild(close)
  c.appendChild(right)
  return c
}

/* ── 3. DetailTopBar ─────────────────────────────────────────── */
function detailTopBar() {
  const c = figma.createComponent()
  c.name = '2.0/DetailTopBar'
  c.layoutMode = 'HORIZONTAL'
  c.itemSpacing = 4
  c.counterAxisAlignItems = 'CENTER'
  c.paddingLeft = 4; c.paddingRight = 12
  c.fills = [paint('neutral/100')]
  c.strokes = [paint('neutral/200')]; c.strokeWeight = 1
  c.strokeAlign = 'INSIDE'
  c.resize(800, 52)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  const back = iconButtonInst('ghost', 44, '2.0/icon/chevron-left')
  if (back) c.appendChild(back)
  c.appendChild(T('영화', { size: 12, color: 'neutral/500' }))
  c.appendChild(T('>', { size: 12, color: 'neutral/500' }))
  const title = T('어떻게 해야 했을까?', { size: 12, weight: 'SemiBold', color: 'neutral/900' })
  c.appendChild(title)
  title.layoutSizingHorizontal = 'FILL'
  const trailing = F('trailing 슬롯', { dir: 'H', gap: 0, pad: [4, 8, 4, 8], fill: 'neutral/200', r: 8 })
  trailing.appendChild(T('trailing', { size: 10, color: 'neutral/500' }))
  c.appendChild(trailing)
  return c
}

/* ── 4. SectionHeader ────────────────────────────────────────── */
function sectionHeader(withMore) {
  const c = figma.createComponent()
  c.name = `Trailing=${withMore ? 'more' : 'none'}`
  c.layoutMode = 'HORIZONTAL'
  c.counterAxisAlignItems = 'CENTER'
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'
  c.resize(392, 32)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.appendChild(T('주목할 영화제', { kimm: true, weight: 'Bold', size: 20, ls: kimmOK ? 5 : 0 }))
  if (withMore) {
    const more = F('more', { dir: 'H', gap: 2, pad: [0, 0, 0, 0], align: 'CENTER' })
    more.appendChild(T('더보기', { size: 12, weight: 'Medium', color: 'neutral/500' }))
    const chev = iconInst('2.0/icon/chevron-right', 12)
    if (chev) more.appendChild(chev)
    c.appendChild(more)
  }
  return c
}

/* ── 5. Dropdown + DropdownRow ───────────────────────────────── */
function dropdownRow(selected) {
  const c = figma.createComponent()
  c.name = `State=${selected ? 'selected' : 'default'}`
  c.layoutMode = 'HORIZONTAL'
  c.counterAxisAlignItems = 'CENTER'
  c.itemSpacing = 8
  c.paddingLeft = 16; c.paddingRight = 16
  c.fills = selected ? [paint('primary/100')] : []
  c.resize(220, 44)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  const label = T('서울', { size: 14, weight: selected ? 'SemiBold' : 'Medium', color: selected ? 'primary/900' : 'neutral/700' })
  c.appendChild(label)
  label.layoutSizingHorizontal = 'FILL'
  if (selected) {
    const check = iconInst('2.0/icon/check', 14)
    if (check) c.appendChild(check)
  }
  return c
}
function dropdownContainer(rowSet) {
  const c = figma.createComponent()
  c.name = '2.0/Dropdown'
  c.layoutMode = 'VERTICAL'
  c.paddingTop = 8; c.paddingBottom = 8
  c.fills = [paint('white')]
  c.cornerRadius = 16
  c.effects = [{ type: 'DROP_SHADOW', color: { r: 0.08, g: 0.06, b: 0.04, a: 0.16 }, offset: { x: 0, y: 10 }, radius: 28, visible: true, blendMode: 'NORMAL' }]
  c.resize(220, 100)
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  const labels = ['서울', '부산', '대구']
  labels.forEach((l, i) => {
    const v = rowSet.children.find(x => x.name === `State=${i === 0 ? 'selected' : 'default'}`)
    if (!v) return
    const inst = v.createInstance()
    const t = inst.findOne(n => n.type === 'TEXT')
    if (t) { try { t.characters = l } catch { /* 무시 */ } }
    c.appendChild(inst)
    inst.layoutSizingHorizontal = 'FILL'
  })
  return c
}

/* ── 6. RegionHintBubble ─────────────────────────────────────── */
function regionHintBubble() {
  const c = figma.createComponent()
  c.name = '2.0/RegionHintBubble'
  c.layoutMode = 'HORIZONTAL'
  c.counterAxisAlignItems = 'MIN'
  c.itemSpacing = 12
  c.paddingTop = 12; c.paddingBottom = 12; c.paddingLeft = 16; c.paddingRight = 12
  c.fills = [paint('primary/700')]
  c.cornerRadius = 12
  c.effects = [{ type: 'DROP_SHADOW', color: { r: 0.15, g: 0.21, b: 0.29, a: 0.34 }, offset: { x: 0, y: 10 }, radius: 28, visible: true, blendMode: 'NORMAL' }]
  c.resize(276, 60)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'AUTO'
  const pin = iconInst('2.0/icon/map-pin', 15)
  if (pin) {
    c.appendChild(pin)
    for (const vec of pin.findAll(n => 'strokes' in n)) {
      try { if (vec.strokes && vec.strokes.length) vec.strokes = [paint('white')] } catch { /* 무시 */ }
    }
  }
  const txt = T('지역을 설정해서 내 주변 영화관의 상영 정보를 조회하세요', { size: 12, weight: 'Medium', color: 'white' })
  c.appendChild(txt)
  txt.layoutSizingHorizontal = 'FILL'
  const close = F('close', { dir: 'H', align: 'CENTER', mainAlign: 'CENTER', w: 18, h: 18, r: 9 })
  close.fills = [paint('white', 0.2)]
  const x = iconInst('2.0/icon/x', 8)
  if (x) close.appendChild(x)
  c.appendChild(close)
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

place([surveyChoice(false), surveyChoice(true)], '2.0/SurveyChoice')
place([bookingCard(), bookingBar()], '2.0/BookingCTA')
place([detailTopBar()])
place([sectionHeader(true), sectionHeader(false)], '2.0/SectionHeader')
const rowSet = place([dropdownRow(false), dropdownRow(true)], '2.0/DropdownRow')
place([dropdownContainer(rowSet)])
place([regionHintBubble()])

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  '공용 추출 6종 (2026-08-09, 코드 실측) — TOBE 프레임 로컬 반복분의 세트 승격',
  '· SurveyChoice: 392×48 r12 · off=neutral/200 · on=primary/100+700 1px+체크(18)',
  '· BookingCTA: card(회차 메타+공유 overlay 44+예매 Primary md) / bar(390×68, 예매 sm+닫기 overlay 32)',
  '· DetailTopBar: h52 · 뒤로 IconButton ghost 44 · crumb meta 12 · trailing 슬롯',
  '· SectionHeader: display-h2 + 더보기(meta 12+chevron 12) — Trailing=more/none',
  '· Dropdown(r16·shadow·pad-y 8) + DropdownRow(220×44, selected=primary/100+check)',
  '· RegionHintBubble: 276 · primary/700 · r12 · pad 12/16 · 닫기 18(white 20%)',
  ...(report.length ? ['', '경고:', ...[...new Set(report)]] : []),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 8
section.resizeWithoutConstraints(1000, y + 60)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`공용 컴포넌트 6종 추출 완료${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
