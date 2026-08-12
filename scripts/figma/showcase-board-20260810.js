// 포트폴리오용 디자인 시스템 쇼케이스 보드 (2026-08-10)
//
//  etc 페이지의 "영화-디자인시스템" 프레임을 찾아 그 안에 보드를 그린다(없으면 만든다).
//  실제 2.0 컴포넌트를 인스턴스로 가져다 쓴다 — 그림이 아니라 진짜 시스템이라는 게 보여야 한다.
//  크기는 보드 가독성 우선으로 조정한다(실제 렌더 크기와 달라도 됨).
//
//  고른 기준: 이 서비스가 아니면 나올 수 없는 것 위주.
//   지도 핀(GvPin·PosterPin) · 회차 셀 · 날짜 셀 · 포스터 아이템 — 여기가 정체성이다.
//   버튼·칩·검색은 어느 서비스에나 있지만 토큰이 어떻게 붙는지 보여주는 최소 세트로 넣는다.
//
//  배경은 레퍼런스처럼 어둡게 가지 않고 우리 팔레트(미색 종이 + 인디고)를 쓴다.
//  어두운 보드는 그쪽 브랜드가 딥그린이라 성립하는 거고, 우리 정체성은 종이다.
// Scripter에서 Run.

const report = []
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

/* ── 토큰 ─────────────────────────────────────────────────── */
const colorVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.resolvedType === 'COLOR' && !colorVar.has(v.name)) colorVar.set(v.name, v)
  }
}
const HEX = {
  'surface/bg': '#FAF9F8', 'surface/card': '#FFFFFF', 'surface/border': '#EAE5E1',
  'text/primary': '#0C0A08', 'text/sub': '#726B65', 'text/caption': '#8D8781',
  'primary/base': '#404E81', 'primary/subtle': '#ECEFF9', 'status/gv': '#3E1782',
  'status/warning': '#B9800E', 'status/success': '#4A7C59', 'status/error': '#9B3331',
  'neutral/900': '#0C0A08', 'neutral/800': '#2B2622', 'white': '#FFFFFF',
}
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] ?? '#FF00FF') }
  const v = colorVar.get(name)
  if (!v) { report.push('변수 없음: ' + name); return solid }
  return figma.variables.setBoundVariableForPaint(solid, 'color', v)
}
const raw = (hex) => ({ type: 'SOLID', color: rgb(hex) })

const P = (s) => ({ family: 'Pretendard', style: s })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))
let KIMM = { family: 'KIMM_Bold', style: 'B' }
try { await figma.loadFontAsync(KIMM) } catch {
  const fonts = await figma.listAvailableFontsAsync()
  const c = fonts.find(f => /KIMM/i.test(f.fontName.family))
  KIMM = c ? c.fontName : P('Bold')
  await figma.loadFontAsync(KIMM)
}
const textStyles = await figma.getLocalTextStylesAsync()
const tStyle = (n) => textStyles.find(s => s.name === n)

async function T(chars, { style, font, size, color = 'text/primary', ls } = {}) {
  const t = figma.createText()
  const st = style ? tStyle(style) : null
  if (st) await t.setTextStyleIdAsync(st.id)
  else { t.fontName = font ?? P('Regular'); t.fontSize = size ?? 12 }
  t.characters = chars
  t.fills = [paint(color)]
  if (ls) t.letterSpacing = { unit: 'PIXELS', value: ls }
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
    if (o.wrap) f.layoutWrap = 'WRAP'
  }
  f.fills = o.fill ? [typeof o.fill === 'string' ? paint(o.fill) : o.fill] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.w != null) f.resize(o.w, o.h ?? f.height)
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else if (f.layoutMode === 'VERTICAL') {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW ?? 1.5; f.strokeAlign = 'INSIDE' }
  f.clipsContent = o.clip ?? false
  return f
}

/* ── 실제 컴포넌트 인스턴스 ───────────────────────────────── */
const compByName = new Map()
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const n of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
    if (!compByName.has(n.name)) compByName.set(n.name, n)
  }
}
/** name으로 인스턴스 생성. 세트면 variantName 우선, 없으면 첫 배리언트 */
function inst(name, variantName, scale) {
  const node = compByName.get(name)
  if (!node) { report.push('컴포넌트 없음: ' + name); return null }
  const comp = node.type === 'COMPONENT_SET'
    ? (node.children.find(c => c.name === variantName) ?? node.defaultVariant ?? node.children[0])
    : node
  const i = comp.createInstance()
  if (scale && scale !== 1) i.rescale(scale)
  return i
}

