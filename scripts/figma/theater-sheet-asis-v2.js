// TheaterSheet ASIS v2 — 실물 스크린샷 기준 재현 (Scripter용)
// 모바일 collapsed / 모바일 expanded / PC 도킹 패널 · 색은 2.0 그레이스케일만
// 기존 'TheaterSheet ASIS (grayscale)' 섹션 내용을 전부 교체

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

let section = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet ASIS (grayscale)')
if (!section) {
  section = figma.createSection()
  section.name = 'TheaterSheet ASIS (grayscale)'
  let maxX = 0
  for (const n of figma.currentPage.children) { if (n !== section) maxX = Math.max(maxX, n.x + n.width) }
  section.x = maxX + 200; section.y = 0
  figma.currentPage.appendChild(section)
}
section.resizeWithoutConstraints(2000, 1400)
section.fills = fill(G[300])
for (const c of [...section.children]) c.remove()

// ── 헬퍼 ──
const txt = (chars, font, size, color, lh, ls) => {
  const t = figma.createText()
  t.fontName = font; t.characters = chars; t.fontSize = size
  if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }
  if (ls) t.letterSpacing = { unit: 'PERCENT', value: ls }
  t.fills = fill(color)
  return t
}
const stack = (dir, gap, opts = {}) => {
  const f = figma.createFrame()
  f.layoutMode = dir
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'
  f.itemSpacing = gap
  f.fills = []
  if (opts.center) f.counterAxisAlignItems = 'CENTER'
  if (opts.name) f.name = opts.name
  return f
}
const icon = (size, color) => {
  const r = figma.createRectangle()
  r.resize(size, size); r.cornerRadius = 3
  r.fills = fill(color || G[500])
  return r
}
const poster = (w, h, r) => {
  const rect = figma.createRectangle()
  rect.resize(w, h); rect.cornerRadius = r
  rect.fills = fill(G[300])
  return rect
}
const pillBtn = label => { // 실물: pill 액션 버튼 (아이콘+라벨)
  const b = stack('HORIZONTAL', 6, { center: true })
  b.paddingLeft = 14; b.paddingRight = 16; b.paddingTop = 9; b.paddingBottom = 9
  b.cornerRadius = 9999
  b.fills = fill(G.white)
  b.strokes = fill(G[300]); b.strokeWeight = 1
  b.appendChild(icon(14, G[700]))
  b.appendChild(txt(label, P('Medium'), 14, G[800]))
  return b
}
// 극장 헤더 블록 (이름 + 주소 + 액션 pills)
const theaterHeader = (nameSize) => {
  const head = stack('VERTICAL', 0, { name: 'theater-header' })
  head.paddingLeft = head.paddingRight = 20; head.paddingTop = 8; head.paddingBottom = 20
  const nameRow = stack('HORIZONTAL', 8, { center: true })
  nameRow.appendChild(txt('씨네큐브 광화문', KIMM, nameSize, G[900], 120, 5))
  nameRow.appendChild(icon(13, G[600]))
  head.appendChild(nameRow)
  const addrRow = stack('HORIZONTAL', 6, { center: true })
  const sp1 = figma.createFrame(); sp1.resize(10, 14); sp1.fills = []
  head.appendChild(sp1)
  addrRow.appendChild(txt('서울 종로구 새문안로 68', P('Regular'), 14, G[600], 140))
  addrRow.appendChild(icon(12, G[500]))
  head.appendChild(addrRow)
  const sp2 = figma.createFrame(); sp2.resize(10, 18); sp2.fills = []
  head.appendChild(sp2)
  const actions = stack('HORIZONTAL', 10, { name: 'actions' })
  for (const l of ['길찾기', '공유', '인스타그램']) actions.appendChild(pillBtn(l))
  head.appendChild(actions)
  return head
}
// 날짜바 (실물: 오늘만 박스, 나머지 dow+date+밑줄, 좌우 화살표)
const dateBar = (width) => {
  const bar = stack('HORIZONTAL', 0, { name: 'datebar', center: true })
  bar.counterAxisSizingMode = 'FIXED'
  bar.resize(width, 96)
  bar.fills = fill(G.white)
  bar.strokes = fill(G[200]); bar.strokeWeight = 1; bar.strokeAlign = 'INSIDE'
  bar.paddingLeft = bar.paddingRight = 10
  bar.primaryAxisAlignItems = 'SPACE_BETWEEN'
  bar.appendChild(icon(12, G[300]))
  const days = [
    ['오늘', '3', 'today'], ['화', '4', 'wd'], ['수', '5', 'wd'], ['목', '6', 'wd'],
    ['금', '7', 'wd'], ['토', '8', 'sat'], ['일', '9', 'sun'],
  ]
  for (const [dow, date, kind] of days) {
    if (kind === 'today') {
      const cell = stack('VERTICAL', 2, { name: 'today', center: true })
      cell.paddingLeft = cell.paddingRight = 14; cell.paddingTop = 9; cell.paddingBottom = 9
      cell.cornerRadius = 10
      cell.fills = fill(G[800])
      cell.appendChild(txt(dow, P('Medium'), 12, G[300], 100))
      cell.appendChild(txt(date, P('Bold'), 18, G[100], 100))
      const u = figma.createRectangle(); u.resize(22, 3); u.cornerRadius = 1.5; u.fills = fill(G[100])
      cell.appendChild(u)
      bar.appendChild(cell)
    } else {
      // 그레이스케일 대치: 평일 500 / 토 700 / 일 900 (원본은 파랑·빨강)
      const c = kind === 'sat' ? G[700] : kind === 'sun' ? G[900] : G[500]
      const cell = stack('VERTICAL', 3, { name: 'day', center: true })
      cell.paddingLeft = cell.paddingRight = 8; cell.paddingTop = 9; cell.paddingBottom = 9
      cell.appendChild(txt(dow, P('Medium'), 12, c, 100))
      cell.appendChild(txt(date, P('Bold'), 18, kind === 'wd' ? G[800] : c, 100))
      const u = figma.createRectangle(); u.resize(22, 3); u.cornerRadius = 1.5; u.fills = fill(c)
      cell.appendChild(u)
      bar.appendChild(cell)
    }
  }
  bar.appendChild(icon(12, G[500]))
  return bar
}
// "10편 상영 · 예매 가능만 보기 · 필터" 줄
const countRow = (width) => {
  const row = stack('HORIZONTAL', 10, { name: 'count-row', center: true })
  row.counterAxisSizingMode = 'FIXED'
  row.resize(width, 56)
  row.paddingLeft = row.paddingRight = 20
  row.primaryAxisAlignItems = 'SPACE_BETWEEN'
  const left = stack('HORIZONTAL', 10, { center: true })
  left.appendChild(txt('10편 상영', P('Bold'), 16, G[900]))
  const chip = stack('HORIZONTAL', 0, { center: true })
  chip.paddingLeft = chip.paddingRight = 12; chip.paddingTop = 6; chip.paddingBottom = 6
  chip.cornerRadius = 9999
  chip.strokes = fill(G[300]); chip.strokeWeight = 1
  chip.appendChild(txt('예매 가능만 보기', P('Medium'), 12, G[600]))
  left.appendChild(chip)
  row.appendChild(left)
  const filter = stack('HORIZONTAL', 5, { center: true })
  filter.paddingLeft = filter.paddingRight = 12; filter.paddingTop = 6; filter.paddingBottom = 6
  filter.cornerRadius = 9999
  filter.strokes = fill(G[300]); filter.strokeWeight = 1
  filter.appendChild(icon(12, G[600]))
  filter.appendChild(txt('필터', P('Medium'), 12, G[600]))
  row.appendChild(filter)
  return row
}
// 포스터 그리드 (선택 포스터: 보더+체크)
const posterRow = (pw, ph) => {
  const strip = stack('HORIZONTAL', 14, { name: 'posters' })
  strip.paddingLeft = 20; strip.paddingRight = 20; strip.paddingTop = 4; strip.paddingBottom = 16
  const films = [['어떻게 해야 했을까?', '후지노 토모아키', true], ['파리의 사생활', '레베카 즐로토프스키', false], ['피아노', '제인 캠피온', false]]
  for (const [name, dir, sel] of films) {
    const item = stack('VERTICAL', 4, { name: 'film' })
    const pw2 = figma.createFrame()
    pw2.resize(pw, ph); pw2.fills = []; pw2.clipsContent = false
    const p1 = poster(pw, ph, 4)
    if (sel) { p1.strokes = fill(G[800]); p1.strokeWeight = 2 }
    pw2.appendChild(p1)
    if (sel) {
      const chk = figma.createFrame()
      chk.resize(24, 24); chk.cornerRadius = 12
      chk.fills = fill(G[800])
      chk.strokes = fill(G.white); chk.strokeWeight = 2
      pw2.appendChild(chk)
      chk.x = pw - 14; chk.y = -8
    }
    item.appendChild(pw2)
    const t1 = txt(name, P('Bold'), 15, G[900], 135)
    t1.textAutoResize = 'HEIGHT'; t1.resize(pw, 10)
    item.appendChild(t1)
    item.appendChild(txt(dir, P('Regular'), 13, G[500], 135))
    strip.appendChild(item)
  }
  return strip
}
// 선택 영화 상세 카드
const movieCard = (width) => {
  const card = stack('VERTICAL', 0, { name: 'movie-card' })
  card.counterAxisSizingMode = 'FIXED'
  card.resize(width, 100)
  card.primaryAxisSizingMode = 'AUTO'
  card.fills = fill(G.white)
  card.cornerRadius = 14
  card.strokes = fill(G[200]); card.strokeWeight = 1
  const top = stack('HORIZONTAL', 16, { name: 'top' })
  top.paddingLeft = top.paddingRight = 20; top.paddingTop = 20; top.paddingBottom = 16
  top.appendChild(poster(84, 126, 4))
  const info = stack('VERTICAL', 10, { name: 'info' })
  info.appendChild(txt('어떻게 해야 했을까?', P('Bold'), 20, G[900], 130))
  const chips = stack('HORIZONTAL', 8, { center: true })
  for (const c of ['일본', '101분', '인물']) {
    const chip = stack('HORIZONTAL', 0, { center: true })
    chip.paddingLeft = chip.paddingRight = 10; chip.paddingTop = 5; chip.paddingBottom = 5
    chip.cornerRadius = 9999
    chip.strokes = fill(G[300]); chip.strokeWeight = 1
    chip.appendChild(txt(c, P('Medium'), 12, G[600]))
    chips.appendChild(chip)
  }
  info.appendChild(chips)
  top.appendChild(info)
  card.appendChild(top)
  // 감독 행
  const dirRow = stack('HORIZONTAL', 12, { name: 'director', center: true })
  dirRow.counterAxisSizingMode = 'FIXED'
  dirRow.resize(width, 64)
  dirRow.paddingLeft = dirRow.paddingRight = 20
  dirRow.primaryAxisAlignItems = 'SPACE_BETWEEN'
  dirRow.strokes = fill(G[200]); dirRow.strokeWeight = 1; dirRow.strokeAlign = 'INSIDE'
  const dl = stack('HORIZONTAL', 12, { center: true })
  const av = figma.createFrame(); av.resize(36, 36); av.cornerRadius = 18
  av.fills = fill(G[200])
  dl.appendChild(av)
  dl.appendChild(txt('후지노 토모아키', P('Bold'), 16, G[900]))
  dirRow.appendChild(dl)
  dirRow.appendChild(icon(12, G[500]))
  card.appendChild(dirRow)
  // 하단 2분할 버튼
  const btns = stack('HORIZONTAL', 0, { name: 'buttons' })
  btns.counterAxisSizingMode = 'FIXED'
  btns.resize(width, 56)
  for (const [i, l] of [['영화 상세 정보'], ['지도에서 이 영화 검색']].entries()) {
    const b = stack('HORIZONTAL', 6, { center: true })
    b.counterAxisSizingMode = 'FIXED'
    b.resize(width / 2, 56)
    b.primaryAxisAlignItems = 'CENTER'
    b.appendChild(icon(13, G[600]))
    b.appendChild(txt(l[0], P('Medium'), 14, G[700]))
    if (i === 0) { b.strokes = fill(G[200]); b.strokeWeight = 1; b.strokeAlign = 'INSIDE' }
    btns.appendChild(b)
  }
  card.appendChild(btns)
  return card
}
// 시간표 셀 (실물: 큰 시간 + 종료 + 상태 + 관·포맷, 틴트 bg)
const showtimeCell = (time, end, status, hall, dead) => {
  const cell = stack('VERTICAL', 6, { name: 'showtime' })
  cell.paddingLeft = cell.paddingRight = 18; cell.paddingTop = 18; cell.paddingBottom = 18
  cell.cornerRadius = 16
  cell.fills = fill(G[200])
  const timeT = txt(time, P('Bold'), 24, dead ? G[400] : G[800], 100)
  if (dead) timeT.textDecoration = 'STRIKETHROUGH'
  cell.appendChild(timeT)
  cell.appendChild(txt(end, P('Regular'), 14, G[500], 120))
  cell.appendChild(txt(status, P('SemiBold'), 14, dead ? G[400] : G[600], 120))
  cell.appendChild(txt(hall, P('Regular'), 13, G[500], 120))
  return cell
}

