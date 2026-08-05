// DateCell — 밑줄 인디케이터를 '상영있음' 불리언 프로퍼티로 (Scripter용)
// 의미: 현재 선택된 영화가 그 날짜에 상영할 때만 밑줄 표시

const TARGET_PAGE = 'Design System'
const PROP_NAME = '상영있음'

const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/DateCell')
if (!set) throw new Error('2.0/DateCell 못 찾음')

// 불리언 프로퍼티 정의 (이미 있으면 재사용)
let propRef = null
const defs = set.componentPropertyDefinitions
for (const [key, def] of Object.entries(defs)) {
  if (def.type === 'BOOLEAN' && key.startsWith(PROP_NAME)) { propRef = key; break }
}
if (!propRef) propRef = set.addComponentProperty(PROP_NAME, 'BOOLEAN', true)

// 각 variant의 밑줄(작은 바)에 visible 바인딩
const log = []
for (const variant of set.children) {
  const bar = variant.findOne(n => n.type === 'RECTANGLE' && n.height <= 5 && n.width <= 32)
  if (!bar) { log.push(`⚠ ${variant.name}: 밑줄 못 찾음`); continue }
  bar.name = 'screening-indicator'
  bar.componentPropertyReferences = { visible: propRef }
  log.push(`${variant.name.replace('Kind=', '')}: 바인딩 완료`)
}

set.description = (set.description || '') +
  '\n상영있음(boolean): 선택된 영화가 해당 날짜에 상영할 때만 밑줄 표시. off = 상영 없는 날.'

console.log(log.join('\n') + `\n프로퍼티: ${propRef}`)