/* ── 카드 ─────────────────────────────────────────────────── */
async function card(title, desc, w) {
  const c = F(`card/${title}`, {
    dir: 'V', gap: 20, pad: 24, r: 16, w,
    fill: 'surface/card', stroke: 'surface/border', strokeW: 1.5,
  })
  const head = F('head', { dir: 'V', gap: 4 })
  c.appendChild(head)
  head.appendChild(await T(title, { style: '2.0/body-strong', font: P('Bold'), size: 14 }))
  if (desc) head.appendChild(await T(desc, { style: '2.0/note', font: P('Regular'), size: 12, color: 'text/sub' }))
  return c
}
async function label(chars) {
  return T(chars, { style: '2.0/label', font: P('Medium'), size: 10, color: 'text/caption' })
}

/* ── 보드 ─────────────────────────────────────────────────── */
let host = null
for (const page of figma.root.children) {
  const hit = page.findOne(n => n.type === 'FRAME' && /디자인\s*시스템/.test(n.name) && n.parent === page)
  if (hit) { host = hit; break }
}
if (!host) {
  let etc = figma.root.children.find(p => p.name === 'etc')
  if (!etc) { etc = figma.createPage(); etc.name = 'etc' }
  await etc.loadAsync()
  host = figma.createFrame()
  host.name = '영화-디자인시스템'
  etc.appendChild(host)
  const maxY = Math.max(0, ...etc.children.filter(n => n !== host).map(n => n.y + n.height))
  host.x = 0; host.y = maxY + 200
  report.push('프레임을 못 찾아 새로 만들었다')
}
host.layoutMode = 'VERTICAL'
host.itemSpacing = 32
host.paddingTop = 64; host.paddingBottom = 64; host.paddingLeft = 64; host.paddingRight = 64
host.primaryAxisSizingMode = 'AUTO'
host.counterAxisSizingMode = 'AUTO'
host.fills = [paint('surface/bg')]
host.clipsContent = false
for (const k of [...host.children]) k.remove()

/* 헤더 */
{
  const head = F('header', { dir: 'V', gap: 8 })
  host.appendChild(head)
  head.appendChild(await T('영화볼지도 디자인 시스템 2.0', { font: KIMM, size: 32, ls: 1.6 }))
  head.appendChild(await T(
    '원시값 → 역할 → 컴포넌트 3계층. 색·간격·타이포·그림자를 변수로 묶고, 화면은 컴포넌트 조합으로만 그린다.',
    { style: '2.0/body', font: P('Regular'), size: 14, color: 'text/sub' },
  ))
}

const body = F('body', { dir: 'H', gap: 24, align: 'MIN' })
host.appendChild(body)
const colA = F('colA', { dir: 'V', gap: 24 }); body.appendChild(colA)   // 색(넓음)
const colB = F('colB', { dir: 'V', gap: 24 }); body.appendChild(colB)   // 로고·타이포·아이콘
const colC = F('colC', { dir: 'V', gap: 24 }); body.appendChild(colC)   // 컴포넌트

/* ── A1. 로고 ─────────────────────────────────────────────── */
{
  const c = await card('Logo', '간판은 KIMM, 본문은 Pretendard', 380)
  colB.appendChild(c)
  const row = F('row', { dir: 'H', gap: 20, align: 'CENTER' })
  c.appendChild(row)
  const tile = inst('2.0/logo/tile', undefined, 0.6)
  if (tile) row.appendChild(tile)
  const word = inst('2.0/logo/wordmark', undefined, 0.6)
  if (word) row.appendChild(word)
}