// ═══ 1. 모바일 collapsed ═══
{
  const mob = figma.createFrame()
  mob.name = 'ASIS · Mobile collapsed'
  mob.layoutMode = 'VERTICAL'
  mob.primaryAxisSizingMode = 'AUTO'
  mob.counterAxisSizingMode = 'FIXED'
  mob.resize(390, 100)
  mob.fills = fill(G[100])
  mob.topLeftRadius = mob.topRightRadius = 20
  section.appendChild(mob)
  mob.x = 60; mob.y = 100
  // 핸들
  const hw = stack('VERTICAL', 0, { name: 'handle', center: true })
  hw.counterAxisSizingMode = 'FIXED'; hw.resize(390, 20)
  hw.primaryAxisAlignItems = 'CENTER'
  const h = figma.createRectangle(); h.resize(36, 4); h.cornerRadius = 2; h.fills = fill(G[300])
  hw.appendChild(h)
  mob.appendChild(hw); hw.layoutSizingHorizontal = 'FILL'
  // 헤더 + 닫기
  const headRow = stack('HORIZONTAL', 0, { name: 'head-row' })
  const head = theaterHeader(26)
  headRow.appendChild(head)
  const close = stack('VERTICAL', 0, { center: true })
  close.counterAxisSizingMode = 'FIXED'; close.resize(40, 40)
  close.primaryAxisAlignItems = 'CENTER'
  close.appendChild(icon(16, G[700]))
  headRow.appendChild(close)
  mob.appendChild(headRow)
  // 포스터 스트립 (실물: 큰 포스터 + 제목 15 + 감독 13)
  const strip = posterRow(146, 218)
  strip.fills = fill(G[100])
  mob.appendChild(strip)
  strip.layoutSizingHorizontal = 'FILL'
  strip.clipsContent = true
  // 탭바
  const nav = stack('HORIZONTAL', 0, { name: 'tabbar', center: true })
  nav.counterAxisSizingMode = 'FIXED'; nav.resize(390, 56)
  nav.fills = fill(G.white)
  nav.strokes = fill(G[200]); nav.strokeWeight = 1; nav.strokeAlign = 'INSIDE'
  nav.primaryAxisAlignItems = 'SPACE_BETWEEN'
  nav.paddingLeft = nav.paddingRight = 60
  for (let i = 0; i < 3; i++) {
    const item = stack('VERTICAL', 3, { center: true })
    item.appendChild(icon(22, i === 0 ? G[800] : G[400]))
    item.appendChild(txt(['지도', '상영작', '설정'][i], P('Medium'), 10, i === 0 ? G[800] : G[400]))
    nav.appendChild(item)
  }
  mob.appendChild(nav); nav.layoutSizingHorizontal = 'FILL'
}

