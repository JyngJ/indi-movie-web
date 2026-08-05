// TheaterSheet ASIS — 모바일 expanded(밀어올린 상태) 추가 (Scripter용)
// 기존 'TheaterSheet ASIS (grayscale)' 섹션에 세 번째 프레임으로 추가

const P = s => ({ family: 'Pretendard', style: s })
const KIMM = { family: 'KIMM_Bold', style: 'B' }
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync(KIMM)

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const G = {
  900: '#0C0A08', 800: '#2B2622', 700: '#58524B', 600: '#726B65', 500: '#8D8781',
  400: '#A7A19A', 300: '#C6BFB9', 200: '#EAE5E1', 100: '#FAF9F8', white: '#FFFFFF',
}
const fill = h => [{ type: 'SOLID', color: hex(h) }]

const section = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet ASIS (grayscale)')
if (!section) throw new Error('ASIS 섹션 없음 — theater-sheet-asis.js 먼저 실행')
const old = section.findOne(n => n.name === 'ASIS · Mobile expanded')
if (old) old.remove()

const txt = (chars, font, size, color, lh) => {
  const t = figma.createText()
  t.fontName = font; t.characters = chars; t.fontSize = size
  if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }
  t.fills = fill(color)
  return t
}
const stack = (dir, gap, opts = {}) => {
  const f = figma.createFrame()
  f.layoutMode = dir
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'
  f.itemSpacing = gap
  f.fills = []
  if (opts.pad) { f.paddingLeft = f.paddingRight = f.paddingTop = f.paddingBottom = opts.pad }
  if (opts.center) f.counterAxisAlignItems = 'CENTER'
  if (opts.name) f.name = opts.name
  return f
}
const iconPh = (size, color) => {
  const r = figma.createRectangle()
  r.resize(size, size); r.cornerRadius = 3
  r.fills = fill(color || G[400])
  return r
}
const iconBtn = () => {
  const b = stack('VERTICAL', 0, { name: 'icon-btn' })
  b.counterAxisSizingMode = 'FIXED'; b.resize(36, 36)
  b.cornerRadius = 18
  b.fills = [{ type: 'SOLID', color: hex(G[900]), opacity: 0.06 }]
  b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER'
  b.appendChild(iconPh(14, G[700]))
  return b
}
const poster = (w, h, r) => {
  const rect = figma.createRectangle()
  rect.resize(w, h); rect.cornerRadius = r
  rect.fills = fill(G[300])
  return rect
}

// ═══ 모바일 expanded (390×전체높이 시트) ═══
const exp = figma.createFrame()
exp.name = 'ASIS · Mobile expanded'
exp.layoutMode = 'VERTICAL'
exp.primaryAxisSizingMode = 'AUTO'
exp.counterAxisSizingMode = 'FIXED'
exp.resize(390, 100)
exp.itemSpacing = 0
exp.fills = fill(G.white)              // 배포: expanded는 card bg
exp.topLeftRadius = exp.topRightRadius = 20
section.appendChild(exp)
exp.x = 60; exp.y = 760

