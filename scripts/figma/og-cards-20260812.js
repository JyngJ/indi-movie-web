// 공유 미리보기(OG) 카드 — 코드 역싱크 (2026-08-12, 커밋 a8c9fbb)
// src/lib/og/cards.tsx 를 그대로 옮긴 1200×630 카드 3종(영화·극장·감독)을
// 새 페이지 "OG 카드 (2026-08-12)" 에 만든다. Scripter에서 Run.
//
// 색 근거: 배경 #191714 · 본문 #F7F4F0 은 이 파일의 2.0/logo/og 실측값이고,
// 나머지는 2.0 램프(neutral/400·500·800, primary/200·900)만 썼다 — 다크 면 위 대비 4.5:1 이상.
// 포스터는 원격 이미지라 자리표시 사각형으로 둔다(실제 카드에선 280×420 포스터).

const HEX = {
  'neutral/400': '#A7A19A',
  'neutral/500': '#8D8781',
  'neutral/800': '#2B2622',
  'primary/200': '#C4CCE9',
  'primary/900': '#1F2747',
}
const OG_BG = '#191714'   // 2.0/logo/og 배경 (변수 없음 — 리터럴)
const OG_FG = '#F7F4F0'   // 2.0/logo/og 워드마크 (변수 없음 — 리터럴)

const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
/** 램프 이름이면 변수 바인딩, 리터럴 hex면 그대로 */
function paint(nameOrHex) {
  const hex = HEX[nameOrHex] || nameOrHex
  const solid = { type: 'SOLID', color: rgb(hex) }
  const v = varByName.get(nameOrHex)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}

const KIMM = { family: 'KIMM_Bold', style: 'B' }
const PRE = (style) => ({ family: 'Pretendard', style })
for (const f of [KIMM, PRE('Regular'), PRE('Medium'), PRE('SemiBold'), PRE('Bold')]) await figma.loadFontAsync(f)

/* ── 헬퍼 ───────────────────────────────────────────────────────── */
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

function text(chars, { font = PRE('Regular'), size = 16, color = OG_FG, lh = null, ls = null } = {}) {
  const t = figma.createText()
  t.fontName = font
  t.characters = chars
  t.fontSize = size
  t.fills = [paint(color)]
  if (lh) t.lineHeight = { value: lh, unit: 'PERCENT' }
  if (ls) t.letterSpacing = { value: ls, unit: 'PERCENT' }
  return t
}

/** 라운드 칩 — 코드의 [장르/도시/감독] 칩. r6 · primary/900 위 primary/200 */
function chip(label, { size = 16, padV = 3, padH = 12 } = {}) {
  const c = frame(`chip · ${label}`, { dir: 'HORIZONTAL', pad: [padV, padH, padV, padH], fill: 'primary/900' })
  c.cornerRadius = 6
  c.appendChild(text(label, { font: PRE('SemiBold'), size, color: 'primary/200' }))
  return c
}

/** 상단 브랜드 줄 — [영화볼지도 · 독립·예술영화관 상영 정보] */
function brandLine() {
  const row = frame('brand', { dir: 'HORIZONTAL', gap: 10 })
  row.counterAxisAlignItems = 'CENTER'
  row.appendChild(text('영화볼지도', { font: KIMM, size: 22, color: OG_FG, ls: 5 }))
  row.appendChild(text('·', { size: 22, color: 'neutral/800' }))
  row.appendChild(text('독립·예술영화관 상영 정보', { size: 20, color: 'neutral/400' }))
  return row
}

/** 하단 도메인 줄 — 위쪽 1px neutral/800 구분선 */
function footerLine(width) {
  const wrap = frame('footer', { dir: 'VERTICAL', gap: 20 })
  const rule = figma.createRectangle()
  rule.resize(width, 1)
  rule.fills = [paint('neutral/800')]
  wrap.appendChild(rule)
  wrap.appendChild(text('영화볼지도.com', { size: 16, color: 'neutral/500' }))
  return wrap
}

/** 1200×630 카드 껍데기 — bg #191714 · padding 60/80 */
function card(name) {
  const c = frame(name, { dir: 'VERTICAL', pad: [60, 80, 60, 80], fill: OG_BG })
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.resize(1200, 630)
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'
  c.clipsContent = true
  return c
}

