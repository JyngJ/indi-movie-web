// 공유 카드 최종 반영 — 코드 역싱크 (2026-08-12, PR #265 / 커밋 6c03c68)
// '공유 카드' 섹션의 기존 5장을 손대지 않고, 오른쪽 새 열에 최종본 5장을 만든다.
// 확인하고 기존 열을 지울 것.
//
// 마지막 덤프(04:14) 대비 바뀐 것 셋:
//  1. 워드마크가 카드 아래 '가운데'. 여백 60(카드 패딩과 동일).
//     흐름에서 빼서 놓는다 — 흐름에 넣으면 포스터 340×510(2:3 고정)을 깎아야 한다.
//     피그마에선 absoluteBoundingBox가 없으니 layoutPositioning='ABSOLUTE'로 같은 결과를 만든다.
//  2. 회차 셀이 info 밖 형제이고 폭은 콘텐츠 열을 꽉 채운다 (영화 640 / 극장·감독 1040).
//  3. 극장 회차 카드에도 회차 셀이 붙는다 — 같은 ?showtime= 링크를 받는데 한쪽만
//     회차를 보여줄 이유가 없어서.
//
// 시각 자간은 px 정수 4 (satori가 em을 못 읽어 코드가 px로 준다 — 피그마도 같은 값으로 맞춘다).
//
// Scripter에서 Run.

