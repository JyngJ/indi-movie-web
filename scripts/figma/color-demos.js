// 색상 토큰 완료 섹션 — 그룹별 예시 컴포넌트 생성 (Scripter용)
// 각 색 그룹 오른쪽에 실사용 미리보기 1~2개를 만든다.
// 색은 스와치에서 실시간으로 읽음 — 값 바꾸고 재실행하면 새 데모만 다시 만들면 됨(기존 demo 프레임 지우고 Run).

const SECTION_ID = '35:184'

const fonts = await figma.listAvailableFontsAsync()
const has = (f, s) => fonts.some(x => x.fontName.family === f && x.fontName.style === s)
const F = {
  bold: has('Pretendard', 'Bold') ? { family: 'Pretendard', style: 'Bold' } : { family: 'Inter', style: 'Bold' },
  semi: has('Pretendard', 'SemiBold') ? { family: 'Pretendard', style: 'SemiBold' } : { family: 'Inter', style: 'Semi Bold' },
  med: has('Pretendard', 'Medium') ? { family: 'Pretendard', style: 'Medium' } : { family: 'Inter', style: 'Medium' },
  reg: has('Pretendard', 'Regular') ? { family: 'Pretendard', style: 'Regular' } : { family: 'Inter', style: 'Regular' },
}
for (const k of Object.keys(F)) await figma.loadFontAsync(F[k])

const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('섹션 못 찾음')
const all = section.findAll(n => true)

// ── 스와치 수집 + hue 분류 (annotate-tokens.js와 동일) ──
const cand = all.filter(n =>
  (n.type === 'RECTANGLE' || (n.type === 'FRAME' && n.children.length === 0)) &&
  n.width >= 50 && n.height >= 40 &&
  n.fills !== figma.mixed && n.fills.length && n.fills[0].type === 'SOLID' && n.fills[0].visible !== false)
const uniq = [...new Map(cand.map(n => [n.id, n])).values()]
const hslOf = n => {
  const c = n.fills[0].color
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b)
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  let h = -1
  if (max !== min) {
    if (max === c.r) h = ((c.g - c.b) / (max - min)) % 6
    else if (max === c.g) h = (c.b - c.r) / (max - min) + 2
    else h = (c.r - c.g) / (max - min) + 4
    h = Math.round(h * 60); if (h < 0) h += 360
  }
  return { h, s, l, rgb: c }
}
const groups = { grey: [], primary: [], warning: [], success: [], error: [], gv: [] }
for (const sw of uniq) {
  const { h, s, l } = hslOf(sw)
  if (l > 0.985 && s < 0.1) continue // 순백(surface/card)은 데모 그룹 제외
  const isGrey = h === -1 || s < 0.1 || (h >= 15 && h <= 60 && s < 0.45)
  if (isGrey) groups.grey.push(sw)
  else if (h >= 200 && h <= 250) groups.primary.push(sw)
  else if (h >= 255 && h <= 305) groups.gv.push(sw)
  else if (h >= 25 && h <= 55) groups.warning.push(sw)
  else if (h >= 90 && h <= 170) groups.success.push(sw)
  else if (h <= 20 || h >= 345) groups.error.push(sw)
}
for (const arr of Object.values(groups)) arr.sort((a, b) => hslOf(a).l - hslOf(b).l) // 어두운 순

// Scripter엔 createAutoLayout 없음(MCP 전용) — 순정 API 헬퍼
const mkAuto = (direction, opts = {}) => {
  const f = figma.createFrame()
  f.layoutMode = direction
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  if (opts.itemSpacing != null) f.itemSpacing = opts.itemSpacing
  if (opts.counterAxisAlignItems) f.counterAxisAlignItems = opts.counterAxisAlignItems
  if (opts.primaryAxisAlignItems) f.primaryAxisAlignItems = opts.primaryAxisAlignItems
  return f
}
const col = n => ({ type: 'SOLID', color: hslOf(n).rgb })
const txt = (chars, font, size, fill) => {
  const t = figma.createText()
  t.fontName = font; t.characters = chars; t.fontSize = size
  t.fills = [fill]
  return t
}
const pill = (label, bgFill, txFill, h, radius) => {
  const p = mkAuto('HORIZONTAL', { counterAxisAlignItems: 'CENTER' })
  p.paddingLeft = p.paddingRight = 10
  p.resize(40, h)
  p.primaryAxisSizingMode = 'AUTO'   // resize가 FIXED로 되돌리므로 재설정 (가로 hug)
  p.counterAxisSizingMode = 'FIXED'  // 세로 고정 h
  p.cornerRadius = radius
  p.fills = [bgFill]
  p.appendChild(txt(label, F.semi, 11, txFill))
  return p
}
const place = (demo, arr, name) => {
  demo.name = name
  section.appendChild(demo)
  let maxX = 0, minY = Infinity
  for (const sw of arr) {
    const x = sw.absoluteTransform[0][2] - section.x
    const y = sw.absoluteTransform[1][2] - section.y
    maxX = Math.max(maxX, x + sw.width); minY = Math.min(minY, y)
  }
  demo.x = maxX + 60; demo.y = minY
}
const exists = name => all.some(n => n.name === name)
const made = []

