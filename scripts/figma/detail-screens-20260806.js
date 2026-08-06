// 상세 3화면(영화·극장·감독) 코드 → 피그마 이식 (2026-08-06, feature/detail-shell 기준)
// 섹션 "Detail Screens TOBE (code sync)"에 Mobile(402)/PC(1440) 프레임 6장 생성.
// 수치는 전부 코드 실측: DetailShell(레일 64·본문 1000·좌측 r16), DetailTopBar(h52),
// 영화 상세(DateBar·ShowtimeCell 2.0), 극장 상세(그라데이션 히어로·구 날짜탭), 감독 상세(센터 히어로).
// Scripter에서 Run. 실패 요소는 회색 박스 폴백 + 리포트에 기록.

/* ── 토큰 (src/styles/tokens.css 실측) ─────────────────────────── */
const HEX = {
  'neutral/50': '#FAF9F8', 'neutral/100': '#EAE5E1', 'neutral/200': '#EAE5E1',
  'neutral/300': '#C6BFB9', 'neutral/400': '#A7A19A', 'neutral/500': '#8D8781',
  'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/800': '#2B2622',
  'neutral/900': '#0C0A08', 'white': '#FFFFFF',
  'primary/700': '#404E81', 'primary/100': '#ECEFF9', 'primary/900': '#1F2747',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

const report = []

/* ── 변수 바인딩 (있으면 2.0 컬렉션 변수, 없으면 hex) ───────────── */
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}

/* ── 폰트 ──────────────────────────────────────────────────────── */
const FONTS = [
  { family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' },
  { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' },
]
for (const f of FONTS) await figma.loadFontAsync(f)
let SERIF = { family: 'Pretendard', style: 'Bold' }   // 코드 --font-serif 대응 폰트 없으면 Pretendard로
try { await figma.loadFontAsync({ family: 'Noto Serif KR', style: 'Bold' }); SERIF = { family: 'Noto Serif KR', style: 'Bold' } }
catch { report.push('세리프 폰트 없음 → 제목류 Pretendard Bold 대체') }

/* ── 컴포넌트 찾기 (2.0 라이브러리) ─────────────────────────────── */
const compCache = new Map()
function comp(name, variantName) {
  const key = name + '|' + (variantName || '')
  if (compCache.has(key)) return compCache.get(key)
  let found = null
  for (const page of figma.root.children) {
    found = page.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === name)
    if (found) break
  }
  if (found && found.type === 'COMPONENT_SET') {
    // 덤프 실명 배리언트 지정 (없으면 기본) — 예: 'Kind=평일', 'State=예정'
    const v = variantName ? found.children.find(c => c.name === variantName) : null
    found = v || found.defaultVariant
    if (variantName && !v) report.push(`배리언트 없음: ${name} / ${variantName} → 기본 배리언트`)
  }
  compCache.set(key, found)
  if (!found) report.push(`컴포넌트 없음: ${name} → 회색 박스 폴백`)
  return found
}

/* ── 빌더 헬퍼 ─────────────────────────────────────────────────── */
function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : o.dir === 'V' ? 'VERTICAL' : 'NONE'
  if (o.gap != null) f.itemSpacing = o.gap
  if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
  f.fills = o.fill ? [paint(o.fill)] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.rTL != null) { f.topLeftRadius = o.rTL; f.bottomLeftRadius = o.rTL }
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW || 1 }
  if (o.align) f.counterAxisAlignItems = o.align       // 'MIN'|'CENTER'|'MAX'
  if (o.mainAlign) f.primaryAxisAlignItems = o.mainAlign // 'MIN'|'CENTER'|'MAX'|'SPACE_BETWEEN'
  if (o.w != null && o.h != null) f.resize(o.w, o.h)
  else if (o.w != null) f.resize(o.w, f.height)
  else if (o.h != null) f.resize(f.width, o.h)   // h만 지정 시에도 반드시 resize — 안 하면 기본 100 유지
  // 사이징: 지정한 축만 FIXED, 안 준 축은 HUG — 안 그러면 기본 100px 높이가 그대로 남는다
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else if (f.layoutMode === 'VERTICAL') {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  f.clipsContent = o.clip ?? false
  return f
}
function T(chars, o = {}) {
  const t = figma.createText()
  t.fontName = o.serif ? SERIF : { family: 'Pretendard', style: o.weight || 'Regular' }
  t.fontSize = o.size || 14
  t.characters = chars
  t.fills = [paint(o.color || 'neutral/900')]
  if (o.ls) t.letterSpacing = { value: o.ls, unit: 'PERCENT' }
  return t
}
function box(w, h, o = {}) {   // 포스터·이미지 플레이스홀더
  const r = figma.createRectangle()
  r.resize(w, h)
  r.fills = [paint(o.fill || 'neutral/300')]
  r.cornerRadius = o.r ?? 2
  return r
}
function inst(name, targetW, targetH, variantName) {
  const c = comp(name, variantName)
  if (!c) return box(targetW, targetH, { fill: 'neutral/300', r: 4 })
  const i = c.createInstance()
  // 원본 크기 그대로 꽂으면 로고(351px) 같은 컴포넌트가 프레임을 덮는다 — 목표 폭 기준 rescale
  if (targetW && Math.abs(i.width - targetW) > 1) i.rescale(targetW / i.width)
  return i
}
// FILL 사이징은 반드시 appendChild 후에
function fill(node) { node.layoutSizingHorizontal = 'FILL' }

