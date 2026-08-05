// DateCell — 상영있음 variant 축 제거 → 불리언 프로퍼티(체크박스)로 전환 (Scripter용)
// 결과: Kind 4 variants + 상영있음 boolean (밑줄 visible 바인딩)

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
const set = section.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/DateCell')
if (!set) throw new Error('셋 못 찾음')

const log = []

// ── 1. 상영있음=False variant 삭제 ──
for (const variant of [...set.children]) {
  if (variant.name.includes('상영있음=False')) {
    log.push(`삭제: ${variant.name}`)
    variant.remove()
  }
}

// ── 2. 남은 variant 이름에서 상영있음 축 제거 ──
for (const variant of set.children) {
  const newName = variant.name
    .split(',')
    .map(s => s.trim())
    .filter(s => !s.startsWith('상영있음'))
    .join(', ')
  if (newName !== variant.name) variant.name = newName
}
log.push('축 정리 후: ' + set.children.map(v => v.name).join(' / '))

// ── 3. 불리언 프로퍼티 + 밑줄 바인딩 ──
let propKey = null
for (const key of Object.keys(set.componentPropertyDefinitions)) {
  if (key.startsWith('상영있음') && set.componentPropertyDefinitions[key].type === 'BOOLEAN') propKey = key
}
if (!propKey) propKey = set.addComponentProperty('상영있음', 'BOOLEAN', true)

for (const variant of set.children) {
  const bar = variant.findOne(n => n.type === 'RECTANGLE' && n.height <= 6 && n.width <= 40)
  if (!bar) { log.push(`⚠ ${variant.name}: 밑줄 없음`); continue }
  bar.name = 'screening-indicator'
  bar.visible = true
  bar.componentPropertyReferences = { visible: propKey }
  log.push(`${variant.name}: 밑줄 바인딩`)
}

set.description = '날짜바 셀. Kind 4종 + 상영있음(boolean): 선택 영화가 그 날 상영하면 밑줄. 코드: availableDates.has(date)'
console.log(log.join('\n') + `\n프로퍼티: ${propKey}`)