/* ── A2. 색 — 램프 전체 + HSL 근거 ──────────────────────── */
{
  const c = await card('Color', 'HSL로 짠 램프 — 색상은 고정, 명도는 균등, 채도만 양 끝에서 올린다', 560)
  colA.appendChild(c)

  /** 램프 한 줄: 이름 + 9(또는 5·3)칸 + 양 끝 HSL */
  async function ramp(title, note, stops) {
    const g = F(`ramp/${title}`, { dir: 'V', gap: 8 })
    c.appendChild(g)
    const head = F('h', { dir: 'H', gap: 8, align: 'CENTER' })
    g.appendChild(head)
    head.appendChild(await T(title, { style: '2.0/body-strong', font: P('Bold'), size: 14 }))
    head.appendChild(await T(note, { style: '2.0/label', font: P('Regular'), size: 10, color: 'text/sub' }))
    const row = F('row', { dir: 'H', gap: 0 })
    g.appendChild(row)
    for (let i = 0; i < stops.length; i++) {
      const [stop, hex, h, sat, l] = stops[i]
      const cell = F(`${stop}`, { dir: 'V', gap: 0, w: 512 / stops.length, h: 64, fill: raw(hex), mainAlign: 'MAX', pad: [0, 0, 6, 6] })
      if (i === 0) { cell.topLeftRadius = 10; cell.bottomLeftRadius = 10 }
      if (i === stops.length - 1) { cell.topRightRadius = 10; cell.bottomRightRadius = 10 }
      row.appendChild(cell)
      const t = await T(stop, { font: P('Bold'), size: 10 })
      t.fills = [raw(l > 55 ? '#0C0A08' : '#FFFFFF')]
      cell.appendChild(t)
    }
    const scale = F('scale', { dir: 'H', gap: 0 })
    g.appendChild(scale)
    for (const [stop, hex, h, sat, l] of stops) {
      const cell = F(`hsl/${stop}`, { dir: 'V', gap: 0, w: 512 / stops.length })
      scale.appendChild(cell)
      const t = await T(`S${sat} L${l}`, { font: P('Regular'), size: 9, color: 'text/caption' })
      cell.appendChild(t)
    }
    return g
  }

  await ramp('Neutral', 'H 27–32 · 웜그레이', [
    ['900', '#0C0A08', 30, 20, 4], ['800', '#2B2622', 27, 12, 15], ['700', '#58524B', 32, 8, 32],
    ['600', '#726B65', 28, 6, 42], ['500', '#8D8781', 30, 5, 53], ['400', '#A7A19A', 32, 7, 63],
    ['300', '#C6BFB9', 28, 10, 75], ['200', '#EAE5E1', 27, 18, 90], ['100', '#FAF9F8', 30, 17, 98],
  ])
  await ramp('Primary', 'H 226–228 · 인디고', [
    ['900', '#1F2747', 228, 39, 20], ['800', '#2F3A65', 228, 36, 29], ['700', '#404E81', 227, 34, 38],
    ['600', '#51629E', 227, 32, 47], ['500', '#6D7CB0', 227, 30, 56], ['400', '#8794C5', 227, 35, 65],
    ['300', '#A6B1D9', 227, 40, 75], ['200', '#C4CCE9', 227, 46, 84], ['100', '#ECEFF9', 226, 52, 95],
  ])
  await ramp('Warning', 'H 38–41 · 오커', [
    ['900', '#885907', 38, 90, 28], ['700', '#B9800E', 40, 86, 39], ['500', '#E59B1A', 38, 80, 50],
    ['300', '#F5CA75', 40, 86, 71], ['100', '#FDF1D8', 41, 90, 92],
  ])
  await ramp('Success', 'H 138 고정', [
    ['900', '#2B5036', 138, 30, 24], ['700', '#4A7C59', 138, 25, 39], ['500', '#75A383', 138, 20, 55],
    ['300', '#9FC6AB', 138, 25, 70], ['100', '#E4F1E8', 138, 32, 92],
  ])
  await ramp('Error', 'H 1–3 고정', [
    ['900', '#9B3331', 1, 52, 40], ['700', '#BD4E4C', 1, 46, 52], ['500', '#C98382', 1, 40, 65],
    ['300', '#E0AFAE', 1, 45, 78], ['100', '#F5E1E0', 3, 51, 92],
  ])
  await ramp('GV', 'H 262 고정 · 이벤트 전용', [
    ['900', '#3E1782', 262, 70, 30], ['500', '#8C66CC', 262, 50, 60], ['100', '#E7DCF9', 263, 71, 92],
  ])

  const why = F('why', { dir: 'V', gap: 6, pad: 16, r: 12, fill: 'primary/subtle' })
  c.appendChild(why)
  why.appendChild(await T('왜 채도를 U자로 짰나', { style: '2.0/body-strong', font: P('Bold'), size: 14, color: 'primary/base' }))
  why.appendChild(await T([
    '색상(H)은 램프 안에서 고정하고 명도(L)만 균등하게 나눴다. 채도(S)는 가운데를 낮추고 양 끝에서 올린다 —',
    '중간 톤은 채도가 높으면 탁해 보이고, 양 끝은 채도를 주지 않으면 죽은 회색·죽은 흰색이 된다.',
    'neutral도 무채색이 아니라 H 30 언저리를 유지한다. 종이 느낌을 내려면 회색이 아니라 미색이어야 했다.',
  ].join('\n'), { style: '2.0/note', font: P('Regular'), size: 12, color: 'primary/base' }))

  const status = F('status', { dir: 'H', gap: 8, align: 'CENTER' })
  c.appendChild(status)
  for (const [t, l] of [['status/success', '상영중'], ['status/warning', '잔여 적음'], ['status/error', '매진'], ['status/gv', 'GV']]) {
    const chip = F('chip', { dir: 'H', pad: [6, 12, 6, 12], r: 9999, fill: t, align: 'CENTER' })
    status.appendChild(chip)
    chip.appendChild(await T(l, { style: '2.0/label', font: P('Medium'), size: 10, color: 'white' }))
  }
}