// ── grey: 텍스트 위계 카드 ──
if (groups.grey.length >= 9 && !exists('demo/grey')) {
  const g = groups.grey // 0=900 ... 8=100
  const card = mkAuto('VERTICAL', { itemSpacing: 6 })
  card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 16
  card.cornerRadius = 12
  card.fills = [col(g[8])]
  card.strokes = [col(g[7])]; card.strokeWeight = 1
  card.appendChild(txt('중경삼림', F.bold, 17, col(g[0])))
  card.appendChild(txt('왕가위 · 1994 · 102분', F.reg, 13, col(g[2])))
  card.appendChild(txt('오늘 19:30 · 에무시네마', F.med, 12, col(g[4])))
  place(card, g, 'demo/grey')
  made.push('demo/grey (텍스트 위계 카드)')
}

// ── primary: 버튼 + 활성 칩 ──
if (groups.primary.length >= 9 && !exists('demo/primary')) {
  const p = groups.primary // 0=900 ... 8=100
  const wrap = mkAuto('VERTICAL', { itemSpacing: 10 })
  const btn = mkAuto('HORIZONTAL', { counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: 'CENTER' })
  btn.paddingLeft = btn.paddingRight = 20
  btn.resize(60, 44)
  btn.primaryAxisSizingMode = 'AUTO'
  btn.counterAxisSizingMode = 'FIXED'
  btn.cornerRadius = 8
  btn.fills = [col(p[2])]
  btn.appendChild(txt('예매하기', F.semi, 14, col(p[8])))
  wrap.appendChild(btn)
  const chip = pill('독립영화관', col(p[8]), col(p[0]), 32, 9999)
  chip.strokes = [col(p[2])]; chip.strokeWeight = 1
  wrap.appendChild(chip)
  wrap.fills = []
  place(wrap, p, 'demo/primary')
  made.push('demo/primary (버튼+활성 칩)')
}

// ── 시맨틱 공통: 솔리드 배지 + 틴트 배지 ──
// [그룹, 라벨, 솔리드 스탑 idx(어두운순), 텍스트 스탑 idx]
const semDefs = [
  ['warning', '잔여석 적음', 1, 0], // 솔리드=700, 틴트글자=900
  ['success', '상영중', 1, 0],
  ['error', '매진', 0, 0],          // 솔리드=900(L40 겸직)
  ['gv', 'GV', 1, 0],
]
for (const [key, label, solidIdx, textIdx] of semDefs) {
  const arr = groups[key]
  if (arr.length < 5 || exists('demo/' + key)) continue
  const tint = arr[arr.length - 1]  // 100
  const wrap = mkAuto('VERTICAL', { itemSpacing: 8 })
  wrap.fills = []
  wrap.appendChild(pill(label, col(arr[solidIdx]), col(tint), 24, 4))       // 솔리드 + 크림 글자
  wrap.appendChild(pill(label, col(tint), col(arr[textIdx]), 24, 4))        // 틴트 + 900 글자
  place(wrap, arr, 'demo/' + key)
  made.push(`demo/${key} (솔리드+틴트 배지)`)
}

console.log(made.length ? made.join('\n') : '새로 만든 것 없음 (이미 존재하거나 그룹 미완성)')
console.log('그룹별 스와치 수:', Object.entries(groups).map(([k, v]) => `${k}:${v.length}`).join(' '))
