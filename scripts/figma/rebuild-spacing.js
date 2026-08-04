// spacing 섹션의 Spacing 프레임을 2.0 스케일로 재구성 (Scripter용)
// 스케일: 4 8 12 16 24 32 48 64 96 128 (20·40 삭제 — 인접 수렴)
// 네이밍: spacing/n = n×4px 규칙 유지

const FRAME_ID = '42:1054'

const P = s => ({ family: 'Pretendard', style: s })
for (const s of ['Medium', 'Regular', 'Bold']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const INK = hex('#0C0A08'), MID = hex('#8D8781'), BAR = hex('#404E81')

const frame = await figma.getNodeByIdAsync(FRAME_ID)
if (!frame) throw new Error('Spacing 프레임(42:1054) 못 찾음')
for (const c of [...frame.children]) c.remove()
frame.name = 'Spacing 2.0'
frame.layoutMode = 'VERTICAL'
frame.primaryAxisSizingMode = 'AUTO'; frame.counterAxisSizingMode = 'AUTO'
frame.itemSpacing = 10
frame.fills = []

const title = figma.createText()
title.fontName = { family: 'KIMM_Bold', style: 'B' }
title.characters = 'Spacing 2.0'
title.fontSize = 20
title.lineHeight = { unit: 'PERCENT', value: 130 }
title.letterSpacing = { unit: 'PERCENT', value: 5 }
title.fills = [{ type: 'SOLID', color: INK }]
frame.appendChild(title)

const intro = figma.createText()
intro.fontName = P('Regular')
intro.characters = 'n = px÷4 · 인접 차 ≥33% · 20/40 삭제(16·24/32·48로 수렴)'
intro.fontSize = 11
intro.fills = [{ type: 'SOLID', color: MID }]
frame.appendChild(intro)

// [토큰명, px, 용도]
const STEPS = [
  ['spacing/1', 4, '칩·배지 내부, 아이콘-글자 사이'],
  ['spacing/2', 8, '요소 간 기본 간격'],
  ['spacing/3', 12, '카드 내부 요소 사이'],
  ['spacing/4', 16, '카드 패딩, 거터'],
  ['spacing/6', 24, '카드 내부 그룹 사이'],
  ['spacing/8', 32, '카드 사이, 큰 패딩'],
  ['spacing/12', 48, '섹션 사이'],
  ['spacing/16', 64, '큰 섹션 사이, 화면 상하'],
  ['spacing/24', 96, '히어로 위아래'],
  ['spacing/32', 128, '특대 — 엠티 스테이트·랜딩'],
]
for (const [name, px, usage] of STEPS) {
  const row = figma.createFrame()
  row.name = name
  row.layoutMode = 'HORIZONTAL'
  row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO'
  row.counterAxisAlignItems = 'CENTER'
  row.itemSpacing = 12
  row.fills = []
  const bar = figma.createRectangle()
  bar.resize(px * 3, 14)
  bar.cornerRadius = 2
  bar.fills = [{ type: 'SOLID', color: BAR }]
  row.appendChild(bar)
  const l = figma.createText()
  l.fontName = P('Medium')
  l.characters = `${name} · ${px}px`
  l.fontSize = 12
  l.fills = [{ type: 'SOLID', color: INK }]
  row.appendChild(l)
  const u = figma.createText()
  u.fontName = P('Regular')
  u.characters = usage
  u.fontSize = 11
  u.fills = [{ type: 'SOLID', color: MID }]
  row.appendChild(u)
  frame.appendChild(row)
}
