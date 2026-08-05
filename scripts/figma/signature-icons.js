// 시그니처 아이콘 후보 스케치 (Scripter용)
// Iconography 섹션에 'Signature 후보' 구역 생성 — 불리언 연산으로 24px 그리드에 제작
//   pin-ticket:  티켓 모양 지도 핀 (모서리 노치)
//   pin-film:    필름 퍼포레이션 핀 (사각 구멍 2개)
//   tab-ticket:  상영작 탭 후보 — 티켓 (절취선)
// 전부 filled 단일 glyph — 기존 아이콘과 같은 스왑 호환 구조

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' })

const INK = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]
// 배치 기준: 기존 아이콘들 아래
let baseY = 150
for (const c of section.children) { if (c.type === 'COMPONENT') baseY = Math.max(baseY, c.y + 60) }
baseY += 40
const label = (chars, x, y, big) => {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style: big ? 'Medium' : 'Regular' }
  t.characters = chars
  t.fontSize = big ? 13 : 10
  t.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.53, b: 0.5 } }]
  section.appendChild(t)
  t.x = x; t.y = y
}
label('Signature 후보 — KIMM 문법(직선+굴림), 필름·티켓 모티프', 48, baseY, true)
baseY += 32

const rect = (x, y, w, h, r) => {
  const n = figma.createRectangle()
  n.resize(w, h); n.cornerRadius = r || 0
  n.x = x; n.y = y; n.fills = INK
  return n
}
const circle = (x, y, d) => {
  const n = figma.createEllipse()
  n.resize(d, d); n.x = x; n.y = y; n.fills = INK
  return n
}
const finish = (node, name, desc, x) => {
  node.resize(24, 24)
  const comp = figma.createComponentFromNode(node)
  comp.name = '2.0/icon/' + name
  comp.description = desc
  comp.x = x; comp.y = baseY
  label(name, x, baseY + 32)
  return comp
}
const remove = old => { const o = section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/' + old); if (o) o.remove() }

// ── 1. pin-ticket: 둥근 사각 티켓 + 아래 꼭지 + 좌우 노치 ──
remove('sig-pin-ticket')
{
  const body = rect(3, 2, 18, 15, 4)
  const tip = figma.createPolygon()
  tip.pointCount = 3
  tip.resize(8, 6)
  tip.rotation = 180
  tip.x = 16; tip.y = 23 // 회전 보정 위치
  tip.fills = INK
  section.appendChild(body); section.appendChild(tip)
  const union = figma.union([body, tip], section)
  const n1 = circle(0.5, 7.5, 5)  // 좌 노치
  const n2 = circle(18.5, 7.5, 5) // 우 노치
  section.appendChild(n1); section.appendChild(n2)
  const cut = figma.subtract([n1, n2, union], section)
  cut.name = 'glyph'
  const wrap = figma.createFrame()
  wrap.resize(24, 24); wrap.fills = []
  section.appendChild(wrap)
  wrap.appendChild(cut)
  cut.x = 0; cut.y = 0
  finish(wrap, 'sig-pin-ticket', '지도 핀 후보 A — 티켓 노치. Lucide map-pin과 대조', 48)
}

// ── 2. pin-film: 원형 핀 + 필름 퍼포레이션 구멍 ──
remove('sig-pin-film')
{
  const head = circle(3, 2, 18)
  const tip = figma.createPolygon()
  tip.pointCount = 3
  tip.resize(10, 8)
  tip.rotation = 180
  tip.x = 17; tip.y = 24
  tip.fills = INK
  section.appendChild(head); section.appendChild(tip)
  const union = figma.union([head, tip], section)
  const h1 = rect(8, 7, 3.2, 3.2, 0.8)
  const h2 = rect(13, 7, 3.2, 3.2, 0.8)
  const h3 = rect(8, 12, 3.2, 3.2, 0.8)
  const h4 = rect(13, 12, 3.2, 3.2, 0.8)
  for (const h of [h1, h2, h3, h4]) section.appendChild(h)
  const cut = figma.subtract([h1, h2, h3, h4, union], section)
  cut.name = 'glyph'
  const wrap = figma.createFrame()
  wrap.resize(24, 24); wrap.fills = []
  section.appendChild(wrap)
  wrap.appendChild(cut)
  cut.x = 0; cut.y = 0
  finish(wrap, 'sig-pin-film', '지도 핀 후보 B — 필름 퍼포레이션', 168)
}

// ── 3. tab-ticket: 티켓 (좌우 노치 + 절취선) ──
remove('sig-tab-ticket')
{
  const body = rect(2, 5, 20, 14, 3)
  section.appendChild(body)
  const n1 = circle(-2.5, 9.5, 5)
  const n2 = circle(21.5, 9.5, 5)
  section.appendChild(n1); section.appendChild(n2)
  // 절취선: 작은 사각 3개
  const d1 = rect(11.2, 7.5, 1.6, 2, 0.8)
  const d2 = rect(11.2, 11, 1.6, 2, 0.8)
  const d3 = rect(11.2, 14.5, 1.6, 2, 0.8)
  for (const d of [d1, d2, d3]) section.appendChild(d)
  const cut = figma.subtract([n1, n2, d1, d2, d3, body], section)
  cut.name = 'glyph'
  const wrap = figma.createFrame()
  wrap.resize(24, 24); wrap.fills = []
  section.appendChild(wrap)
  wrap.appendChild(cut)
  cut.x = 0; cut.y = 0
  finish(wrap, 'sig-tab-ticket', '상영작 탭 후보 — 티켓. clapperboard·film과 대조', 288)
}

console.log('시그니처 후보 3종 생성: sig-pin-ticket / sig-pin-film / sig-tab-ticket\n대조 방법: 탭바·핀 자리에 스왑해보고 판정')
