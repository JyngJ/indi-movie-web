// DateCell 불리언 진단 + 시연 (Scripter용)
// 1. 각 variant의 밑줄 존재·visible·바인딩 상태를 캔버스 리포트로
// 2. 셋 옆에 인스턴스 2개 생성: 상영있음 on / off — 토글 작동 시연

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/DateCell')
if (!set) throw new Error('셋 못 찾음')

const lines = ['[DateCell 진단]']
lines.push('셋 프로퍼티: ' + JSON.stringify(Object.keys(set.componentPropertyDefinitions)))

let propKey = null
for (const key of Object.keys(set.componentPropertyDefinitions)) {
  if (key.startsWith('상영있음')) propKey = key
}

for (const variant of set.children) {
  const bars = variant.findAll(n => n.type === 'RECTANGLE' && n.height <= 6 && n.width <= 40)
  if (!bars.length) { lines.push(`${variant.name}: 밑줄 사각형 없음!`); continue }
  for (const bar of bars) {
    const refs = bar.componentPropertyReferences
    lines.push(`${variant.name}: '${bar.name}' ${Math.round(bar.width)}x${Math.round(bar.height)} visible=${bar.visible} 바인딩=${refs ? JSON.stringify(refs) : '없음'}`)
    // 복구: 바인딩 누락이면 다시 걸고, visible false면 켬
    if (propKey && (!refs || !refs.visible)) {
      bar.componentPropertyReferences = { visible: propKey }
      bar.visible = true
      lines.push(`  → 재바인딩 + visible 복구`)
    }
  }
}

// 시연 인스턴스: 평일 variant, on/off
const weekday = set.children.find(c => c.name.includes('평일')) || set.children[0]
const oldDemo = page.findAll(n => n.name && n.name.startsWith('datecell-demo'))
for (const o of oldDemo) o.remove()
if (propKey) {
  const on = weekday.createInstance()
  on.name = 'datecell-demo-on'
  page.appendChild(on)
  on.x = set.x + set.width + 40; on.y = set.y
  const off = weekday.createInstance()
  off.name = 'datecell-demo-off'
  page.appendChild(off)
  off.x = set.x + set.width + 40 + on.width + 24; off.y = set.y
  off.setProperties({ [propKey]: false })
  lines.push('시연 인스턴스 생성: 왼쪽 on / 오른쪽 off — 오른쪽에 밑줄 없어야 정상')
} else {
  lines.push('⚠ 상영있음 프로퍼티 자체가 없음')
}

const oldRep = page.findOne(n => n.type === 'TEXT' && n.name === 'DateCell 진단')
if (oldRep) oldRep.remove()
const rep = figma.createText()
rep.name = 'DateCell 진단'
rep.fontName = { family: 'Inter', style: 'Regular' }
rep.characters = lines.join('\n')
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.04, b: 0.03 } }]
page.appendChild(rep)
rep.x = set.x; rep.y = set.y + set.height + 40