// ═══ 2. 모바일 expanded ═══
{
  const exp = figma.createFrame()
  exp.name = 'ASIS · Mobile expanded'
  exp.layoutMode = 'VERTICAL'
  exp.primaryAxisSizingMode = 'AUTO'
  exp.counterAxisSizingMode = 'FIXED'
  exp.resize(390, 100)
  exp.fills = fill(G[100])
  section.appendChild(exp)
  exp.x = 530; exp.y = 100
  // nav row
  const nav = stack('HORIZONTAL', 0, { name: 'nav-row', center: true })
  nav.counterAxisSizingMode = 'FIXED'; nav.resize(390, 56)
  nav.paddingLeft = nav.paddingRight = 20
  nav.primaryAxisAlignItems = 'SPACE_BETWEEN'
  nav.appendChild(icon(18, G[800]))
  nav.appendChild(icon(18, G[800]))
  exp.appendChild(nav); nav.layoutSizingHorizontal = 'FILL'
  // 극장 헤더
  const head = theaterHeader(26)
  exp.appendChild(head)
  // 날짜바
  const db = dateBar(390)
  exp.appendChild(db); db.layoutSizingHorizontal = 'FILL'
  // 카운트 줄
  const cr = countRow(390)
  exp.appendChild(cr); cr.layoutSizingHorizontal = 'FILL'
  // 포스터 그리드
  const strip = posterRow(146, 218)
  exp.appendChild(strip)
  strip.layoutSizingHorizontal = 'FILL'
  strip.clipsContent = true
  // 영화 카드
  const cardWrap = stack('VERTICAL', 0, { name: 'card-wrap' })
  cardWrap.paddingLeft = cardWrap.paddingRight = 16; cardWrap.paddingTop = 8; cardWrap.paddingBottom = 16
  cardWrap.appendChild(movieCard(358))
  exp.appendChild(cardWrap)
  // 시간표
  const times = stack('HORIZONTAL', 12, { name: 'showtimes' })
  times.paddingLeft = 16; times.paddingRight = 16; times.paddingBottom = 12
  times.appendChild(showtimeCell('11:20', '-13:01', '상영 완료', '2관 2D(자막)', true))
  times.appendChild(showtimeCell('20:10', '-21:51', '상영중', '2관 2D(자막)', false))
  exp.appendChild(times)
  // 면책
  const disc = txt('상영 정보는 실시간으로 불러오지 않으므로\n실제 좌석 현황과 다를 수 있습니다.', P('Regular'), 12, G[500], 150)
  disc.textAlignHorizontal = 'CENTER'
  const dw = stack('VERTICAL', 0, { name: 'disclaimer', center: true })
  dw.counterAxisSizingMode = 'FIXED'; dw.resize(390, 70)
  dw.primaryAxisAlignItems = 'CENTER'
  dw.appendChild(disc)
  exp.appendChild(dw); dw.layoutSizingHorizontal = 'FILL'
}

