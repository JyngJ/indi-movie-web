// 서비스 IA 다이어그램 (2026-08-10) — 코드에서 뽑은 실제 구조
//  소스: src/app 라우트 트리 · GlobalNav 탭 정의 · MapView/FilmsClient 오버레이
//  "etc" 페이지에 그린다. 다시 돌리면 섹션을 교체.
//
//  표기 규칙
//   · 실선 카드 = 라우트(주소가 있다)      · 점선 카드 = 오버레이(주소 없이 위에 뜬다)
//   · 굵은 세로선 = 탭 계층                · 가는 가로선 = 진입 경로
//   · 회색 카드 = 사용자에게 노출되지 않는 경로(관리자·개발용)
// Scripter에서 Run.

const report = []
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

const colorVar = new Map(), floatVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (!v) continue
    if (v.resolvedType === 'COLOR') colorVar.set(v.name, v)
    else if (v.resolvedType === 'FLOAT') floatVar.set(v.name, v)
  }
}
const HEX = {
  'primary/700': '#404E81', 'primary/100': '#ECEFF9', 'primary/300': '#A6B1D9',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/900': '#0C0A08',
  'gv/900': '#3E1782', 'success/700': '#4A7C59', 'white': '#FFFFFF',
}
function paint(name, opacity) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] ?? '#FF00FF') }
  if (opacity != null) solid.opacity = opacity
  const v = colorVar.get(name)
  if (!v) { report.push('색 변수 없음: ' + name); return solid }
  return figma.variables.setBoundVariableForPaint(solid, 'color', v)
}
const SPACING = { 4: 'spacing/1', 8: 'spacing/2', 12: 'spacing/3', 16: 'spacing/4', 24: 'spacing/6', 32: 'spacing/8', 48: 'spacing/12', 64: 'spacing/16' }
const RADIUS = { 4: 'radius/badge', 8: 'radius/button', 12: 'radius/control', 16: 'radius/popover', 9999: 'radius/pill' }
function autoBind(node) {
  for (const f of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing']) {
    const v = floatVar.get(SPACING[node[f]])
    if (v) { try { node.setBoundVariable(f, v) } catch { /* 무시 */ } }
  }
  const r = node.cornerRadius
  const rv = typeof r === 'number' ? floatVar.get(RADIUS[r]) : null
  if (rv) for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
    try { node.setBoundVariable(f, rv) } catch { /* 무시 */ }
  }
}

const P = (style) => ({ family: 'Pretendard', style })
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
async function ST(chars, styleName, colorName, fallback) {
  const t = figma.createText()
  const st = tStyle(styleName)
  if (st) await t.setTextStyleIdAsync(st.id)
  else { t.fontName = fallback?.font ?? P('Regular'); t.fontSize = fallback?.size ?? 12 }
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
  if (o.w != null) { f.resize(o.w, o.h ?? f.height) }
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else if (f.layoutMode === 'VERTICAL') {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  if (o.stroke) {
    f.strokes = [paint(o.stroke)]
    f.strokeWeight = o.strokeW ?? 1.5
    f.strokeAlign = 'INSIDE'
    if (o.dash) f.dashPattern = o.dash
  }
  f.clipsContent = false
  autoBind(f)
  return f
}

/* ── 카드 ─────────────────────────────────────────────────────
   kind: route(실선) · overlay(점선) · hidden(회색) */
const CARD_W = 220
async function node({ title, path, note, kind = 'route', accent = 'primary/700', w = CARD_W }) {
  const dashed = kind === 'overlay'
  const muted = kind === 'hidden'
  const c = F(title, {
    dir: 'V', gap: 4, pad: [12, 16, 12, 16], r: 12, w,
    fill: muted ? 'neutral/200' : 'white',
    stroke: muted ? 'neutral/300' : dashed ? accent : 'neutral/300',
    strokeW: 1.5,
    dash: dashed ? [4, 3] : undefined,
  })
  const head = F('head', { dir: 'H', gap: 8, align: 'CENTER' })
  c.appendChild(head)
  head.layoutSizingHorizontal = 'FILL'
  if (!muted) {
    const dot = figma.createEllipse()
    dot.resize(8, 8)
    dot.fills = [paint(accent)]
    head.appendChild(dot)
  }
  const t = await ST(title, '2.0/body-strong', muted ? 'neutral/600' : 'neutral/900', { font: P('Bold'), size: 14 })
  head.appendChild(t)
  t.textAutoResize = 'HEIGHT'
  t.layoutGrow = 1
  if (path) {
    const pt = await ST(path, '2.0/label', muted ? 'neutral/500' : 'primary/700', { font: P('Medium'), size: 10 })
    c.appendChild(pt)
    pt.textAutoResize = 'HEIGHT'
    pt.layoutSizingHorizontal = 'FILL'
  }
  if (note) {
    const nt = await ST(note, '2.0/note', 'neutral/600', { font: P('Regular'), size: 12 })
    c.appendChild(nt)
    nt.textAutoResize = 'HEIGHT'
    nt.layoutSizingHorizontal = 'FILL'
  }
  return c
}

/** 한 탭 컬럼 = 탭 헤더 + 하위 노드들 */
async function column(header, items) {
  const col = F(`col/${header.title}`, { dir: 'V', gap: 16 })
  col.appendChild(await node({ ...header, w: CARD_W }))
  const kids = F('kids', { dir: 'V', gap: 12, pad: [0, 0, 0, 24] })
  col.appendChild(kids)
  for (const it of items) kids.appendChild(await node(it))
  return col
}

/* ── 페이지 ───────────────────────────────────────────────── */
const PAGE_NAME = 'etc'
let page = figma.root.children.find(p => p.name === PAGE_NAME)
if (!page) { page = figma.createPage(); page.name = PAGE_NAME }
await page.loadAsync()
page.backgrounds = [{ type: 'SOLID', color: rgb('#FAF9F8') }]
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('IA'))
const section = figma.createSection()
section.name = 'IA — 서비스 정보 구조 (2026-08-10)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else { section.x = 0; section.y = 0 }