/* ── 공통 부품 ─────────────────────────────────────────────────── */
function topBar(width, crumbTitle) {
  const bar = F('DetailTopBar', { dir: 'H', gap: 8, pad: [0, 12, 0, 0], fill: 'neutral/50', align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: width, h: 52 })
  bar.primaryAxisSizingMode = 'FIXED'; bar.counterAxisSizingMode = 'FIXED'
  bar.strokes = [paint('neutral/200')]; bar.strokeWeight = 1
  bar.strokeAlign = 'INSIDE'; bar.strokeTopWeight = 0; bar.strokeLeftWeight = 0; bar.strokeRightWeight = 0; bar.strokeBottomWeight = 1
  const left = F('crumbs', { dir: 'H', gap: 4, pad: [0, 0, 0, 0], align: 'CENTER' })
  bar.appendChild(left)
  const back = F('back', { dir: 'H', pad: [0, 0, 0, 0], align: 'CENTER', mainAlign: 'CENTER', w: 44, h: 44 })
  back.primaryAxisSizingMode = 'FIXED'; back.counterAxisSizingMode = 'FIXED'
  const chev = inst('2.0/icon/chevron-left', 22, 22)
  back.appendChild(chev)
  left.appendChild(back)
  left.appendChild(T('영화', { size: 12, color: 'neutral/500' }))
  left.appendChild(T('>', { size: 12, color: 'neutral/500' }))
  left.appendChild(T(crumbTitle, { size: 12, weight: 'SemiBold', color: 'neutral/900' }))
  const pill = inst('2.0/FilterPill', 0, 0, 'State=Default')
  bar.appendChild(pill)
  return bar
}

function dateBar2(width) {   // 영화 상세: DateBar 2.0 — DateCell 배리언트 실명(덤프) 7칸
  const row = F('DateBar 2.0', { dir: 'H', gap: 0, pad: [8, 12, 8, 12], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: width, h: 79, fill: 'white' })
  const kinds = ['Kind=오늘', 'Kind=평일', 'Kind=토요일', 'Kind=일요일', 'Kind=평일', 'Kind=평일', 'Kind=평일']
  for (const k of kinds) row.appendChild(inst('2.0/DateCell', 0, 0, k))   // 원본 크기 그대로 (54/38 x 63)
  return row
}