/* ── 색: 2.0 컬렉션 변수 바인딩. 리터럴은 폴백 ── */
const HEX = {
  'neutral/100': '#FAF9F8',  // 카드 배경 (surface/bg)
  'neutral/200': '#EAE5E1',  // 포스터 자리 · 셀 보더
  'neutral/400': '#A7A19A',  // 매진 좌석
  'neutral/500': '#8D8781',  // 종료 시각
  'neutral/600': '#726B65',  // 메타 · "/N석"
  'neutral/800': '#2B2622',  // 셀 시각
  'neutral/900': '#0C0A08',  // 제목
  'primary/100': '#ECEFF9',  // 칩 배경
  'primary/700': '#404E81',  // 워드마크 · 잔여석
  'primary/900': '#1F2747',  // 칩 텍스트
  'warning/700': '#B9800E',  // 잔여 10% 이하 좌석
  'white': '#FFFFFF',        // 셀 면 (surface/card)
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
const missing = []
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  if (!v) missing.push(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}

const KIMM = { family: 'KIMM_Bold', style: 'B' }
const PRE = (style) => ({ family: 'Pretendard', style })
for (const f of [KIMM, PRE('Regular'), PRE('SemiBold'), PRE('Bold')]) await figma.loadFontAsync(f)

await figma.loadAllPagesAsync()

/* ── 워드마크 컴포넌트 ── */
async function findWordmarkComponent() {
  const sets = figma.root.findAll((n) => n.type === 'COMPONENT_SET' && n.name === '2.0/logo/wordmark')
  if (sets.length) return sets[0].defaultVariant || sets[0].children.find((c) => c.type === 'COMPONENT')
  return figma.root.findAll((n) => n.type === 'COMPONENT' && n.name === '2.0/logo/wordmark')[0] || null
}
const wordmarkComponent = await findWordmarkComponent()
if (!wordmarkComponent) console.log('⚠ 2.0/logo/wordmark 컴포넌트를 못 찾음 — 워드마크 없이 그린다')

/* ── 헬퍼 ── */
function frame(name, { dir = 'VERTICAL', gap = 0, pad = [0, 0, 0, 0], fill = null } = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = dir
  f.itemSpacing = gap
  f.paddingTop = pad[0]; f.paddingRight = pad[1]; f.paddingBottom = pad[2]; f.paddingLeft = pad[3]
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.fills = fill ? [paint(fill)] : []
  return f
}
function text(chars, { font = PRE('Regular'), size = 16, color = 'neutral/900', lh = null, ls = null } = {}) {
  const t = figma.createText()
  t.fontName = font
  t.characters = chars
  t.fontSize = size
  t.fills = [paint(color)]
  if (lh) t.lineHeight = { value: lh, unit: 'PERCENT' }
  if (ls) t.letterSpacing = { value: ls, unit: 'PIXELS' }   // 코드가 px 정수로 준다
  return t
}
function chip(label, { size = 16, padV = 3, padH = 12 } = {}) {
  const c = frame(`chip · ${label}`, { dir: 'HORIZONTAL', pad: [padV, padH, padV, padH], fill: 'primary/100' })
  c.cornerRadius = 6
  c.appendChild(text(label, { font: PRE('SemiBold'), size, color: 'primary/900' }))
  return c
}
const title = (chars, size) => text(chars, { font: KIMM, size, color: 'neutral/900', lh: 110 })
function metaRow(parts) {
  const row = frame('meta', { dir: 'HORIZONTAL', gap: 12 })
  for (const p of parts) row.appendChild(text(p, { size: 22, color: 'neutral/600' }))
  return row
}

/**
 * 회차 셀 — r16 · 흰 면 · 보더 neutral/200 · padding 32 · gap 4.
 * 시각 KIMM 48(자간 4px) / 종료 24 / 좌석 Bold 32.
 * 좌석 색은 코드와 같은 규칙: 매진 neutral/400 · 잔여 10% 이하 warning/700 · 그 외 primary/700.
 */
function showtimeCell({ time, endTime, seatAvailable, seatTotal }) {
  const soldout = seatAvailable <= 0
  const low = !soldout && seatTotal > 0 && seatAvailable / seatTotal <= 0.1
  const seatColor = soldout ? 'neutral/400' : low ? 'warning/700' : 'primary/700'

  const cell = frame('2.0/ShowtimeCell · og', { dir: 'VERTICAL', gap: 4, pad: [32, 32, 32, 32], fill: 'white' })
  cell.cornerRadius = 16
  cell.strokes = [paint('neutral/200')]
  cell.strokeWeight = 1

  cell.appendChild(text(time, { font: KIMM, size: 48, color: 'neutral/800', lh: 125, ls: 4 }))
  if (endTime) cell.appendChild(text(`-${endTime}`, { size: 24, color: 'neutral/500', lh: 150 }))
  if (seatTotal > 0) {
    const seats = frame('seats', { dir: 'HORIZONTAL', gap: 0 })
    seats.appendChild(text(String(seatAvailable), { font: PRE('Bold'), size: 32, color: seatColor, lh: 150 }))
    seats.appendChild(text(`/${seatTotal}석`, { font: PRE('Bold'), size: 32, color: 'neutral/600', lh: 150 }))
    cell.appendChild(seats)
  }
  return cell
}

/** 카드 아래 가운데 워드마크 — 흐름 밖(ABSOLUTE), 아래 60 */
function attachWordmark(card) {
  if (!wordmarkComponent) return
  const inst = wordmarkComponent.createInstance()
  inst.name = '2.0/logo/wordmark'
  for (const n of inst.findAll((n) => 'fills' in n && Array.isArray(n.fills) && n.fills.length)) {
    n.fills = [paint('primary/700')]
  }
  card.appendChild(inst)
  inst.layoutPositioning = 'ABSOLUTE'          // 자동 레이아웃에서 빼낸다
  inst.x = card.x + (1200 - inst.width) / 2    // 가로 가운데
  inst.y = card.y + 630 - 60 - inst.height     // 아래 60
}

/* ── 카드 껍데기 ── */
function stackCard(name, infoChildren, cell) {
  const c = frame(name, { dir: 'VERTICAL', gap: 12, pad: [60, 80, 60, 80], fill: 'neutral/100' })
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.resize(1200, 630)
  c.clipsContent = true

  const info = frame('info', { dir: 'VERTICAL', gap: 12 })
  c.appendChild(info)
  for (const child of infoChildren) {
    info.appendChild(child)
    if (child.name && child.name.startsWith('chip')) child.layoutAlign = 'MIN'
  }
  if (cell) {
    c.appendChild(cell)
    cell.layoutAlign = 'STRETCH'   // 콘텐츠 열 꽉 (1040)
  }
  return c
}

function movieCard(name, infoChildren, cell) {
  const c = frame(name, { dir: 'HORIZONTAL', gap: 60, pad: [60, 80, 60, 80], fill: 'neutral/100' })
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.resize(1200, 630)
  c.clipsContent = true

  const poster = frame('poster (340×510 · 실제는 원격 이미지)', { dir: 'VERTICAL', fill: 'neutral/200' })
  poster.primaryAxisSizingMode = 'FIXED'
  poster.counterAxisSizingMode = 'FIXED'
  poster.resize(340, 510)
  poster.cornerRadius = 16
  poster.primaryAxisAlignItems = 'CENTER'
  poster.counterAxisAlignItems = 'CENTER'
  c.appendChild(poster)
  poster.appendChild(text('poster', { size: 20, color: 'neutral/600' }))

  const col = frame('text', { dir: 'VERTICAL', gap: 12 })
  c.appendChild(col)
  col.layoutGrow = 1
  col.layoutSizingVertical = 'FILL'   // appendChild 뒤에만 먹는다

  const info = frame('info', { dir: 'VERTICAL', gap: 12 })
  col.appendChild(info)
  for (const child of infoChildren) {
    info.appendChild(child)
    if (child.name && child.name.startsWith('chip')) child.layoutAlign = 'MIN'
  }
  if (cell) {
    col.appendChild(cell)
    cell.layoutAlign = 'STRETCH'   // 텍스트 열 꽉 (640)
  }
  return c
}

/* ── 카드 5장 ── */
const SAMPLE = { time: '08:00', endTime: '09:58', seatAvailable: 163, seatTotal: 166 }
const cards = []

{
  const genres = frame('genres', { dir: 'HORIZONTAL', gap: 8 })
  genres.appendChild(chip('드라마'))
  genres.appendChild(chip('다큐멘터리'))
  cards.push(movieCard('OG · 영화 상세 (/films/movie/[id])', [
    genres, title('가능주의자', 72), metaRow(['박이윤정 감독', '·', '2025']),
  ]))
}

cards.push(movieCard('OG · 영화 상세 · 회차 (?showtime=)', [
  chip('8월 12일(수)', { size: 18, padV: 4, padH: 14 }),
  title('오케이 마담2', 72),
  metaRow(['08:00', '·', '제천시네마']),
], showtimeCell(SAMPLE)))

cards.push(stackCard('OG · 극장 상세 (/films/theater/[id])', [
  chip('전라남도', { size: 18, padV: 4, padH: 14 }),
  title('목포아트시네마', 80),
  metaRow(['전라남도 목포시 영산로59번길 30']),
]))

cards.push(stackCard('OG · 극장 상세 · 회차 (?showtime=)', [
  chip('8월 12일(수)', { size: 18, padV: 4, padH: 14 }),
  title('제천시네마', 80),
  metaRow(['08:00', '·', '오케이 마담2']),
], showtimeCell(SAMPLE)))

cards.push(stackCard('OG · 감독 상세 (/films/director/[name])', [
  chip('감독', { size: 18, padV: 4, padH: 14 }),
  title('존 포드', 80),
  metaRow(['리버티 밸런스를 쏜 사나이 (1962) · 기병대 (1959) · 수색자 (1956)']),
]))

/* ── 배치: 기존 열(x=245) 오른쪽 ── */
const workPage = figma.root.children.find((p) => p.name === 'Design System - work') || figma.currentPage
await figma.setCurrentPageAsync(workPage)

const COL_X = 1560   // 기존 열 x=245 + 1200 + 여백 115
let y = 285
for (const c of cards) {
  workPage.appendChild(c)
  c.x = COL_X
  c.y = y
  attachWordmark(c)   // x·y가 정해진 뒤에 붙여야 절대 좌표가 맞는다
  y += 630 + 80
}

const noteTitle = text('공유 카드 — 최종 (코드 역싱크 2026-08-12 · PR #265)', { font: KIMM, size: 24, color: 'neutral/900', lh: 125 })
workPage.appendChild(noteTitle)
noteTitle.x = COL_X; noteTitle.y = 195

console.log([
  `공유 카드 최종본 ${cards.length}장 생성 (x=${COL_X}). 기존 열(x=245)은 그대로 뒀다 — 비교 후 지울 것.`,
  missing.length ? `⚠ 컬러 변수 없어 리터럴로 칠한 것: ${[...new Set(missing)].join(', ')}` : '색 전부 변수 바인딩 완료.',
].join('\n'))
