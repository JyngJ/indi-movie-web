// 타이포 2.0 실사용 예시 화면 3종 생성 (Scripter용)
// Typography 2.0 프레임 오른쪽에 배치. 색은 2.0 팔레트 확정값.

const FRAME_ID = '41:306'

const P = s => ({ family: 'Pretendard', style: s })
const KIMM = { family: 'KIMM_Bold', style: 'B' }
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync(KIMM)

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
// 2.0 팔레트 확정값
const C = {
  ink900: '#0C0A08', ink700: '#58524B', ink500: '#8D8781', ink400: '#A7A19A',
  paper: '#FAF9F8', border: '#EAE5E1', white: '#FFFFFF',
  pri900: '#1F2747', pri700: '#404E81', pri100: '#ECEFF9',
  warn700: '#B9800E', err900: '#9B3331', succ700: '#4A7C59',
}
const fill = h => [{ type: 'SOLID', color: hex(h) }]

const anchor = await figma.getNodeByIdAsync(FRAME_ID)
if (!anchor) throw new Error('Typography 프레임 못 찾음')
const section = anchor.parent

// 스타일 프리셋: [폰트, 크기, 행간%, 색]
const S = {
  h1: [KIMM, 24, 125, C.ink900],
  h2: [KIMM, 20, 130, C.ink900],
  title: [P('Bold'), 16, 140, C.ink900],
  bodyStrong: [P('Bold'), 14, 150, C.ink900],
  body: [P('Medium'), 14, 150, C.ink700],
  meta: [P('Regular'), 12, 150, C.ink500],
  caption: [P('Medium'), 12, 140, C.ink500],
  label: [P('Medium'), 10, 140, C.ink500],
  time: [P('Bold'), 16, 100, C.ink900],
  seat: [P('SemiBold'), 12, 100, C.pri700],
}
const txt = (styleKey, chars, colorOverride, width) => {
  const [font, size, lh, col] = S[styleKey]
  const t = figma.createText()
  t.fontName = font
  t.characters = chars
  t.fontSize = size
  t.lineHeight = { unit: 'PERCENT', value: lh }
  t.fills = fill(colorOverride || col)
  if (styleKey === 'caption') { t.textCase = 'UPPER'; t.letterSpacing = { unit: 'PIXELS', value: 0.4 } }
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, 10) }
  return t
}
const vstack = (gap, name) => {
  const f = figma.createFrame()
  f.layoutMode = 'VERTICAL'
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'
  f.itemSpacing = gap; f.fills = []; f.name = name || 'stack'
  return f
}
const hstack = (gap, name) => {
  const f = figma.createFrame()
  f.layoutMode = 'HORIZONTAL'
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'
  f.counterAxisAlignItems = 'CENTER'
  f.itemSpacing = gap; f.fills = []; f.name = name || 'row'
  return f
}
const removeOld = name => {
  const old = section.findOne(n => n.name === name)
  if (old) old.remove()
}

const baseX = anchor.x + anchor.width + 80
const made = []

// ── A. 영화 상세 히어로 (h1 + meta + body 문단 + CTA) ──
removeOld('type-demo/상세 히어로')
{
  const card = vstack(12, 'type-demo/상세 히어로')
  card.fills = fill(C.white)
  card.cornerRadius = 16
  card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24
  card.strokes = fill(C.border); card.strokeWeight = 1
  card.appendChild(txt('caption', 'Now Showing', C.warn700))
  card.appendChild(txt('h1', '중경삼림', null, 312))
  card.appendChild(txt('meta', '왕가위 · 1994 · 102분 · Chungking Express', null, 312))
  card.appendChild(txt('body', '실연당한 두 경찰과 그들 곁을 스치는 여자들. 홍콩 청킹맨션의 밤을 배경으로, 스치는 인연과 유통기한 있는 사랑을 그린 왕가위의 대표작.', null, 312))
  const btn = hstack(8, 'cta')
  btn.fills = fill(C.pri700)
  btn.cornerRadius = 8
  btn.paddingLeft = btn.paddingRight = 20; btn.paddingTop = btn.paddingBottom = 12
  btn.appendChild(txt('bodyStrong', '예매하러 가기', C.pri100))
  card.appendChild(btn)
  section.appendChild(card)
  card.x = baseX; card.y = anchor.y
  made.push(card.name)
}

