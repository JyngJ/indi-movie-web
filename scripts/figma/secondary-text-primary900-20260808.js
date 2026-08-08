// 2.0/Button Secondary 텍스트·아이콘 색 → primary/900 (2026-08-08 사용자 결정, 코드 동기 완료)
// Scripter에서 Run.

const HEX900 = '#1F2747'
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
let v900 = null
for (const v of allVars) if (v.name === 'primary/900') { v900 = v; break }
const solid = { type: 'SOLID', color: rgb(HEX900) }
const paint900 = v900 ? figma.variables.setBoundVariableForPaint(solid, 'color', v900) : solid

const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Buttons 2.0 제안 (2026-08-08)')
const set = section && section.findChild(n => n.type === 'COMPONENT_SET' && n.name === '2.0/Button')
if (!set) { figma.notify('2.0/Button 세트 없음'); throw new Error('no set') }

let touched = 0
for (const v of set.children) {
  if (!v.name.includes('Variant=Secondary')) continue
  for (const t of v.findAll(n => n.type === 'TEXT')) { t.fills = [paint900]; touched++ }
  for (const inst of v.findAll(n => n.type === 'INSTANCE')) {
    for (const vec of inst.findAll(n => 'strokes' in n || 'fills' in n)) {
      try {
        if (vec.strokes && vec.strokes.length) vec.strokes = [paint900]
        if (vec.fills && vec.fills !== figma.mixed && vec.fills.length) vec.fills = [paint900]
      } catch { /* 잠긴 속성 무시 */ }
    }
  }
}
figma.notify(`Secondary 텍스트·아이콘 primary/900 적용 — 텍스트 ${touched}개`)