const root = F('IA', { dir: 'V', gap: 48, pad: 64, fill: 'neutral/100' })
section.appendChild(root)
root.x = section.x; root.y = section.y

/* 머리말 */
{
  const head = F('head', { dir: 'V', gap: 8 })
  root.appendChild(head)
  head.appendChild(await ST('영화볼지도 — 정보 구조', '2.0/display/h2', 'neutral/900', { font: KIMM, size: 20 }))
  head.appendChild(await ST([
    '실선 카드 = 주소가 있는 라우트 · 점선 카드 = 주소 없이 위에 뜨는 오버레이 · 회색 = 사용자 비노출',
    '탭 3개가 최상위다. 상세 화면은 어느 탭에서 들어왔는지에 따라 주소가 갈린다 —',
    '지도에서 들어가면 /movie/[id], 상영작에서 들어가면 /films/movie/[id]. 뒤로가기 흐름을 탭별로 유지하기 위해서다.',
  ].join('\n'), '2.0/note', 'neutral/600', { font: P('Regular'), size: 12 }))
}

/* 본체 — 탭 3열 */
const body = F('tabs', { dir: 'H', gap: 48, align: 'MIN' })
root.appendChild(body)

body.appendChild(await column(
  { title: '지도', path: '/', note: '기본 진입. 지도 위에서 극장·상영작을 찾는다' },
  [
    { title: '검색', path: '/search', note: '영화 · 감독 · 극장 · 지하철역' },
    { title: '필터 바', kind: 'overlay', note: '지역 · 상영 일정 · 장르 · 국가 · 예매 가능' },
    { title: '극장 시트', kind: 'overlay', note: '접힘(포스터 스트립) → 펼침(날짜 바 · 시간표)' },
    { title: 'GV 상세', kind: 'overlay', accent: 'gv/900', note: '지도 핀에서 진입' },
    { title: '큐레이션 시트', kind: 'overlay', note: '지도 하단 — 오늘의 추천' },
    { title: '데스크톱 도크', kind: 'overlay', note: '영화 · 감독 패널 (PC 전용)' },
    { title: '온보딩 · 위치 권한', kind: 'overlay', note: '첫 진입 시' },
  ],
))

body.appendChild(await column(
  { title: '상영작', path: '/films', note: '큐레이션으로 훑어보는 탭' },
  [
    { title: '막바지 상영', kind: 'overlay', note: '곧 내리는 영화' },
    { title: '이번 주 새 영화', kind: 'overlay' },
    { title: '이번 주말 상영', kind: 'overlay' },
    { title: '주목할 영화제', kind: 'overlay', note: '→ /festival/[slug]' },
    { title: '전체 그리드', kind: 'overlay', note: '무한 스크롤' },
    { title: '지역 랜딩', path: '/films/area/[region]', note: 'SEO 진입 전용' },
  ],
))

body.appendChild(await column(
  { title: '설정', path: '/more', note: '' },
  [
    { title: '버그 리포트', kind: 'overlay' },
    { title: '출처 표기', kind: 'overlay' },
    { title: '만든 사람', kind: 'overlay' },
    { title: '개인정보 처리방침', path: '/privacy' },
  ],
))

/* 상세 계층 — 탭에 따라 주소가 갈린다 */
{
  const detail = F('detail', { dir: 'V', gap: 16 })
  root.appendChild(detail)
  detail.appendChild(await ST('상세 화면 — 진입 탭에 따라 주소가 갈린다', '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 }))
  const row = F('row', { dir: 'H', gap: 16 })
  detail.appendChild(row)
  for (const it of [
    { title: '영화 상세', path: '/movie/[id]  ·  /films/movie/[id]' },
    { title: '극장 상세', path: '/theater/[id]  ·  /films/theater/[id]' },
    { title: '감독 상세', path: '/director/[name]  ·  /films/director/[name]' },
    { title: '영화제 상세', path: '/festival/[slug]' },
  ]) row.appendChild(await node(it))
}

/* 전역 오버레이 */
{
  const g = F('global', { dir: 'V', gap: 16 })
  root.appendChild(g)
  g.appendChild(await ST('전역 오버레이 — 탭과 무관하게 뜬다', '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 }))
  const row = F('row', { dir: 'H', gap: 16 })
  g.appendChild(row)
  for (const it of [
    { title: '재방문 설문', kind: 'overlay', note: '조건 충족 시 1회' },
    { title: '지역 힌트 말풍선', kind: 'overlay', note: '지역 미설정일 때' },
    { title: '토스트 · 로딩 바', kind: 'overlay' },
  ]) row.appendChild(await node(it))
}

/* 비노출 */
{
  const h = F('hidden', { dir: 'V', gap: 16 })
  root.appendChild(h)
  h.appendChild(await ST('사용자 비노출', '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 }))
  const row = F('row', { dir: 'H', gap: 16 })
  h.appendChild(row)
  for (const it of [
    { title: '관리자', path: '/admin  ·  /admin/login', kind: 'hidden', note: '크롤링 검수 · 매칭 승인' },
    { title: '컴포넌트 갤러리', path: '/dev/components', kind: 'hidden' },
  ]) row.appendChild(await node(it))
}

section.resizeWithoutConstraints(root.width, root.height)
await figma.setCurrentPageAsync(page)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`IA 생성${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log([...new Set(report)].join('\n'))