function oldDateTabs(width) {   // 극장 상세: 구 날짜탭(56×60 언더라인) — 코드 현행 그대로
  const row = F('date-tabs (legacy)', { dir: 'H', gap: 0, pad: [0, 4, 0, 4], w: width, h: 60 })
  row.primaryAxisSizingMode = 'FIXED'
  row.strokes = [paint('neutral/200')]; row.strokeWeight = 1; row.strokeAlign = 'INSIDE'
  row.strokeTopWeight = 0; row.strokeLeftWeight = 0; row.strokeRightWeight = 0; row.strokeBottomWeight = 1
  const labels = [['오늘', '6', true], ['금', '7', false], ['토', '8', false], ['일', '9', false], ['월', '10', false], ['화', '11', false], ['수', '12', false]]
  for (const [dow, num, sel] of labels) {
    const cell = F('tab', { dir: 'V', gap: 4, pad: [0, 0, 0, 0], align: 'CENTER', mainAlign: 'CENTER', w: 56, h: 60 })
    cell.primaryAxisSizingMode = 'FIXED'; cell.counterAxisSizingMode = 'FIXED'
    if (sel) { cell.strokes = [paint('primary/700')]; cell.strokeWeight = 1; cell.strokeAlign = 'INSIDE'; cell.strokeTopWeight = 0; cell.strokeLeftWeight = 0; cell.strokeRightWeight = 0; cell.strokeBottomWeight = 2 }
    cell.appendChild(T(dow, { size: 10, weight: 'Medium', color: sel ? 'primary/700' : 'neutral/500' }))
    cell.appendChild(T(num, { size: 18, weight: 'Bold', color: sel ? 'primary/700' : 'neutral/900' }))
    row.appendChild(cell)
  }
  return row
}

function showtimeGrid(width, count) {
  const grid = F('showtime-grid', { dir: 'H', gap: 12, pad: [12, 16, 16, 16], w: width })
  grid.primaryAxisSizingMode = 'FIXED'
  grid.layoutWrap = 'WRAP'
  grid.counterAxisSpacing = 12
  for (let i = 0; i < count; i++) grid.appendChild(inst('2.0/ShowtimeCell', 0, 0, 'State=예정'))
  return grid
}

function theaterCard(width) {   // 영화 상세: 극장 카드 (r16 border)
  const card = F('theater-card', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], fill: 'white', r: 16, stroke: 'neutral/200', w: width, clip: true })
  card.primaryAxisSizingMode = 'AUTO'
  const head = F('head', { dir: 'H', gap: 12, pad: [16, 16, 12, 16], align: 'MIN', mainAlign: 'SPACE_BETWEEN', w: width })
  head.primaryAxisSizingMode = 'FIXED'
  head.strokes = [paint('neutral/200')]; head.strokeWeight = 1; head.strokeAlign = 'INSIDE'
  head.strokeTopWeight = 0; head.strokeLeftWeight = 0; head.strokeRightWeight = 0; head.strokeBottomWeight = 1
  const info = F('info', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  info.appendChild(T('더숲 아트시네마', { size: 14, weight: 'Bold', serif: true, color: 'neutral/900' }))
  info.appendChild(T('📍 서울 노원구 노해로 480', { size: 12, color: 'neutral/600' }))
  head.appendChild(info)
  head.appendChild(inst('2.0/icon/chevron-right', 16, 16))
  card.appendChild(head)
  card.appendChild(showtimeGrid(width, 3))
  return card
}

function sectionTitleRow(width, title) {
  const row = F('sec-head', { dir: 'H', gap: 8, pad: [16, 0, 0, 0], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: width })
  row.primaryAxisSizingMode = 'FIXED'
  row.appendChild(T(title, { size: 20, weight: 'Bold', color: 'neutral/900' }))
  const cta = F('map-cta', { dir: 'H', gap: 4, pad: [0, 12, 0, 12], fill: 'primary/700', r: 9999, align: 'CENTER', h: 30 })
  cta.counterAxisSizingMode = 'FIXED'
  cta.appendChild(T('지도에서 필터로 보기', { size: 12, weight: 'SemiBold', color: 'white' }))
  row.appendChild(cta)
  return row
}

function labelCaps(text) { return T(text, { size: 13, weight: 'Medium', color: 'neutral/500', ls: 4 }) }

