// 2.0/Button — 사용자 Primary 수정 패턴 전파 + Size=full 추가 (2026-08-08)
// 덤프 실측(사용자 수정): 패딩 sm 16 / md 32 / lg 48 · 웨이트 sm Regular / md Medium / lg Bold. 색·상태 불변.
//  1) 전 variant(Secondary/Tertiary/TextOnly/Error, 아이콘·상태 변형 포함)에 같은 패딩·웨이트 적용
//  2) Size=full 5개 신설 — 모바일 풀폭 358(=390-거터16×2) × h52, Bold 16, Icon=none, State=default
// Scripter에서 Run.

const HEX = {
  'neutral/150': '#F3F0ED', 'neutral/200': '#EAE5E1', 'neutral/600': '#726B65',
  'neutral/700': '#58524B', 'neutral/900': '#0C0A08', 'white': '#FFFFFF',
  'primary/700': '#404E81', 'error/900': '#9B3331',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)

const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Buttons 2.0 제안 (2026-08-08)')
const set = section && section.findChild(n => n.type === 'COMPONENT_SET' && n.name === '2.0/Button')
if (!set) { figma.notify('2.0/Button 세트 없음'); throw new Error('no set') }

const PAD = { sm: 16, md: 32, lg: 48 }
const WEIGHT = { sm: 'Regular', md: 'Medium', lg: 'Bold' }
const report = []

/* ── 1. 패턴 전파 ─────────────────────────────────────────────── */
let touched = 0
for (const v of set.children) {
  const m = Object.fromEntries(v.name.split(',').map(s => s.trim().split('=')))
  const size = m.Size
  if (!PAD[size]) continue
  v.paddingLeft = PAD[size]; v.paddingRight = PAD[size]
  const texts = v.findAll(n => n.type === 'TEXT')
  for (const t of texts) {
    t.fontName = { family: 'Pretendard', style: WEIGHT[size] }
  }
  touched++
}
report.push(`패딩·웨이트 전파: ${touched}개 변형`)

/* ── 2. Size=full 신설 ───────────────────────────────────────── */
const FULL_W = 358, FULL_H = 52
const FULL_SPECS = {
  Primary:   { bg: 'primary/700', text: 'white', label: '적용하기' },
  Secondary: { bg: 'neutral/150', text: 'neutral/900', label: '지도에서 보기' },
  Tertiary:  { bg: null, text: 'neutral/700', border: 'neutral/200', label: '더보기' },
  TextOnly:  { bg: null, text: 'neutral/600', label: '건너뛰기' },
  Error:     { bg: 'error/900', text: 'white', label: '삭제' },
}
const existing = new Set(set.children.map(c => c.name))
let added = 0
// 세트 내 배치 기준: 기존 변형들 아래
let maxY = 0
for (const c of set.children) maxY = Math.max(maxY, c.y + c.height)
let fy = maxY + 40

for (const [vName, spec] of Object.entries(FULL_SPECS)) {
  const name = `Variant=${vName}, Size=full, Icon=none, State=default`
  if (existing.has(name)) { report.push(`이미 있음: ${vName} full`); continue }
  const c = figma.createComponent()
  c.name = name
  c.resize(FULL_W, FULL_H)
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.itemSpacing = 6
  c.fills = spec.bg ? [paint(spec.bg)] : []
  if (spec.border) { c.strokes = [paint(spec.border)]; c.strokeWeight = 1 }
  c.cornerRadius = 8
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style: 'Bold' }   // full = lg 패턴
  t.fontSize = 16
  t.characters = spec.label
  t.fills = [paint(spec.text)]
  c.appendChild(t)
  c.resize(FULL_W, FULL_H)
  set.appendChild(c)
  c.x = 20; c.y = fy
  fy += FULL_H + 20
  added++
}
report.push(`Size=full 추가: ${added}개 (${FULL_W}×${FULL_H}, Bold 16)`)

let props
try { props = JSON.stringify(set.variantGroupProperties) } catch (e) { props = '에러: ' + e.message }
report.push(`속성 정의: ${props}`)

const old = section.findChild(n => n.type === 'TEXT' && n.name === '패턴 전파 리포트')
if (old) old.remove()
const t = figma.createText()
t.name = '패턴 전파 리포트'
t.fontName = { family: 'Pretendard', style: 'Regular' }
t.fontSize = 12
t.characters = ['Primary 패턴 전파 + full (2026-08-08)', ...report].join('\n')
t.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.15, b: 0.1 } }]
section.appendChild(t)
t.x = 1100; t.y = 640
t.resize(560, t.height)
figma.viewport.scrollAndZoomIntoView([set])
figma.notify(`전파 ${touched} · full ${added}개 추가`)
