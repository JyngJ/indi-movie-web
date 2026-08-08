// 2.0/Button 변형 이름 복구 (2026-08-08) — 재생성 없음, 이름만 재작성.
// 증상: TextOnly·Error 블록 24개가 "Variant=2.0, Size=Button, Icon=TextOnly, State=sm, 속성 5=none, 속성 6=default"
//       꼴로 밀려 세트가 "existing errors" 상태 + 속성 6개로 파싱됨.
// 복구: 밀린 이름의 토큰 위치( [2.0, Button, variant, size, icon, state] )에서 원값 복원.
//       variant 토큰이 left/right/none으로 소실된 경우 직전 정상 변형의 variant 승계 (생성 순서 보존 전제).
// Scripter에서 Run.

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const report = []

const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Buttons 2.0 제안 (2026-08-08)')
const set = section && section.findChild(n => n.type === 'COMPONENT_SET' && n.name === '2.0/Button')
if (!set) { figma.notify('2.0/Button 세트 없음'); throw new Error('no set') }

const VARIANTS = ['Primary', 'Secondary', 'Tertiary', 'TextOnly', 'Error']
const SIZES = ['sm', 'md', 'lg']
const ICONS = ['none', 'left', 'right']
const STATES = ['default', 'hover', 'pressed', 'disabled']

let lastVariant = null, fixed = 0
for (const v of set.children) {
  const vals = v.name.split(',').map(s => {
    const i = s.indexOf('=')
    return (i === -1 ? s : s.slice(i + 1)).trim()
  })
  if (vals.length === 4 && VARIANTS.includes(vals[0]) && SIZES.includes(vals[1]) && ICONS.includes(vals[2]) && STATES.includes(vals[3])) {
    lastVariant = vals[0]
    continue // 정상
  }
  if (vals.length === 6 && vals[0] === '2.0' && vals[1] === 'Button') {
    const [, , vTok, size, icon, state] = vals
    const variant = VARIANTS.includes(vTok) ? vTok : lastVariant
    if (!variant || !SIZES.includes(size) || !ICONS.includes(icon) || !STATES.includes(state)) {
      report.push(`⚠ 복구 불가: "${v.name}"`)
      continue
    }
    v.name = `Variant=${variant}, Size=${size}, Icon=${icon}, State=${state}`
    lastVariant = variant
    fixed++
    continue
  }
  report.push(`⚠ 예상 밖 이름: "${v.name}"`)
}

// 중복 검사
const seen = new Map()
for (const v of set.children) {
  if (seen.has(v.name)) report.push(`⚠ 중복: ${v.name}`)
  else seen.set(v.name, true)
}
// 속성 정의 확인
let propsAfter
try { propsAfter = JSON.stringify(set.variantGroupProperties) } catch (e) { propsAfter = '여전히 에러: ' + e.message }

const old = section.findChild(n => n.type === 'TEXT' && n.name === '이름 복구 리포트')
if (old) old.remove()
const t = figma.createText()
t.name = '이름 복구 리포트'
t.fontName = { family: 'Pretendard', style: 'Regular' }
t.fontSize = 12
t.characters = [
  `2.0/Button 이름 복구 — ${fixed}개 수정`,
  `속성 정의: ${propsAfter}`,
  ...report,
].join('\n')
t.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.15, b: 0.1 } }]
section.appendChild(t)
t.x = 1100; t.y = 420
t.resize(560, t.height)
figma.viewport.scrollAndZoomIntoView([t])
figma.notify(`이름 복구 ${fixed}개${report.length ? ` · 경고 ${report.length}` : ''}`)
