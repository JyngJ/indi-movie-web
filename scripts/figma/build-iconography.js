// Iconography 섹션 구축 (Scripter용)
// 1. Lucide SVG를 unpkg에서 fetch → stroke 1.75로 조정 → 2.0/icon/* 컴포넌트화
// 2. 기존 커스텀 아이콘(심야 초승달) 복사 편입
// 방향 B: 시스템 = Lucide, 시그니처(핀·탭바·달) = 커스텀 예정 자리 표시

const TARGET_PAGE = 'Design System'
const STROKE = 1.75

// [lucide 이름, 용도 라벨]
const ICONS = [
  ['x', '닫기·해제'],
  ['chevron-left', '뒤로'],
  ['chevron-right', '다음·상세'],
  ['chevron-down', '드롭다운'],
  ['search', '검색'],
  ['sliders-horizontal', '필터'],
  ['share-2', '공유'],
  ['instagram', '인스타그램'],
  ['external-link', '외부 링크'],
  ['route', '길찾기'],
  ['locate-fixed', '현위치'],
  ['plus', '줌인'],
  ['minus', '줌아웃'],
  ['check', '선택 확인'],
  ['star', '즐겨찾기(예정)'],
  ['settings', '설정'],
  ['map', '지도 탭 — 시그니처 교체 후보'],
  ['film', '상영작 탭 — 시그니처 교체 후보'],
  ['map-pin', '핀 — 시그니처 교체 후보'],
  ['moon', '심야 — 커스텀 대조용'],
]

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' })
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })

const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)

// 섹션 생성
let section = page.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
if (!section) {
  section = figma.createSection()
  section.name = 'Iconography'
  let maxX = 0
  for (const n of page.children) { if (n !== section) maxX = Math.max(maxX, n.x + n.width) }
  section.x = maxX + 200; section.y = 0
  section.resizeWithoutConstraints(1100, 700)
  section.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.976, b: 0.972 } }]
  page.appendChild(section)
}

const title = section.findOne(n => n.type === 'TEXT' && n.name === 'title')
if (!title) {
  const t = figma.createText()
  t.name = 'title'
  t.fontName = { family: 'KIMM_Bold', style: 'B' }
  t.characters = 'Iconography'
  t.fontSize = 24
  t.letterSpacing = { unit: 'PERCENT', value: 5 }
  t.fills = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]
  section.appendChild(t)
  t.x = 48; t.y = 40
  const sub = figma.createText()
  sub.fontName = { family: 'Pretendard', style: 'Regular' }
  sub.characters = 'Lucide · stroke 1.75 · round cap · currentColor 상속 · 크기 16/20/24\n시그니처(핀·탭바 2종·달)는 KIMM 문법(직선+굴림) 커스텀으로 교체 예정'
  sub.fontSize = 12
  sub.lineHeight = { unit: 'PERCENT', value: 150 }
  sub.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.53, b: 0.5 } }]
  section.appendChild(sub)
  sub.x = 48; sub.y = 84
}

// ── Lucide fetch → 컴포넌트 ──
const ok = [], fail = []
let col = 0, row = 0
const X0 = 48, Y0 = 150, CELL_W = 120, CELL_H = 100, PER_ROW = 8

for (const [name, usage] of ICONS) {
  const compName = `2.0/icon/${name}`
  if (section.findOne(n => n.type === 'COMPONENT' && n.name === compName)) { ok.push(name + ' (기존)'); continue }
  try {
    const res = await fetch(`https://unpkg.com/lucide-static/icons/${name}.svg`)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    let svg = await res.text()
    svg = svg.replace(/stroke-width="2"/g, `stroke-width="${STROKE}"`)
    const node = figma.createNodeFromSvg(svg)
    section.appendChild(node)
    node.resize(24, 24)
    const comp = figma.createComponentFromNode(node)
    comp.name = compName
    comp.description = usage
    comp.x = X0 + col * CELL_W
    comp.y = Y0 + row * CELL_H
    // 라벨
    const l = figma.createText()
    l.fontName = { family: 'Pretendard', style: 'Regular' }
    l.characters = name
    l.fontSize = 10
    l.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.53, b: 0.5 } }]
    section.appendChild(l)
    l.x = comp.x; l.y = comp.y + 32
    ok.push(name)
    col++
    if (col >= PER_ROW) { col = 0; row++ }
  } catch (e) {
    fail.push(`${name}: ${e.message}`)
  }
}

// ── 기존 커스텀 초승달 편입 ──
try {
  const compSection = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
  const stSet = compSection && compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ShowtimeCell')
  const late = stSet && stSet.children.find(c => c.name.includes('심야'))
  const moon = late && late.findOne(n => n.name === 'moon')
  if (moon && !section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/moon-custom')) {
    const clone = moon.clone()
    section.appendChild(clone)
    clone.resize(24, 24)
    const comp = figma.createComponentFromNode(clone)
    comp.name = '2.0/icon/moon-custom'
    comp.description = '심야 커스텀 초승달 — Lucide moon과 대조 후 택1'
    comp.x = X0 + col * CELL_W
    comp.y = Y0 + row * CELL_H
    const l = figma.createText()
    l.fontName = { family: 'Pretendard', style: 'Regular' }
    l.characters = 'moon-custom'
    l.fontSize = 10
    l.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.53, b: 0.5 } }]
    section.appendChild(l)
    l.x = comp.x; l.y = comp.y + 32
    ok.push('moon-custom (기존 커스텀)')
  }
} catch (e) { fail.push('moon-custom: ' + e.message) }

console.log(`아이콘 ${ok.length}개 생성:\n` + ok.join(', ') + (fail.length ? `\n실패:\n` + fail.join('\n') : ''))
