// TheaterSheet ASIS 재현 — 모바일 바텀시트 + PC 패널 (Scripter용)
// 배포판 구조·수치 그대로, 색만 2.0 그레이스케일로 제한 (grayscale 연습용)

const P = s => ({ family: 'Pretendard', style: s })
const KIMM = { family: 'KIMM_Bold', style: 'B' }
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync(KIMM)

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
// 2.0 그레이스케일 전용
const G = {
  900: '#0C0A08', 800: '#2B2622', 700: '#58524B', 600: '#726B65', 500: '#8D8781',
  400: '#A7A19A', 300: '#C6BFB9', 200: '#EAE5E1', 100: '#FAF9F8', white: '#FFFFFF',
}
const fill = h => [{ type: 'SOLID', color: hex(h) }]

// ── 섹션 ──
let section = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet ASIS (grayscale)')
if (!section) {
  section = figma.createSection()
  section.name = 'TheaterSheet ASIS (grayscale)'
  let maxX = 0
  for (const n of figma.currentPage.children) { if (n !== section) maxX = Math.max(maxX, n.x + n.width) }
  section.x = maxX + 200; section.y = 0
  section.resizeWithoutConstraints(1100, 950)
  section.fills = fill(G[200])
  figma.currentPage.appendChild(section)
}
for (const c of [...section.children]) c.remove()

// ── 헬퍼 ──
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
const iconPh = (size, color) => { // 아이콘 자리 표시
  const r = figma.createRectangle()
  r.resize(size, size); r.cornerRadius = 3
  r.fills = fill(color || G[400])
  return r
}
const poster = (w, h, r) => {
  const rect = figma.createRectangle()
  rect.resize(w, h); rect.cornerRadius = r
  rect.fills = fill(G[300])
  return rect
}

// ═══ 모바일 collapsed 바텀시트 (390폭) ═══
const mob = figma.createFrame()
mob.name = 'ASIS · Mobile collapsed'
mob.layoutMode = 'VERTICAL'
mob.primaryAxisSizingMode = 'AUTO'
mob.counterAxisSizingMode = 'FIXED'
mob.resize(390, 100)
mob.itemSpacing = 0
mob.fills = fill(G[200])            // 배포: surface-raised
mob.topLeftRadius = mob.topRightRadius = 20
section.appendChild(mob)
mob.x = 60; mob.y = 100