/* ── B1. 타이포 ───────────────────────────────────────────── */
{
  const c = await card('Typography', 'KIMM은 간판 전용 · 본문은 Pretendard', 380)
  colB.appendChild(c)
  const list = F('list', { dir: 'V', gap: 14 })
  c.appendChild(list)
  for (const [sample, spec, font, size] of [
    ['영화볼지도', 'display/h1 · KIMM 24', KIMM, 24],
    ['오늘 뭐 볼까', 'display/h2 · KIMM 20', KIMM, 20],
    ['괴인 · 이정홍', 'body · Pretendard 14', P('Medium'), 14],
    ['19:30 상영 후 · 잔여 12석', 'meta · Pretendard 12', P('Regular'), 12],
    ['GV · 매진 임박', 'label · Pretendard 10', P('Medium'), 10],
  ]) {
    const row = F('row', { dir: 'V', gap: 2 })
    list.appendChild(row)
    row.appendChild(await T(sample, { font, size }))
    row.appendChild(await label(spec))
  }
}

/* ── B2. 아이콘 — Lucide 그대로라 최소로 ─────────────────── */
{
  const c = await card('Icon', 'Lucide · stroke 1.75 · currentColor 상속', 380)
  colB.appendChild(c)
  const grid = F('icons', { dir: 'H', gap: 18, align: 'CENTER' })
  c.appendChild(grid)
  for (const n of ['map', 'film', 'search', 'map-pin', 'clapperboard', 'theater']) {
    const i = inst(`2.0/icon/${n}`, undefined, 1.2)
    if (i) grid.appendChild(i)
  }
}

/* ── C. 컴포넌트 ──────────────────────────────────────────── */
{
  const c = await card('Component', '이 서비스가 아니면 나오지 않는 것 위주로', 560)
  colC.appendChild(c)

  async function group(title, items) {
    const g = F(`g/${title}`, { dir: 'V', gap: 10 })
    c.appendChild(g)
    g.appendChild(await label(title))
    const row = F('row', { dir: 'H', gap: 12, align: 'CENTER', wrap: true, w: 512 })
    g.appendChild(row)
    for (const it of items) if (it) row.appendChild(it)
    return g
  }

  await group('지도 핀 — 지도 위에서 상영 정보를 읽는 장치', [
    inst('2.0/PosterPin', 'Capacity=3, State=default', 0.9),
    inst('2.0/GvPin', 'Count=multi, State=default', 0.9),
  ])
  await group('상영 정보', [
    inst('2.0/ShowtimeCell', undefined, 1),
    inst('2.0/ShowtimeGroupCard', undefined, 0.8),
    inst('2.0/DateCell', undefined, 1),
  ])
  await group('선택 · 필터', [
    inst('2.0/FilterPill', undefined, 1),
    inst('2.0/FilterButton', undefined, 1),
    inst('2.0/Chip', undefined, 1),
    inst('2.0/SortToggle', undefined, 1),
  ])
  await group('버튼', [
    inst('2.0/Button', 'Variant=Primary, Size=md, Icon=none, State=default', 1),
    inst('2.0/Button', 'Variant=Secondary, Size=md, Icon=none, State=default', 1),
    inst('2.0/IconButton', undefined, 1),
  ])
  await group('안내', [
    inst('2.0/RegionHintBubble', undefined, 0.8),
  ])
}

figma.viewport.scrollAndZoomIntoView([host])
figma.notify(`쇼케이스 보드 생성${report.length ? ` · 확인 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log([...new Set(report)].join('\n'))