// ── B. 극장 시간표 카드 (h2 + meta + 영화 행들) ──
removeOld('type-demo/극장 시간표')
{
  const card = vstack(16, 'type-demo/극장 시간표')
  card.fills = fill(C.white)
  card.cornerRadius = 16
  card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24
  card.strokes = fill(C.border); card.strokeWeight = 1
  const head = vstack(4, 'head')
  head.appendChild(txt('h2', '씨네큐브 광화문'))
  head.appendChild(txt('meta', '서울 종로구 새문안로 68 · 도보 5분'))
  card.appendChild(head)
  const films = [
    ['고령가 소년 살인사건', '19:30', '82/120석', null],
    ['타르코프스키: 기도하는 영혼', '21:40', '6/90석', 'D-1'],
    ['중경삼림', '23:00', '매진', null],
  ]
  for (const [name, time, seat, dday] of films) {
    const row = hstack(16, 'film-row')
    row.counterAxisAlignItems = 'BASELINE'
    const left = vstack(2, 'left')
    const titleRow = hstack(6, 'title-row')
    titleRow.counterAxisAlignItems = 'CENTER'
    titleRow.appendChild(txt('title', name))
    if (dday) {
      const chip = hstack(0, 'chip')
      chip.fills = fill(C.warn700)
      chip.cornerRadius = 4
      chip.paddingLeft = chip.paddingRight = 6; chip.paddingTop = chip.paddingBottom = 3
      chip.appendChild(txt('label', dday, '#FDF1D8'))
      titleRow.appendChild(chip)
    }
    left.appendChild(titleRow)
    row.appendChild(left)
    const right = hstack(8, 'right')
    right.counterAxisAlignItems = 'BASELINE'
    right.appendChild(txt('time', time))
    right.appendChild(txt('seat', seat, seat === '매진' ? C.err900 : seat.startsWith('6/') ? C.warn700 : C.pri700))
    row.appendChild(right)
    card.appendChild(row)
  }
  section.appendChild(card)
  card.x = baseX; card.y = anchor.y + 380
  made.push(card.name)
}

// ── C. 스트레스 테스트 (긴 제목 래핑 + 행길이) ──
removeOld('type-demo/스트레스')
{
  const card = vstack(12, 'type-demo/스트레스')
  card.fills = fill(C.paper)
  card.cornerRadius = 16
  card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24
  card.appendChild(txt('caption', '스트레스 테스트'))
  card.appendChild(txt('title', '고령가 소년 살인사건 4K 리마스터링 재개봉 기념 상영', null, 280))
  card.appendChild(txt('bodyStrong', '이번 주 큐레이션: 대만 뉴웨이브'))
  card.appendChild(txt('body', '에드워드 양 감독의 1991년작. 4시간에 이르는 러닝타임 동안 1960년대 타이베이의 소년들과 그 시절의 불안을 집요하게 따라간다. 상영 후 김영진 평론가의 관객과의 대화가 이어집니다. 본 상영은 인터미션이 포함되어 있습니다.', null, 280))
  card.appendChild(txt('meta', 'A Brighter Summer Day · dir. Edward Yang · 237분', null, 280))
  section.appendChild(card)
  card.x = baseX + 400; card.y = anchor.y
  made.push(card.name)
}

// 리포트
removeOld('타이포 데모 리포트')
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const rep = figma.createText()
rep.name = '타이포 데모 리포트'
rep.characters = `[타이포 데모] ${made.length}개 생성: ${made.join(', ')}\n체크포인트:\n1. 히어로 — h1 밑 meta·body 리듬, CTA 크림 글자\n2. 시간표 — title 16이 카드 제목으로 충분한가 / time·seat 베이스라인 정렬\n3. 스트레스 — 긴 제목 2줄 래핑 행간, body 280px(≈한 줄 20자) 행길이`
rep.fontSize = 12
rep.fills = fill(C.ink900)
section.appendChild(rep)
rep.x = baseX + 400; rep.y = anchor.y + 480