/* ── PC 프레임 셸: 레일 64 + 패널(r16 좌측) + 상단바 풀폭 + 본문 1000 ── */
function pcShell(name, crumbTitle) {
  const root = F(name, { dir: 'H', gap: 0, pad: [0, 0, 0, 0], fill: 'neutral/100', w: 1440, h: 1600 })
  root.primaryAxisSizingMode = 'FIXED'; root.counterAxisSizingMode = 'FIXED'
  const rail = F('rail', { dir: 'V', gap: 20, pad: [16, 12, 16, 12], fill: 'neutral/100', align: 'CENTER', w: 64, h: 1600 })
  rail.primaryAxisSizingMode = 'FIXED'; rail.counterAxisSizingMode = 'FIXED'
  rail.appendChild(inst('2.0/logo/tile', 40, 40, 'Color=인디고'))
  root.appendChild(rail)
  const panel = F('panel', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], fill: 'neutral/50', rTL: 16, w: 1376, h: 1600, clip: true })
  panel.primaryAxisSizingMode = 'FIXED'; panel.counterAxisSizingMode = 'FIXED'
  root.appendChild(panel)
  panel.appendChild(topBar(1376, crumbTitle))
  const col = F('content-1000', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], w: 1000 })
  panel.appendChild(col)
  col.layoutSizingVertical = 'FILL'
  panel.counterAxisAlignItems = 'CENTER'   // 본문 컬럼 중앙
  return { root, col }
}
function mobileShell(name, crumbTitle) {
  const root = F(name, { dir: 'V', gap: 0, pad: [0, 0, 0, 0], fill: 'neutral/50', w: 402, h: 1400 })
  root.primaryAxisSizingMode = 'FIXED'; root.counterAxisSizingMode = 'FIXED'
  root.appendChild(topBar(402, crumbTitle))
  const col = F('content', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], w: 402 })
  root.appendChild(col)
  col.layoutSizingVertical = 'FILL'   // 탭바를 프레임 바닥으로 밀착
  return { root, col, addTabbar: () => {
    const tb = F('tabbar', { dir: 'H', gap: 0, pad: [6, 60, 6, 60], fill: 'white', align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: 402, h: 64 })
    tb.primaryAxisSizingMode = 'FIXED'; tb.counterAxisSizingMode = 'FIXED'
    for (const [icon, label, active] of [['2.0/icon/map', '지도', false], ['2.0/icon/clapperboard', '상영작', true], ['2.0/icon/settings', '설정', false]]) {
      const tab = F('tab', { dir: 'V', gap: 4, pad: [6, 14, 6, 14], align: 'CENTER', r: 8, fill: active ? 'primary/100' : undefined })
      tab.appendChild(inst(icon, 23, 23))
      tab.appendChild(T(label, { size: 10, weight: 'Medium', color: active ? 'primary/700' : 'neutral/600' }))
      tb.appendChild(tab)
    }
    root.appendChild(tb)
    return tb
  } }
}