// 핸들
{
  const wrap = stack('VERTICAL', 0, { name: 'handle' })
  wrap.counterAxisSizingMode = 'FIXED'; wrap.resize(390, 18)
  wrap.primaryAxisAlignItems = 'CENTER'; wrap.counterAxisAlignItems = 'CENTER'
  const h = figma.createRectangle()
  h.resize(36, 4); h.cornerRadius = 2; h.fills = fill(G[300])
  wrap.appendChild(h)
  mob.appendChild(wrap)
  wrap.layoutSizingHorizontal = 'FILL'
}
// 헤더 (배포: name 22/800 display + 아이콘, 주소 13 + copy, 우측 close)
{
  const head = stack('HORIZONTAL', 12, { name: 'header' })
  head.paddingLeft = head.paddingRight = 12; head.paddingTop = 4; head.paddingBottom = 0
  const left = stack('VERTICAL', 8, { name: 'title-block' })
  const nameRow = stack('HORIZONTAL', 4, { center: true })
  nameRow.appendChild(txt('씨네큐브 광화문', KIMM, 22, G[900], 116))
  nameRow.appendChild(iconPh(11))
  left.appendChild(nameRow)
  const addrRow = stack('HORIZONTAL', 4, { center: true })
  addrRow.appendChild(txt('서울 종로구 새문안로 68 흥국생명빌딩 B2', P('Regular'), 13, G[600], 135))
  addrRow.appendChild(iconPh(10))
  left.appendChild(addrRow)
  head.appendChild(left)
  const close = stack('VERTICAL', 0, { name: 'close' })
  close.counterAxisSizingMode = 'FIXED'; close.resize(36, 36)
  close.cornerRadius = 18
  close.fills = [{ type: 'SOLID', color: hex(G[900]), opacity: 0.06 }]
  close.primaryAxisAlignItems = 'CENTER'; close.counterAxisAlignItems = 'CENTER'
  close.appendChild(iconPh(14, G[700]))
  head.appendChild(close)
  mob.appendChild(head)
}
// 액션 버튼 3개 (배포: 12/600, card bg, border)
{
  const row = stack('HORIZONTAL', 8, { name: 'actions' })
  row.paddingLeft = row.paddingRight = 12; row.paddingTop = 16; row.paddingBottom = 12
  for (const label of ['길찾기', '공유', '인스타그램']) {
    const b = stack('HORIZONTAL', 5, { center: true })
    b.paddingLeft = b.paddingRight = 12; b.paddingTop = b.paddingBottom = 8
    b.cornerRadius = 8
    b.fills = fill(G.white)
    b.strokes = fill(G[300]); b.strokeWeight = 1
    b.appendChild(iconPh(13, G[600]))
    b.appendChild(txt(label, P('SemiBold'), 12, G[700]))
    row.appendChild(b)
  }
  mob.appendChild(row)
}
// 포스터 스트립 (배포: 위아래 보더 + bg-100, 포스터 radius 0, 제목 11/부제 10)
{
  const strip = stack('HORIZONTAL', 12, { name: 'poster-strip' })
  strip.paddingLeft = strip.paddingRight = 16; strip.paddingTop = 22; strip.paddingBottom = 14
  strip.fills = fill(G[100])
  strip.strokes = fill(G[200]); strip.strokeWeight = 1
  strip.strokeAlign = 'INSIDE'
  const films = [['중경삼림', '왕가위 · 1994', false], ['고령가 소년 살인사건', '에드워드 양 · 1991', true], ['화양연화', '왕가위 · 2000', false], ['타르코프스키 특별전', '기도하는 영혼', false]]
  for (const [name, sub, soldout] of films) {
    const item = stack('VERTICAL', 0, { name: 'film' })
    const posterWrap = figma.createFrame()
    posterWrap.resize(96, 144)
    posterWrap.fills = []
    posterWrap.clipsContent = false
    const p1 = poster(96, 144, 0)                       // 배포: radius 0
    posterWrap.appendChild(p1)
    if (soldout) {
      const badge = stack('HORIZONTAL', 0, { center: true, name: 'soldout' })
      badge.paddingLeft = badge.paddingRight = 8; badge.paddingTop = badge.paddingBottom = 4
      badge.cornerRadius = 4
      badge.fills = fill(G[800])
      badge.appendChild(txt('매진', P('SemiBold'), 11, G[100], 100))
      posterWrap.appendChild(badge)
      badge.x = 96 - badge.width - 6; badge.y = 144 - badge.height - 6
    }
    item.appendChild(posterWrap)
    const t1 = txt(name, P('SemiBold'), 11, G[800], 130)   // 배포: 제목 11px
    t1.textAutoResize = 'HEIGHT'; t1.resize(96, 10)
    const t2 = txt(sub, P('Regular'), 10, G[500], 130)     // 부제 10px
    item.appendChild(t1); item.appendChild(t2)
    t1.y = 0
    item.itemSpacing = 4
    const spacer = figma.createFrame(); spacer.resize(96, 4); spacer.fills = []
    item.insertChild(1, spacer)
    strip.appendChild(item)
  }
  mob.appendChild(strip)
  strip.layoutSizingHorizontal = 'FILL'
  strip.clipsContent = true
}
// 글로벌 탭바 힌트
{
  const nav = stack('HORIZONTAL', 0, { name: 'tabbar' })
  nav.counterAxisSizingMode = 'FIXED'
  nav.resize(390, 52)
  nav.fills = fill(G.white)
  nav.strokes = fill(G[200]); nav.strokeWeight = 1
  nav.primaryAxisAlignItems = 'SPACE_BETWEEN'; nav.counterAxisAlignItems = 'CENTER'
  nav.paddingLeft = nav.paddingRight = 48
  for (let i = 0; i < 4; i++) nav.appendChild(iconPh(20, i === 0 ? G[800] : G[400]))
  mob.appendChild(nav)
  nav.layoutSizingHorizontal = 'FILL'
}

// ═══ PC 플로팅 패널 (expanded, 400폭) ═══
const pc = figma.createFrame()
pc.name = 'ASIS · PC panel expanded'
pc.layoutMode = 'VERTICAL'
pc.primaryAxisSizingMode = 'AUTO'
pc.counterAxisSizingMode = 'FIXED'
pc.resize(400, 100)
pc.itemSpacing = 0
pc.fills = fill(G.white)
pc.cornerRadius = 16
pc.strokes = fill(G[200]); pc.strokeWeight = 1
section.appendChild(pc)
pc.x = 560; pc.y = 100

