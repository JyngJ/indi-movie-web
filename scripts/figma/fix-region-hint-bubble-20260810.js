// 2.0/RegionHintBubble 코드 정합 (2026-08-10)
//  소스: src/components/domain/FilterBar.tsx · src/app/(tabs)/films/FilmsClient.tsx
//
//  덤프 대조로 나온 차이만 골라 고친다. 각 단계는 독립적으로 try/catch —
//  하나가 실패해도 나머지는 진행하고, 무엇을 고쳤고 무엇이 실패했는지 콘솔에 남긴다.
//   1. 스타일 신설: 2.0/shadow/popover (코드 --shadow-popover), 2.0/note (코드 .text-note)
//   2. 그림자 shadow/md → shadow/popover
//   3. 핀 아이콘 glyph primary/100 → 흰색
//   4. 닫기 면 불투명 흰색 → 흰색 20%
//   5. 닫기 × glyph primary/500 → 흰색
//   6. 문구 스타일 caption(행간 140%) → note(155%)
//   7. 꼬리(11×11 r4 rotate45) 추가 — 코드는 항상 꼬리와 함께 뜬다
// Scripter에서 Run.

const done = []
const failed = []
async function step(label, fn) {
  try { const r = await fn(); done.push(label + (r ? ` — ${r}` : '')) }
  catch (e) { failed.push(`${label}: ${String(e && e.message || e)}`) }
}

const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

/* 2.0 색 변수 */
const colorVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.resolvedType === 'COLOR') colorVar.set(v.name, v)
  }
}
function paint(name, hex, opacity) {
  const solid = { type: 'SOLID', color: rgb(hex) }
  if (opacity != null) solid.opacity = opacity
  const v = colorVar.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}

for (const page of figma.root.children) await page.loadAsync()

/* 컴포넌트 — 같은 이름의 라벨 텍스트가 있으니 COMPONENT 타입만 */
let comp = null
for (const page of figma.root.children) {
  const hit = page.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/RegionHintBubble')
  if (hit) { comp = hit; break }
}
if (!comp) {
  figma.notify('2.0/RegionHintBubble 컴포넌트를 못 찾음')
} else {

/* ── 1. 스타일 신설 ─────────────────────────────────────────── */
let popoverStyle = (await figma.getLocalEffectStylesAsync()).find(s => s.name === '2.0/shadow/popover')
await step('2.0/shadow/popover 스타일', async () => {
  if (popoverStyle) return '이미 있음'
  const st = figma.createEffectStyle()
  st.name = '2.0/shadow/popover'
  st.description = '액센트 면 위 툴팁 전용. 웜 중성 그림자는 primary 면에서 탁해 보여 면과 같은 한류 계열로 띄운다. 코드 --shadow-popover'
  st.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 40 / 255, g: 55 / 255, b: 75 / 255, a: 0.34 },
    offset: { x: 0, y: 10 },
    radius: 28,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }]
  popoverStyle = st
  return '신설'
})

let noteStyle = (await figma.getLocalTextStylesAsync()).find(s => s.name === '2.0/note')
await step('2.0/note 텍스트 스타일', async () => {
  if (noteStyle) return '이미 있음'
  const font = { family: 'Pretendard', style: 'Medium' }
  await figma.loadFontAsync(font)
  const st = figma.createTextStyle()
  st.name = '2.0/note'
  st.description = '여러 줄로 감기는 안내 문구. caption(140%)은 한두 단어 라벨 기준이라 문단엔 빡빡하다. 코드 .text-note'
  st.fontName = font
  st.fontSize = 12
  st.lineHeight = { unit: 'PERCENT', value: 155 }
  noteStyle = st
  return '신설'
})

/* ── 2. 그림자 ──────────────────────────────────────────────── */
await step('그림자 → 2.0/shadow/popover', async () => {
  if (!popoverStyle) throw new Error('popover 스타일 없음')
  await comp.setEffectStyleIdAsync(popoverStyle.id)
})

/* ── 3·5. 아이콘 glyph 흰색 ─────────────────────────────────── */
await step('아이콘 glyph 흰색', async () => {
  let n = 0
  for (const inst of comp.findAll(x => x.type === 'INSTANCE')) {
    for (const v of inst.findAll(x => 'fills' in x && x.fills !== figma.mixed && x.fills.length)) {
      v.fills = [paint('white', '#FFFFFF')]
      n++
    }
  }
  return `${n}개`
})

/* ── 4. 닫기 면 흰색 20% ────────────────────────────────────── */
await step('닫기 면 흰색 20%', async () => {
  const close = comp.findOne(x => x.name === 'close')
  if (!close) throw new Error('close 프레임 없음')
  close.fills = [paint('white', '#FFFFFF', 0.2)]
})

/* ── 6. 문구 행간 ───────────────────────────────────────────── */
await step('문구 → 2.0/note', async () => {
  const body = comp.findOne(x => x.type === 'TEXT' && x.characters.includes('지역을 설정'))
  if (!body) throw new Error('문구 텍스트 없음')
  if (body.fontName !== figma.mixed) await figma.loadFontAsync(body.fontName)
  if (noteStyle) await body.setTextStyleIdAsync(noteStyle.id)
  else body.lineHeight = { unit: 'PERCENT', value: 155 }
  body.fills = [paint('white', '#FFFFFF')]
})

/* ── 7. 꼬리 ────────────────────────────────────────────────── */
await step('꼬리 추가', async () => {
  comp.clipsContent = false
  const old = comp.findOne(x => x.name === 'tail')
  if (old) old.remove()
  const tail = figma.createRectangle()
  tail.name = 'tail'
  tail.resize(11, 11)
  tail.cornerRadius = 4
  tail.fills = [paint('primary/700', '#404E81')]
  comp.appendChild(tail)
  try { tail.layoutPositioning = 'ABSOLUTE' } catch { /* 오토 레이아웃이 아니면 불필요 */ }
  tail.rotation = 45
  // 회전 원점 탓에 좌표가 어긋난다 — 실제 바운딩박스로 중심을 맞춘다.
  // 코드: left 24 / top -5 (11px 사각이므로 중심은 29.5, 0.5)
  const cb = comp.absoluteBoundingBox, tb = tail.absoluteBoundingBox
  if (cb && tb) {
    tail.x += (cb.x + 29.5) - (tb.x + tb.width / 2)
    tail.y += (cb.y + 0.5) - (tb.y + tb.height / 2)
  }
  comp.insertChild(0, tail)   // 본체 뒤 — 밑변이 가려진다
})

figma.viewport.scrollAndZoomIntoView([comp])
}

figma.notify(`RegionHintBubble — 완료 ${done.length}${failed.length ? ` · 실패 ${failed.length}` : ''}`)
console.log('완료:\n' + (done.join('\n') || '없음'))
if (failed.length) console.log('실패:\n' + failed.join('\n'))
