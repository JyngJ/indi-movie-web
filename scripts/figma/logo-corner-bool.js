// 2.0/logo/tile — '직각 모서리' 불리언 추가 (Scripter용)
// 트릭: 라운드 bg 위에 직각 bg 겹침 → 그 visible을 불리언 바인딩
// 기본 off = 라운드 / 켜면 직각 (앱 아이콘 마스킹 컨텍스트 등)

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name.toLowerCase() === 'logo')
const set = section.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/logo/tile')
if (!set) throw new Error('tile 셋 못 찾음')

// 불리언 프로퍼티 (재실행 안전)
let propKey = null
for (const k of Object.keys(set.componentPropertyDefinitions)) {
  if (k.startsWith('직각 모서리') && set.componentPropertyDefinitions[k].type === 'BOOLEAN') propKey = k
}
if (!propKey) propKey = set.addComponentProperty('직각 모서리', 'BOOLEAN', false)

const log = []
for (const variant of set.children) {
  if (variant.findOne(n => n.name === 'square-bg')) { log.push(`${variant.name}: 이미 있음`); continue }
  // 배경 = 가장 큰 사각형
  const bg = variant.findAll(n => n.type === 'RECTANGLE')
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
  if (!bg) { log.push(`⚠ ${variant.name}: 배경 사각형 못 찾음`); continue }
  const sq = bg.clone()
  const parent = bg.parent
  parent.insertChild(parent.children.indexOf(bg) + 1, sq) // 라운드 바로 위
  sq.x = bg.x; sq.y = bg.y
  sq.name = 'square-bg'
  sq.cornerRadius = 0
  sq.visible = false
  sq.componentPropertyReferences = { visible: propKey }
  log.push(`${variant.name}: square-bg 바인딩`)
}
set.description = (set.description || '') + '\n직각 모서리(boolean): on=각진 타일 (OS가 자체 마스킹하는 앱 아이콘 제출용 등), off=라운드 기본'
console.log(log.join('\n') + `\n프로퍼티: ${propKey}`)