// 핸들 + nav row (expanded는 nav만 고정, 스크롤 시 중앙에 극장명 15/600 페이드인)
{
  const wrap = stack('VERTICAL', 0, { name: 'handle' })
  wrap.counterAxisSizingMode = 'FIXED'; wrap.resize(390, 16)
  wrap.primaryAxisAlignItems = 'CENTER'; wrap.counterAxisAlignItems = 'CENTER'
  const h = figma.createRectangle()
  h.resize(36, 4); h.cornerRadius = 2; h.fills = fill(G[300])
  wrap.appendChild(h)
  exp.appendChild(wrap)
  wrap.layoutSizingHorizontal = 'FILL'

  const nav = stack('HORIZONTAL', 8, { name: 'nav-row', center: true })
  nav.paddingLeft = nav.paddingRight = 12; nav.paddingBottom = 8
  nav.primaryAxisAlignItems = 'SPACE_BETWEEN'
  nav.appendChild(iconBtn())
  const centerName = txt('씨네큐브 광화문', P('SemiBold'), 15, G[900], 140)
  centerName.opacity = 0.4 // 스크롤 시 페이드인 — 중간 상태 표현
  nav.appendChild(centerName)
  nav.appendChild(iconBtn())
  exp.appendChild(nav)
  nav.layoutSizingHorizontal = 'FILL'
}
// 스크롤 영역: 극장 정보 블록 (collapsed 헤더와 동일 내용이 스크롤 안으로)
{
  const head = stack('VERTICAL', 8, { name: 'theater-info' })
  head.paddingLeft = head.paddingRight = 12; head.paddingTop = 4; head.paddingBottom = 12
  const nameRow = stack('HORIZONTAL', 4, { center: true })
  nameRow.appendChild(txt('씨네큐브 광화문', KIMM, 22, G[900], 116))
  nameRow.appendChild(iconPh(11))
  head.appendChild(nameRow)
  const addrRow = stack('HORIZONTAL', 4, { center: true })
  addrRow.appendChild(txt('서울 종로구 새문안로 68 흥국생명빌딩 B2', P('Regular'), 13, G[600], 135))
  addrRow.appendChild(iconPh(10))
  head.appendChild(addrRow)
  const actions = stack('HORIZONTAL', 8, { name: 'actions' })
  actions.paddingTop = 8
  for (const label of ['길찾기', '공유', '인스타그램']) {
    const b = stack('HORIZONTAL', 5, { center: true })
    b.paddingLeft = b.paddingRight = 12; b.paddingTop = b.paddingBottom = 8
    b.cornerRadius = 8
    b.fills = fill(G.white)
    b.strokes = fill(G[300]); b.strokeWeight = 1
    b.appendChild(iconPh(13, G[600]))
    b.appendChild(txt(label, P('SemiBold'), 12, G[700]))
    actions.appendChild(b)
  }
  head.appendChild(actions)
  exp.appendChild(head)
  head.layoutSizingHorizontal = 'FILL'
  head.strokes = fill(G[200]); head.strokeWeight = 1; head.strokeAlign = 'INSIDE'
}
// 포스터 축소 스트립 (expanded: 포스터 절반 크기 스케일 + 선택 상태)
{
  const strip = stack('HORIZONTAL', 8, { name: 'poster-strip-small' })
  strip.paddingLeft = strip.paddingRight = 16; strip.paddingTop = 12; strip.paddingBottom = 12
  strip.fills = fill(G[100])
  const films = ['중경삼림', '고령가', '화양연화', '타르코프', '베를린']
  films.forEach((name, i) => {
    const item = stack('VERTICAL', 4, { name: 'film', center: true })
    const p1 = poster(48, 72, 0)
    if (i === 0) { p1.strokes = fill(G[900]); p1.strokeWeight = 2 } // 선택 링 (배포: primary ring)
    item.appendChild(p1)
    item.appendChild(txt(name, P('Medium'), 10, i === 0 ? G[900] : G[500], 120))
    strip.appendChild(item)
  })
  exp.appendChild(strip)
  strip.layoutSizingHorizontal = 'FILL'
  strip.clipsContent = true
}
// 날짜바
{
  const bar = stack('HORIZONTAL', 6, { name: 'datebar' })
  bar.paddingLeft = bar.paddingRight = 12; bar.paddingTop = 12; bar.paddingBottom = 12
  const days = [['수', '29', true], ['목', '30', false], ['금', '31', false], ['토', '1', false], ['일', '2', false], ['월', '3', false], ['화', '4', false]]
  for (const [dow, date, active] of days) {
    const cell = stack('VERTICAL', 2, { name: 'day', center: true })
    cell.paddingLeft = cell.paddingRight = 11; cell.paddingTop = 6; cell.paddingBottom = 8
    cell.cornerRadius = 8
    cell.fills = active ? fill(G[900]) : []
    cell.appendChild(txt(dow, P('Medium'), 10, active ? G[300] : G[500], 100))
    cell.appendChild(txt(date, P('Bold'), 16, active ? G[100] : G[800], 100))
    bar.appendChild(cell)
  }
  exp.appendChild(bar)
  bar.strokes = fill(G[200]); bar.strokeWeight = 1; bar.strokeAlign = 'INSIDE'
  bar.layoutSizingHorizontal = 'FILL'
}
// 선택 영화 + 시간표
{
  const block = stack('VERTICAL', 10, { name: 'selected-movie' })
  block.paddingLeft = block.paddingRight = 12; block.paddingTop = 14; block.paddingBottom = 20
  block.appendChild(txt('중경삼림', P('SemiBold'), 15, G[900], 140))
  block.appendChild(txt('왕가위 · 1994 · 102분 · Chungking Express', P('Regular'), 13, G[500], 140))
  const grid = stack('HORIZONTAL', 8, { name: 'showtimes' })
  grid.paddingTop = 4
  const times = [['19:30', '82/120석', false], ['21:40', '6/90석', false], ['23:10', '매진', true]]
  for (const [time, seat, dead] of times) {
    const cell = stack('VERTICAL', 4, { name: 'cell' })
    cell.paddingLeft = cell.paddingRight = 12; cell.paddingTop = 12; cell.paddingBottom = 12
    cell.cornerRadius = 12
    cell.fills = fill(G.white)
    cell.strokes = fill(G[200]); cell.strokeWeight = 1
    const timeT = txt(time, P('Bold'), 17, dead ? G[400] : G[900], 100)
    if (dead) timeT.textDecoration = 'STRIKETHROUGH'
    cell.appendChild(timeT)
    cell.appendChild(txt(seat, P('SemiBold'), 12, dead ? G[400] : G[600], 100))
    if (dead) cell.opacity = 0.6
    grid.appendChild(cell)
  }
  block.appendChild(grid)
  exp.appendChild(block)
  block.layoutSizingHorizontal = 'FILL'
}

// 섹션 크기 보정
section.resizeWithoutConstraints(Math.max(section.width, 1100), Math.max(section.height, exp.y + exp.height + 80))
console.log('모바일 expanded 추가 완료')
