// 색 입히기 가이드 — 원칙 + 팔레트 치환표 (Scripter용)
// 'TheaterSheet TOBE (Color)' 섹션 오른쪽에 가이드 프레임 생성

const SECTION_ID = '56:2709'

const P = s => ({ family: 'Pretendard', style: s })
const KIMM = { family: 'KIMM_Bold', style: 'B' }
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync(KIMM)

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const C = {
  ink: '#0C0A08', body: '#58524B', mid: '#8D8781', border: '#EAE5E1', paper: '#FAF9F8', white: '#FFFFFF',
  pri900: '#1F2747', pri700: '#404E81', pri500: '#6D7CB0', pri100: '#ECEFF9',
  warn900: '#885907', warn700: '#B9800E', warn100: '#FDF1D8',
  succ700: '#4A7C59', succ300: '#9FC6AB', succ100: '#E4F1E8',
  err900: '#9B3331', err700: '#BD4E4C', err100: '#F5E1E0',
}
const fill = h => [{ type: 'SOLID', color: hex(h) }]

const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('Color 섹션 못 찾음')
const old = section.findOne(n => n.name === '색 입히기 가이드')
if (old) old.remove()

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
const txt = (chars, font, size, color, lh, w) => {
  const t = figma.createText()
  t.fontName = font; t.characters = chars; t.fontSize = size
  if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }
  t.fills = fill(color)
  if (w) { t.textAutoResize = 'HEIGHT'; t.resize(w, 10) }
  return t
}
const swatch = (h, border) => {
  const r = figma.createRectangle()
  r.resize(20, 20); r.cornerRadius = 5
  r.fills = fill(h)
  if (border) { r.strokes = fill(C.border); r.strokeWeight = 1 }
  return r
}

// ── 루트 ──
const root = stack('VERTICAL', 28, { name: '색 입히기 가이드' })
root.fills = fill(C.white)
root.cornerRadius = 16
root.paddingLeft = root.paddingRight = 32
root.paddingTop = root.paddingBottom = 32
section.appendChild(root)
// 섹션 오른쪽 끝 위치 계산
let maxX = 0, minY = Infinity
for (const c of section.children) {
  if (c === root) continue
  maxX = Math.max(maxX, c.x + c.width)
  minY = Math.min(minY, c.y)
}
root.x = maxX + 80
root.y = minY === Infinity ? 60 : minY

const title = txt('색 입히기 가이드', KIMM, 20, C.ink, 130)
title.letterSpacing = { unit: 'PERCENT', value: 5 }
root.appendChild(title)

// ── 원칙 3 ──
const prin = stack('VERTICAL', 10, { name: '원칙' })
prin.appendChild(txt('원칙', P('Bold'), 14, C.body, 150))
const rules = [
  '1. 색은 상태와 행동에만 — 정적 정보는 뉴트럴 유지',
  '2. 한 화면에 인디고(행동·활성) + 시맨틱(상태) 외 색 금지',
  '3. 입힌 뒤 그레이스케일과 나란히 — 위계 순서가 바뀌었으면 색이 과한 것',
]
for (const r of rules) prin.appendChild(txt(r, P('Medium'), 13, C.ink, 160, 380))
root.appendChild(prin)

// ── 치환표 ──
const mkRow = (sw, label, desc, borderSw) => {
  const row = stack('HORIZONTAL', 10, { center: true })
  row.appendChild(swatch(sw, borderSw))
  const col = stack('VERTICAL', 1)
  col.appendChild(txt(label, P('SemiBold'), 12, C.ink, 140))
  col.appendChild(txt(desc, P('Regular'), 11, C.mid, 140, 330))
  row.appendChild(col)
  return row
}
const group = (name, rows) => {
  const g = stack('VERTICAL', 10, { name })
  g.appendChild(txt(name, P('Bold'), 14, C.body, 150))
  for (const r of rows) g.appendChild(r)
  return g
}

root.appendChild(group('인디고 — 행동·활성', [
  mkRow(C.pri700, 'primary/700', '오늘 셀 배경 · 포스터 선택 보더·배지 · 레일 활성 탭 · CTA'),
  mkRow(C.pri100, 'primary/100', '오늘 셀 글자(크림) · 활성 칩 틴트 배경', true),
  mkRow(C.pri900, 'primary/900', '틴트 배경 위 텍스트'),
  mkRow(C.pri500, 'primary/500', '토요일 dow·밑줄 (글자 얹기 금지)'),
]))

root.appendChild(group('시맨틱 — 상태', [
  mkRow(C.succ700, 'success/700', '"상영중" 글자 · 상영중 카드 보더는 success/300'),
  mkRow(C.warn700, 'warning/700', '잔여석 적음 — 잔여 숫자에만'),
  mkRow(C.err900, 'error/900', '"매진" 글자 · 매진 칩 배경 (겸직)'),
  mkRow(C.err700, 'error/700', '일요일 dow·밑줄'),
]))

root.appendChild(group('뉴트럴 — 손대지 않는 것', [
  mkRow(C.ink, 'neutral/900', '시간 숫자·제목 — 시간에 색 금지'),
  mkRow(C.body, 'neutral/600·500', '고스트 액션·메타 — 유틸리티는 무채색 유지'),
  mkRow(C.paper, 'surface', '종이·카드·죽은 행(상영 완료) — 죽은 것에 색 금지', true),
]))

// ── 금지 목록 ──
const ban = stack('VERTICAL', 8, { name: '금지' })
ban.appendChild(txt('금지', P('Bold'), 14, C.err900, 150))
for (const b of [
  '· 500 스탑에 글자 얹기 (전 색상 공통)',
  '· 정보 태그·주소·감독명에 색',
  '· 매진·완료 행에 채도 있는 색 (사인만 error, 나머지 딤)',
  '· 그림자에 검정 — shadow/base(#140F0A)만',
]) ban.appendChild(txt(b, P('Medium'), 12, C.ink, 155, 380))
root.appendChild(ban)