/* ── 1) 영화 상세 ─────────────────────────────────────────────── */
function movieHero(width, desktop) {
  const hero = F('hero', { dir: 'H', gap: desktop ? 32 : 16, pad: desktop ? [32, 0, 28, 0] : [24, 16, 20, 16], w: width })
  hero.primaryAxisSizingMode = 'FIXED'
  hero.appendChild(box(desktop ? 200 : 100, desktop ? 300 : 150))
  const tx = F('texts', { dir: 'V', gap: 12, pad: [4, 0, 0, 0] })
  tx.appendChild(T('도그빌', { size: desktop ? 34 : 22, serif: true, color: 'neutral/900' }))
  tx.appendChild(T('Dogville', { size: desktop ? 14 : 12, color: 'neutral/500' }))
  const pills = F('genres', { dir: 'H', gap: 8, pad: [0, 0, 0, 0] })
  for (const g of ['드라마', '미스터리', '스릴러']) {
    const p = F('pill', { dir: 'H', pad: [0, 12, 0, 12], fill: 'primary/100', r: 9999, align: 'CENTER', h: 24 })
    p.counterAxisSizingMode = 'FIXED'
    p.strokes = [paint('primary/700')]; p.strokeWeight = 1; p.opacity = 1
    p.appendChild(T(g, { size: 12, weight: 'Medium', color: 'primary/700' }))
    pills.appendChild(p)
  }
  tx.appendChild(pills)
  tx.appendChild(T('🇩🇰덴마크, 🇸🇪스웨덴, 🇫🇷프랑스 · 2003 · 177분', { size: 13, color: 'neutral/600' }))
  const chip = F('director-chip', { dir: 'H', gap: 8, pad: [8, 12, 8, 8], fill: 'white', r: 9999, stroke: 'neutral/200', align: 'CENTER' })
  const av = figma.createEllipse(); av.resize(28, 28); av.fills = [paint('neutral/100')]
  chip.appendChild(av)
  chip.appendChild(T('라스 폰 트리에', { size: 13, weight: 'SemiBold', color: 'neutral/900' }))
  chip.appendChild(T('감독 →', { size: 10, weight: 'Medium', color: 'primary/700' }))
  tx.appendChild(chip)
  hero.appendChild(tx)
  return hero
}
function synopsis(width, pad) {
  const s = F('synopsis', { dir: 'V', gap: 8, pad, w: width })
  s.primaryAxisSizingMode = 'FIXED'
  s.appendChild(labelCaps('시놉시스'))
  const body = T('록키 산맥에 자리한 작은 마을 도그빌. 이 평온한 곳에 어느 날 밤 총소리가 들린다. 그리고 한 미모의 여자가 마을로 숨어 들어온다…', { size: 14, color: 'neutral/700' })
  s.appendChild(body)
  body.layoutSizingHorizontal = 'FILL'
  body.lineHeight = { value: 180, unit: 'PERCENT' }
  return s
}
function detailInfoTable(width) {
  const wrap = F('detail-info', { dir: 'V', gap: 8, pad: [0, 0, 0, 0], w: width })
  wrap.primaryAxisSizingMode = 'FIXED'
  wrap.appendChild(labelCaps('상세 정보'))
  const table = F('table', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], fill: 'white', r: 12, stroke: 'neutral/200', w: width, clip: true })
  table.primaryAxisSizingMode = 'AUTO'
  const rows = [['국가', '🇩🇰덴마크, 🇸🇪스웨덴, 🇫🇷프랑스'], ['개봉', '2003'], ['상영 시간', '177분'], ['장르', '드라마, 미스터리, 스릴러']]
  rows.forEach(([k, v], i) => {
    const r = F('row', { dir: 'H', gap: 0, pad: [12, 16, 12, 16], align: 'CENTER', w: width })
    r.primaryAxisSizingMode = 'FIXED'
    if (i < rows.length - 1) { r.strokes = [paint('neutral/200')]; r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeTopWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 1 }
    const key = T(k, { size: 12, weight: 'Medium', color: 'neutral/600' }); key.resize(72, key.height)
    r.appendChild(key)
    r.appendChild(T(v, { size: 13, weight: 'SemiBold', color: 'neutral/900' }))
    table.appendChild(r)
  })
  wrap.appendChild(table)
  return wrap
}
function buildMovieDetail() {
  // PC
  const pc = pcShell('MovieDetail · PC', '도그빌')
  pc.col.appendChild(movieHero(1000, true))
  const grid = F('two-col', { dir: 'H', gap: 32, pad: [0, 0, 64, 0], align: 'MIN', w: 1000 })
  grid.primaryAxisSizingMode = 'FIXED'
  const main = F('main', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], w: 648 })
  main.appendChild(synopsis(648, [0, 0, 20, 0]))
  main.appendChild(sectionTitleRow(648, '상영 영화관 및 일정'))
  main.appendChild(dateBar2(648))
  const cardWrapPc = F('cards', { dir: 'V', gap: 12, pad: [16, 0, 0, 0], w: 648 })
  cardWrapPc.primaryAxisSizingMode = 'FIXED'
  cardWrapPc.appendChild(theaterCard(648))
  main.appendChild(cardWrapPc)
  grid.appendChild(main)
  const side = F('sidebar', { dir: 'V', gap: 20, pad: [8, 0, 0, 0], w: 320 })
  const dwrap = F('director', { dir: 'V', gap: 8, pad: [0, 0, 0, 0], w: 320 })
  dwrap.primaryAxisSizingMode = 'FIXED'
  dwrap.appendChild(labelCaps('감독'))
  const dcard = F('card', { dir: 'H', gap: 12, pad: [12, 16, 12, 16], fill: 'white', r: 12, stroke: 'neutral/200', align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: 320 })
  dcard.primaryAxisSizingMode = 'FIXED'
  const dl = F('l', { dir: 'H', gap: 12, pad: [0, 0, 0, 0], align: 'CENTER' })
  const dav = figma.createEllipse(); dav.resize(48, 48); dav.fills = [paint('neutral/100')]
  dl.appendChild(dav)
  const dt = F('t', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  dt.appendChild(T('라스 폰 트리에', { size: 15, weight: 'Bold', color: 'neutral/900' }))
  dt.appendChild(T('감독 페이지 보기 →', { size: 11, weight: 'Medium', color: 'primary/700' }))
  dl.appendChild(dt)
  dcard.appendChild(dl)
  dcard.appendChild(inst('2.0/icon/chevron-right', 16, 16))
  dwrap.appendChild(dcard)
  side.appendChild(dwrap)
  side.appendChild(detailInfoTable(320))
  grid.appendChild(side)
  pc.col.appendChild(grid)

  // Mobile
  const mo = mobileShell('MovieDetail · Mobile', '도그빌')
  mo.col.appendChild(movieHero(402, false))
  mo.col.appendChild(synopsis(402, [0, 16, 16, 16]))
  const secM = F('sec', { dir: 'V', gap: 0, pad: [8, 16, 0, 16], w: 402 })
  secM.primaryAxisSizingMode = 'FIXED'
  secM.appendChild(sectionTitleRow(370, '상영 영화관 및 일정'))
  secM.appendChild(dateBar2(370))
  const cardWrapM = F('cards', { dir: 'V', gap: 12, pad: [12, 0, 24, 0], w: 370 })
  cardWrapM.primaryAxisSizingMode = 'FIXED'
  cardWrapM.appendChild(theaterCard(370))
  secM.appendChild(cardWrapM)
  mo.col.appendChild(secM)
  mo.addTabbar()
  return [pc.root, mo.root]
}