/* ── 카드 1: 영화 상세 ──────────────────────────────────────────── */
function movieCard() {
  const outer = figma.createFrame()
  outer.name = 'OG · 영화 상세 (/films/movie/[id])'
  outer.layoutMode = 'HORIZONTAL'
  outer.primaryAxisSizingMode = 'FIXED'
  outer.counterAxisSizingMode = 'FIXED'
  outer.resize(1200, 630)
  outer.paddingTop = 60; outer.paddingBottom = 60; outer.paddingLeft = 80; outer.paddingRight = 80
  outer.itemSpacing = 60
  outer.fills = [paint(OG_BG)]
  outer.clipsContent = true

  // 포스터 자리 — 실제 카드는 원격 poster_url 280×420, r16
  const poster = frame('poster (280×420 · 실제는 원격 이미지)', { dir: 'VERTICAL', fill: 'neutral/800' })
  poster.primaryAxisSizingMode = 'FIXED'
  poster.counterAxisSizingMode = 'FIXED'
  poster.resize(280, 420)
  poster.cornerRadius = 16
  poster.primaryAxisAlignItems = 'CENTER'
  poster.counterAxisAlignItems = 'CENTER'
  outer.appendChild(poster)
  poster.layoutAlign = 'CENTER'
  poster.appendChild(text('poster', { size: 20, color: 'neutral/500' }))

  const col = frame('text', { dir: 'VERTICAL', pad: [20, 0, 20, 0] })
  outer.appendChild(col)
  col.layoutGrow = 1
  col.layoutSizingVertical = 'FILL'
  col.primaryAxisAlignItems = 'SPACE_BETWEEN'

  col.appendChild(brandLine())

  const mid = frame('info', { dir: 'VERTICAL', gap: 12 })
  const chips = frame('genres', { dir: 'HORIZONTAL', gap: 8 })
  for (const g of ['드라마', '다큐멘터리']) chips.appendChild(chip(g))
  mid.appendChild(chips)
  mid.appendChild(text('가능주의자', { font: KIMM, size: 72, color: OG_FG, lh: 110 }))
  mid.appendChild(text('Cando-ist (Ganeungjuuija)', { size: 20, color: 'neutral/500' }))
  const meta = frame('meta', { dir: 'HORIZONTAL', gap: 12 })
  meta.appendChild(text('박이윤정 감독', { size: 22, color: 'neutral/400' }))
  meta.appendChild(text('·', { size: 22, color: 'neutral/400' }))
  meta.appendChild(text('2025', { size: 22, color: 'neutral/400' }))
  mid.appendChild(meta)
  col.appendChild(mid)

  col.appendChild(footerLine(780))
  return outer
}

/* ── 카드 2: 극장 상세 ──────────────────────────────────────────── */
function theaterCard() {
  const c = card('OG · 극장 상세 (/films/theater/[id])')
  c.appendChild(brandLine())

  const mid = frame('info', { dir: 'VERTICAL', gap: 12 })
  const cityChip = chip('전라남도', { size: 18, padV: 4, padH: 14 })
  mid.appendChild(cityChip)
  cityChip.layoutAlign = 'MIN'  // 칩이 가로로 늘어나지 않게 — 코드에선 alignSelf:flex-start
  mid.appendChild(text('목포아트시네마', { font: KIMM, size: 80, color: OG_FG, lh: 110 }))
  mid.appendChild(text('전라남도 목포시 영산로59번길 30', { size: 22, color: 'neutral/400' }))
  c.appendChild(mid)

  c.appendChild(footerLine(1040))
  return c
}

/* ── 카드 3: 감독 상세 ──────────────────────────────────────────── */
function directorCard() {
  const c = card('OG · 감독 상세 (/films/director/[name])')
  c.appendChild(brandLine())

  const mid = frame('info', { dir: 'VERTICAL', gap: 12 })
  const roleChip = chip('감독', { size: 18, padV: 4, padH: 14 })
  mid.appendChild(roleChip)
  roleChip.layoutAlign = 'MIN'
  mid.appendChild(text('존 포드', { font: KIMM, size: 80, color: OG_FG, lh: 110 }))
  mid.appendChild(text('리버티 밸런스를 쏜 사나이 (1962) · 기병대 (1959) · 수색자 (1956)', { size: 22, color: 'neutral/400' }))
  c.appendChild(mid)

  c.appendChild(footerLine(1040))
  return c
}

/* ── 페이지 조립 ────────────────────────────────────────────────── */
const page = figma.createPage()
page.name = 'OG 카드 (2026-08-12)'
await figma.setCurrentPageAsync(page)

const title = text('공유 미리보기 OG 카드 — 코드 역싱크 2026-08-12', { font: KIMM, size: 24, color: '#1A1714', lh: 125 })
page.appendChild(title)
title.x = 80; title.y = 80

const note = text(
  [
    '· src/lib/og/cards.tsx 렌더러를 그대로 옮긴 것. 실제 이미지는 satori가 1200×630 PNG로 굽는다.',
    '· 라우트: /films/movie/[id] · /films/theater/[id] · /films/director/[name] (레거시 /movie·/theater도 같은 렌더러 위임).',
    '· 배경 #191714 · 본문 #F7F4F0 은 2.0/logo/og 실측. 나머지는 2.0 램프만 — 다크 면 위 대비 4.5:1 이상.',
    '· 이 카드들은 피그마 원본이 없던 화면이다(브랜드 og만 있었음). 규격을 확정하려면 여기서 고치고 다시 역싱크할 것.',
  ].join('\n'),
  { size: 16, color: '#58524B', lh: 160 },
)
page.appendChild(note)
note.x = 80; note.y = 130

const cards = [movieCard(), theaterCard(), directorCard()]
let y = 260
for (const c of cards) {
  page.appendChild(c)
  c.x = 80; c.y = y
  y += 630 + 80
}

figma.currentPage.selection = cards
figma.viewport.scrollAndZoomIntoView(cards)
console.log(`OG 카드 ${cards.length}장 생성 — 페이지 "${page.name}"`)
