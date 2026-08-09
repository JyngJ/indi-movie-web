// 상영중 영사기 셀 — 확정 시안 반영 (2026-08-09, 코드 이식 완료본 역싱크)
// '상영중 영사기 ?' 섹션을 개선판으로 재생성:
//  · 균일 면 3겹 → 그라디언트 쐐기 2겹(오커, 원점 진하고 끝 투명) + 얇은 흰 하이라이트 + 렌즈 글로우 점
//  · 카피 '상영중' → '지금 상영중' (success/700)
//  · 애니메이션 스펙 노트 포함 (플리커 2.6s 스텝 · 스웨이 5.2s ±1.1° 한 몸 · reduced-motion 정지)
// Scripter에서 Run.

const HEX = { 'neutral/800': '#2B2622', 'neutral/500': '#8D8781', 'success/700': '#4A7C59', 'white': '#FFFFFF' }
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

const OKRA = { r: 185 / 255, g: 128 / 255, b: 14 / 255 }  // --color-warning #B9800E
function beamGradient(alpha) {
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0, color: { ...OKRA, a: alpha } },
      { position: 0.5, color: { ...OKRA, a: alpha * 0.3 } },
      { position: 0.78, color: { ...OKRA, a: 0 } },
    ],
  }
}
function whiteGradient() {
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0, color: { r: 1, g: 1, b: 1, a: 0.9 } },
      { position: 0.45, color: { r: 1, g: 1, b: 1, a: 0.35 } },
      { position: 0.75, color: { r: 1, g: 1, b: 1, a: 0 } },
    ],
  }
}

function cell(withBeam) {
  const c = figma.createFrame()
  c.name = withBeam ? '2.0/ShowtimeCell · 지금 상영중 (빔)' : '2.0/ShowtimeCell · 지금 상영중 (빔 없음 비교)'
  c.resize(104, 95)
  c.cornerRadius = 16
  c.fills = [paint('white')]
  c.strokes = [{ type: 'SOLID', color: rgb('#EAE5E1') }]
  c.strokeWeight = 1
  c.clipsContent = true

  if (withBeam) {
    // 쐐기 1 — 진한 오커, 좌상단 원점에서 우하향
    const b1 = figma.createRectangle()
    b1.resize(150, 26)
    b1.fills = [beamGradient(0.34)]
    c.appendChild(b1)
    b1.x = -4; b1.y = -2
    b1.rotation = -16
    // 쐐기 2 — 옅고 넓게
    const b2 = figma.createRectangle()
    b2.resize(150, 38)
    b2.fills = [beamGradient(0.18)]
    c.appendChild(b2)
    b2.x = -4; b2.y = 2
    b2.rotation = -30
    // 얇은 흰 하이라이트 — 맨 위
    const hi = figma.createRectangle()
    hi.resize(140, 5)
    hi.fills = [whiteGradient()]
    c.appendChild(hi)
    hi.x = -2; hi.y = 6
    hi.rotation = -13
    // 렌즈 글로우 점
    const lens = figma.createEllipse()
    lens.resize(7, 7)
    lens.fills = [{
      type: 'GRADIENT_RADIAL',
      gradientTransform: [[1, 0, 0], [0, 1, 0]],
      gradientStops: [
        { position: 0, color: { r: 253 / 255, g: 241 / 255, b: 216 / 255, a: 0.95 } },
        { position: 0.45, color: { ...OKRA, a: 0.55 } },
        { position: 0.75, color: { ...OKRA, a: 0 } },
      ],
    }]
    c.appendChild(lens)
    lens.x = 4; lens.y = 4
  }

  const t1 = figma.createText()
  t1.fontName = { family: 'Pretendard', style: 'Bold' }
  t1.fontSize = 16
  t1.characters = '20:10'
  t1.fills = [paint('neutral/800')]
  c.appendChild(t1); t1.x = 16; t1.y = 14

  const t2 = figma.createText()
  t2.fontName = { family: 'Pretendard', style: 'Regular' }
  t2.fontSize = 12
  t2.characters = '-21:51'
  t2.fills = [paint('neutral/500')]
  c.appendChild(t2); t2.x = 16; t2.y = 36

  const t3 = figma.createText()
  t3.fontName = { family: 'Pretendard', style: 'Bold' }
  t3.fontSize = 14
  t3.characters = '지금 상영중'
  t3.fills = [paint('success/700')]
  c.appendChild(t3); t3.x = 16; t3.y = 58
  return c
}

const page = figma.root.children.find(p => p.children.some(n => n.type === 'SECTION' && n.name === '상영중 영사기 ?')) || figma.currentPage
await figma.setCurrentPageAsync(page)
const prev = page.children.find(n => n.type === 'SECTION' && n.name === '상영중 영사기 ?')
const section = figma.createSection()
section.name = '상영중 영사기 — 확정 (2026-08-09)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }

const a = cell(true), b = cell(false)
section.appendChild(a); a.x = 60; a.y = 90
section.appendChild(b); b.x = 200; b.y = 90

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 12
note.characters = [
  '지금 상영중 셀 — 확정 (코드 이식 완료: globals .projector-beam / 2146512)',
  '· 정적: 오커(warning #B9800E) 그라디언트 쐐기 2겹 + 얇은 흰 하이라이트 + 렌즈 글로우 점(좌상단)',
  '· 모션: 플리커 2.6s 불규칙 스텝(0.82~1.0) · 스웨이 5.2s ±1.1° 한 몸(위상차 0.1s) · reduced-motion 정지',
  '· 카피: 상영중 → 지금 상영중 (success/700 · Bold 14)',
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 16
section.resizeWithoutConstraints(560, 260)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('영사기 확정 시안 반영')
