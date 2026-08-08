// Buttons 2.0 제안 — 배리언트 속성 정리 (2026-08-08). 컴포넌트 재생성 없음, 이름만 수정.
//  · Chip: Type/State/Hover 3속성 → Variant/State 2속성 (State=off/off-hover/on/on-hover)
//  · SortToggle: State/Hover 2속성 → State 1속성 (default/hover/active/active-hover)
//  · Button·IconButton: Variant/Size/(Icon)/State 유지
//  · 각 세트의 실제 속성 정의를 변경 전/후로 리포트 — 'spacing' 등 이상 속성 출처 확인용
// Scripter에서 Run. 결과는 섹션 옆 리포트 텍스트.

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const report = []

const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Buttons 2.0 제안 (2026-08-08)')
if (!section) { figma.notify('제안 섹션 없음'); throw new Error('no section') }

const sets = section.findChildren(n => n.type === 'COMPONENT_SET')
function propsOf(set) {
  try { return JSON.stringify(set.variantGroupProperties) } catch (e) { return '읽기 실패: ' + e.message }
}

for (const set of sets) {
  report.push(`■ ${set.name}`)
  report.push(`  전: ${propsOf(set)}`)

  if (set.name === '2.0/Chip') {
    for (const v of set.children) {
      const m = Object.fromEntries(v.name.split(',').map(s => s.trim().split('=')))
      const type = m.Type || 'filter'
      const on = m.State === 'on', hv = m.Hover === 'hover'
      const state = (on ? 'on' : 'off') + (hv ? '-hover' : '')
      v.name = `Variant=${type}, State=${state}`
    }
  }
  if (set.name === '2.0/SortToggle') {
    for (const v of set.children) {
      const m = Object.fromEntries(v.name.split(',').map(s => s.trim().split('=')))
      const active = m.State === 'active', hv = m.Hover === 'hover'
      const state = active ? (hv ? 'active-hover' : 'active') : (hv ? 'hover' : 'default')
      v.name = `State=${state}`
    }
  }
  // Button·IconButton·FAB: 이름 손 안 댐 — 이상 속성만 리포트로 확인

  report.push(`  후: ${propsOf(set)}`)

  // 이상 속성 감지: 정의된 스킴 밖 속성명
  const ALLOWED = new Set(['Variant', 'Size', 'Icon', 'State', 'Type'])
  try {
    const bad = Object.keys(set.variantGroupProperties).filter(k => !ALLOWED.has(k))
    if (bad.length) report.push(`  ⚠ 스킴 밖 속성: ${bad.join(', ')} — 이 속성 가진 변형 이름 확인 필요`)
  } catch { /* variantGroupProperties는 이름 충돌 시 throw — 아래에서 잡힘 */ }

  // 이름 충돌(동일 조합 중복) 감지
  const seen = new Map()
  for (const v of set.children) {
    if (seen.has(v.name)) report.push(`  ⚠ 중복 변형: "${v.name}" (${seen.get(v.name)} / ${v.id})`)
    else seen.set(v.name, v.id)
  }
}

const old = section.findChild(n => n.type === 'TEXT' && n.name === '속성 정리 리포트')
if (old) old.remove()
const t = figma.createText()
t.name = '속성 정리 리포트'
t.fontName = { family: 'Pretendard', style: 'Regular' }
t.fontSize = 12
t.characters = ['속성 정리 리포트 (' + new Date().toISOString().slice(0, 16) + ')', ...report].join('\n')
t.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.15, b: 0.1 } }]
section.appendChild(t)
t.x = 1100; t.y = 24
t.resize(560, t.height)
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('속성 정리 완료 — 리포트 확인')