// ═══ 3. PC 도킹 패널 ═══
{
  const pc = figma.createFrame()
  pc.name = 'ASIS · PC docked'
  pc.layoutMode = 'HORIZONTAL'
  pc.primaryAxisSizingMode = 'AUTO'
  pc.counterAxisSizingMode = 'AUTO'
  pc.fills = fill(G[200])
  section.appendChild(pc)
  pc.x = 1000; pc.y = 100
  // 좌측 레일
  const rail = stack('VERTICAL', 24, { name: 'rail', center: true })
  rail.counterAxisSizingMode = 'FIXED'
  rail.resize(72, 900)
  rail.fills = fill(G[100])
  rail.paddingTop = 20; rail.paddingBottom = 20
  const logo = figma.createFrame(); logo.resize(40, 40); logo.cornerRadius = 8; logo.fills = fill(G[800])
  rail.appendChild(logo)
  for (const [l, active] of [['지도', true], ['상영작', false]]) {
    const item = stack('VERTICAL', 4, { center: true })
    item.paddingTop = item.paddingBottom = 10; item.paddingLeft = item.paddingRight = 12
    item.cornerRadius = 10
    if (active) item.fills = fill(G[200])
    item.appendChild(icon(20, active ? G[800] : G[400]))
    item.appendChild(txt(l, P('Medium'), 11, active ? G[800] : G[400]))
    rail.appendChild(item)
  }
  pc.appendChild(rail)
  // 패널
  const panel = stack('VERTICAL', 0, { name: 'panel' })
  panel.counterAxisSizingMode = 'FIXED'
  panel.resize(440, 100)
  panel.primaryAxisSizingMode = 'AUTO'
  panel.fills = fill(G[100])
  // nav
  const nav = stack('HORIZONTAL', 0, { name: 'panel-head', center: true })
  nav.counterAxisSizingMode = 'FIXED'; nav.resize(440, 20)
  nav.paddingTop = 16
  panel.appendChild(nav)
  const head = theaterHeader(24)
  panel.appendChild(head)
  const db = dateBar(440)
  panel.appendChild(db); db.layoutSizingHorizontal = 'FILL'
  const cr = countRow(440)
  panel.appendChild(cr); cr.layoutSizingHorizontal = 'FILL'
  const strip = posterRow(120, 180)
  panel.appendChild(strip); strip.layoutSizingHorizontal = 'FILL'; strip.clipsContent = true
  const cardWrap = stack('VERTICAL', 0, { name: 'card-wrap' })
  cardWrap.paddingLeft = cardWrap.paddingRight = 16; cardWrap.paddingTop = 8; cardWrap.paddingBottom = 16
  cardWrap.appendChild(movieCard(408))
  panel.appendChild(cardWrap)
  const times = stack('HORIZONTAL', 12, { name: 'showtimes' })
  times.paddingLeft = 16; times.paddingRight = 16; times.paddingBottom = 20
  times.appendChild(showtimeCell('11:20', '-13:01', '상영 완료', '2관 2D(자막)', true))
  times.appendChild(showtimeCell('20:10', '-21:51', '상영중', '2관 2D(자막)', false))
  panel.appendChild(times)
  pc.appendChild(panel)
  // 지도 자리
  const map = figma.createFrame()
  map.resize(420, 900)
  map.fills = fill(G[200])
  pc.appendChild(map)
  const mapLabel = txt('지도 영역', P('Medium'), 14, G[500])
  map.appendChild(mapLabel); mapLabel.x = 180; mapLabel.y = 440
}

const cap = txt('ASIS v2 — 실물 스크린샷 기준 · 그레이스케일 (요일 색·상태색은 회색 명도로 대치)', P('Regular'), 12, G[700])
section.appendChild(cap)
cap.x = 60; cap.y = 56
console.log('ASIS v2 완료')