/* ── 2) 극장 상세 ─────────────────────────────────────────────── */
function theaterHero(width, desktop) {
  const hero = F('hero', { dir: 'V', gap: 12, pad: desktop ? [28, 28, 24, 28] : [20, 16, 20, 16], w: width })
  hero.primaryAxisSizingMode = 'FIXED'
  hero.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { ...rgb(HEX['primary/100']), a: 1 } },
      { position: 1, color: { ...rgb(HEX['neutral/50']), a: 1 } },
    ],
  }]
  const badge = F('badge', { dir: 'H', pad: [4, 12, 4, 12], fill: 'primary/100', r: 9999, stroke: 'primary/700', align: 'CENTER' })
  badge.appendChild(T('독립·예술영화관', { size: 10, weight: 'SemiBold', color: 'primary/700' }))
  hero.appendChild(badge)
  hero.appendChild(T('더숲 아트시네마', { size: desktop ? 32 : 24, serif: true, color: 'neutral/900' }))
  hero.appendChild(T('📍 서울 노원구 노해로 480   복사', { size: 13, color: 'neutral/600' }))
  const ctas = F('ctas', { dir: 'H', gap: 8, pad: [8, 0, 0, 0] })
  const mk = (label, primary) => {
    const b = F('btn', { dir: 'H', gap: 8, pad: [0, 16, 0, 16], r: 12, align: 'CENTER', h: 40, fill: primary ? 'primary/700' : 'white', stroke: primary ? undefined : 'neutral/200' })
    b.counterAxisSizingMode = 'FIXED'
    b.appendChild(T(label, { size: 13, weight: 'SemiBold', color: primary ? 'white' : 'neutral/700' }))
    return b
  }
  ctas.appendChild(mk('지도에서 보기', true))
  ctas.appendChild(mk('길찾기', false))
  ctas.appendChild(mk('공유', false))
  hero.appendChild(ctas)
  return hero
}
function buildTheaterDetail() {
  const pc = pcShell('TheaterDetail · PC', '더숲 아트시네마')
  pc.col.appendChild(theaterHero(1000, true))
  pc.col.appendChild(oldDateTabs(1000))
  const listPc = F('movies', { dir: 'V', gap: 12, pad: [16, 0, 64, 0], w: 1000 })
  listPc.primaryAxisSizingMode = 'FIXED'
  listPc.appendChild(theaterMovieCard(1000))
  pc.col.appendChild(listPc)

  const mo = mobileShell('TheaterDetail · Mobile', '더숲 아트시네마')
  mo.col.appendChild(theaterHero(402, false))
  mo.col.appendChild(oldDateTabs(402))
  const listM = F('movies', { dir: 'V', gap: 12, pad: [12, 16, 24, 16], w: 402 })
  listM.primaryAxisSizingMode = 'FIXED'
  listM.appendChild(theaterMovieCard(370))
  mo.col.appendChild(listM)
  mo.addTabbar()
  return [pc.root, mo.root]
}
function theaterMovieCard(width) {   // 극장 상세: 영화별 카드 (포스터 68 + 제목 + 셀)
  const card = F('movie-card', { dir: 'V', gap: 0, pad: [0, 0, 0, 0], fill: 'white', r: 16, stroke: 'neutral/200', w: width, clip: true })
  card.primaryAxisSizingMode = 'AUTO'
  const head = F('head', { dir: 'H', gap: 12, pad: [16, 16, 12, 16], align: 'CENTER', w: width })
  head.primaryAxisSizingMode = 'FIXED'
  head.appendChild(box(68, 102))
  const info = F('info', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  info.appendChild(T('도그빌', { size: 15, weight: 'Bold', serif: true, color: 'neutral/900' }))
  info.appendChild(T('라스 폰 트리에 · 2003 · 177분', { size: 12, color: 'neutral/500' }))
  head.appendChild(info)
  card.appendChild(head)
  card.appendChild(showtimeGrid(width, 3))
  return card
}

/* ── 3) 감독 상세 ─────────────────────────────────────────────── */
function directorHero(width) {
  const hero = F('hero', { dir: 'V', gap: 8, pad: [32, 16, 24, 16], align: 'CENTER', w: width })
  hero.primaryAxisSizingMode = 'FIXED'
  const av = figma.createEllipse(); av.resize(112, 112); av.fills = [paint('neutral/100')]
  av.strokes = [paint('neutral/200')]; av.strokeWeight = 1
  hero.appendChild(av)
  hero.appendChild(T('라스 폰 트리에', { size: 24, serif: true, color: 'neutral/900' }))
  hero.appendChild(T('Lars von Trier', { size: 14, color: 'neutral/600' }))
  hero.appendChild(T('상영중 6편', { size: 13, weight: 'SemiBold', color: 'primary/700' }))
  const ctas = F('ctas', { dir: 'H', gap: 8, pad: [12, 0, 0, 0] })
  const map = F('btn', { dir: 'H', gap: 8, pad: [0, 16, 0, 16], fill: 'primary/700', r: 12, align: 'CENTER', h: 40 })
  map.counterAxisSizingMode = 'FIXED'
  map.appendChild(T('지도에서 필터로 보기', { size: 13, weight: 'SemiBold', color: 'white' }))
  ctas.appendChild(map)
  const share = F('share', { dir: 'H', pad: [0, 0, 0, 0], fill: 'white', r: 12, stroke: 'neutral/200', align: 'CENTER', mainAlign: 'CENTER', w: 40, h: 40 })
  share.primaryAxisSizingMode = 'FIXED'; share.counterAxisSizingMode = 'FIXED'
  share.appendChild(inst('2.0/icon/share-2', 16, 16))
  ctas.appendChild(share)
  hero.appendChild(ctas)
  return hero
}
function buildDirectorDetail() {
  const mk = (shell, width) => {
    shell.col.appendChild(directorHero(width))
    const bio = F('bio', { dir: 'V', gap: 8, pad: [20, 16, 20, 16], w: width })
    bio.primaryAxisSizingMode = 'FIXED'
    bio.strokes = [paint('neutral/200')]; bio.strokeWeight = 1; bio.strokeAlign = 'INSIDE'
    bio.strokeLeftWeight = 0; bio.strokeRightWeight = 0
    bio.appendChild(labelCaps('소개'))
    const t = T('덴마크의 영화감독. 도그마 95 선언을 주도했으며…', { size: 13, color: 'neutral/700' })
    bio.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.lineHeight = { value: 180, unit: 'PERCENT' }
    shell.col.appendChild(bio)
    const now = F('now-playing', { dir: 'V', gap: 16, pad: [20, 16, 0, 16], w: width })
    now.primaryAxisSizingMode = 'FIXED'
    now.appendChild(T('지금 상영중', { size: 20, weight: 'Bold', color: 'neutral/900' }))
    const row = F('posters', { dir: 'H', gap: 16, pad: [0, 0, 4, 0] })
    for (let i = 0; i < 3; i++) row.appendChild(inst('2.0/PosterItem', 128, 240, 'Selected=False'))
    now.appendChild(row)
    shell.col.appendChild(now)
    const filmo = F('filmography', { dir: 'V', gap: 12, pad: [20, 16, 52, 16], w: width })
    filmo.primaryAxisSizingMode = 'FIXED'
    const fh = F('head', { dir: 'H', gap: 8, pad: [0, 0, 12, 0], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: width - 32 })
    fh.primaryAxisSizingMode = 'FIXED'
    fh.appendChild(T('전체 필모그래피', { size: 20, weight: 'Bold', color: 'neutral/900' }))
    const sorts = F('sorts', { dir: 'H', gap: 8, pad: [0, 0, 0, 0] })
    for (const [label, on] of [['상영중', true], ['연도순', false]]) {
      const p = F('pill', { dir: 'H', pad: [0, 12, 0, 12], r: 9999, align: 'CENTER', h: 26, fill: on ? 'primary/100' : undefined, stroke: on ? 'primary/700' : 'neutral/200' })
      p.counterAxisSizingMode = 'FIXED'
      p.appendChild(T(label, { size: 12, weight: on ? 'SemiBold' : 'Regular', color: on ? 'primary/700' : 'neutral/500' }))
      sorts.appendChild(p)
    }
    fh.appendChild(sorts)
    filmo.appendChild(fh)
    const grid = F('grid', { dir: 'H', gap: 16, pad: [0, 0, 0, 0], w: width - 32 })
    grid.primaryAxisSizingMode = 'FIXED'; grid.layoutWrap = 'WRAP'; grid.counterAxisSpacing = 24
    for (let i = 0; i < (width > 500 ? 6 : 3); i++) grid.appendChild(inst('2.0/PosterItem', 128, 240, 'Selected=False'))
    filmo.appendChild(grid)
    shell.col.appendChild(filmo)
  }
  const pc = pcShell('DirectorDetail · PC', '감독 · 라스 폰 트리에')
  mk(pc, 1000)
  const mo = mobileShell('DirectorDetail · Mobile', '감독 · 라스 폰 트리에')
  mk(mo, 402)
  mo.addTabbar()
  return [pc.root, mo.root]
}

/* ── 조립 ──────────────────────────────────────────────────────── */
// 재실행 대비: 같은 이름 섹션 있으면 제거
for (const page of figma.root.children) {
  const prev = page.children.find(n => n.type === 'SECTION' && n.name === 'Detail Screens TOBE (code sync 2026-08-06)')
  if (prev) { prev.remove(); report.push('기존 섹션 삭제 후 재생성') }
}
const section = figma.createSection()
section.name = 'Detail Screens TOBE (code sync 2026-08-06)'
figma.currentPage.appendChild(section)

const frames = [...buildMovieDetail(), ...buildTheaterDetail(), ...buildDirectorDetail()]
let x = 60
for (const f of frames) {
  section.appendChild(f)
  f.x = x; f.y = 80
  x += f.width + 80
}
section.resizeWithoutConstraints(x + 60, 1800)
section.x = figma.viewport.center.x
section.y = figma.viewport.center.y

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  'detail-screens 코드 싱크 (feature/detail-shell · 2026-08-06)',
  '셸: 레일 64(neutral/100 언더레이) · 패널 neutral/50 좌측 r16 · 상단바 h52 풀폭 · 본문 1000 중앙',
  '영화 상세: DateBar/ShowtimeCell 2.0 이식됨. 극장 상세 날짜탭·감독 상세는 아직 구 문법(코드 그대로).',
  ...(report.length ? ['', '경고:', ...report] : []),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 16

figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`detail-screens: 프레임 ${frames.length}장 생성${report.length ? ` · 경고 ${report.length}` : ''}`)