// 헤더 (극장 정보)
{
  const head = stack('VERTICAL', 8, { name: 'header' })
  head.paddingLeft = head.paddingRight = 16; head.paddingTop = 16; head.paddingBottom = 12
  const topRow = stack('HORIZONTAL', 12, { name: 'name-row' })
  topRow.counterAxisAlignItems = 'CENTER'
  topRow.appendChild(txt('씨네큐브 광화문', KIMM, 22, G[900], 116))
  topRow.appendChild(iconPh(11))
  head.appendChild(topRow)
  const addrRow = stack('HORIZONTAL', 4, { center: true })
  addrRow.appendChild(txt('서울 종로구 새문안로 68 · 도보 5분', P('Regular'), 13, G[600], 135))
  addrRow.appendChild(iconPh(10))
  head.appendChild(addrRow)
  const actions = stack('HORIZONTAL', 8, { name: 'actions' })
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
  pc.appendChild(head)
  head.layoutSizingHorizontal = 'FILL'
  head.strokes = fill(G[200]); head.strokeWeight = 1; head.strokeAlign = 'INSIDE'
}
// 날짜바 (7셀: dow 10, date 16/700, 오늘 = 진한 셀)
{
  const bar = stack('HORIZONTAL', 6, { name: 'datebar' })
  bar.paddingLeft = bar.paddingRight = 16; bar.paddingTop = 12; bar.paddingBottom = 12
  const days = [['수', '29', true], ['목', '30', false], ['금', '31', false], ['토', '1', false], ['일', '2', false], ['월', '3', false], ['화', '4', false]]
  for (const [dow, date, active] of days) {
    const cell = stack('VERTICAL', 2, { name: 'day' })
    cell.counterAxisAlignItems = 'CENTER'
    cell.paddingLeft = cell.paddingRight = 10; cell.paddingTop = 6; cell.paddingBottom = 8
    cell.cornerRadius = 8
    cell.fills = active ? fill(G[900]) : []
    cell.appendChild(txt(dow, P('Medium'), 10, active ? G[300] : G[500], 100))
    cell.appendChild(txt(date, P('Bold'), 16, active ? G[100] : G[800], 100))
    bar.appendChild(cell)
  }
  pc.appendChild(bar)
}
// 영화 + 시간표 (2세트)
const movies = [
  ['중경삼림', '왕가위 · 1994 · 102분', [['19:30', '82/120석', false], ['21:40', '6/90석', false]]],
  ['고령가 소년 살인사건', '에드워드 양 · 1991 · 237분', [['17:00', '매진', true]]],
]
for (const [name, meta, times] of movies) {
  const block = stack('HORIZONTAL', 12, { name: 'movie-block' })
  block.paddingLeft = block.paddingRight = 16; block.paddingTop = 12; block.paddingBottom = 12
  block.appendChild(poster(68, 102, 0))
  const right = stack('VERTICAL', 6, { name: 'info' })
  right.appendChild(txt(name, P('SemiBold'), 15, G[900], 140))   // 배포: subtitle 15/600
  right.appendChild(txt(meta, P('Regular'), 13, G[500], 140))
  const grid = stack('HORIZONTAL', 8, { name: 'showtimes' })
  for (const [time, seat, dead] of times) {
    const cell = stack('VERTICAL', 4, { name: 'cell' })
    cell.paddingLeft = cell.paddingRight = 12; cell.paddingTop = 12; cell.paddingBottom = 12
    cell.cornerRadius = 12
    cell.fills = fill(G.white)
    cell.strokes = fill(G[200]); cell.strokeWeight = 1
    const timeT = txt(time, P('Bold'), 17, dead ? G[400] : G[900], 100)  // 배포: 17/700
    if (dead) timeT.textDecoration = 'STRIKETHROUGH'
    cell.appendChild(timeT)
    cell.appendChild(txt(seat, P('SemiBold'), 12, dead ? G[400] : G[600], 100))
    if (dead) cell.opacity = 0.6
    grid.appendChild(cell)
  }
  right.appendChild(grid)
  block.appendChild(right)
  pc.appendChild(block)
  block.strokes = fill(G[200]); block.strokeWeight = 1; block.strokeAlign = 'INSIDE'
}

// 라벨
const cap = txt('배포판 구조 그대로 · 색만 2.0 그레이스케일 · 좌: 모바일 collapsed / 우: PC 패널 expanded', P('Regular'), 12, G[600])
section.appendChild(cap)
cap.x = 60; cap.y = 60
console.log('ASIS 목업 완료')
