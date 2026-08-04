// DateCell 시연 인스턴스 위치 정리 (Scripter용)
// 페이지 루트에 잘못 떨어진 demo 인스턴스·진단 텍스트를 Components 2.0 섹션 안 제자리로

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
const set = section && section.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/DateCell')
if (!section || !set) throw new Error('섹션/셋 못 찾음')

// 페이지 어디에 있든 demo 인스턴스 수거
const demos = page.findAll(n => n.name === 'datecell-demo-on' || n.name === 'datecell-demo-off')
let x = set.x + set.width + 40
for (const d of demos) {
  section.appendChild(d)          // 섹션 안으로 (좌표계도 섹션 기준으로 전환)
  d.x = x
  d.y = set.y + 28
  x += d.width + 24
}

// 진단 텍스트 제거 (역할 끝남 — 바인딩 정상 확인됨)
const rep = page.findOne(n => n.type === 'TEXT' && n.name === 'DateCell 진단')
if (rep) rep.remove()

// 시연 라벨
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const old = section.findOne(n => n.type === 'TEXT' && n.name === 'demo-label')
if (old) old.remove()
if (demos.length) {
  const t = figma.createText()
  t.name = 'demo-label'
  t.fontName = { family: 'Pretendard', style: 'Regular' }
  t.characters = '← 상영있음 on / off 시연'
  t.fontSize = 11
  t.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.53, b: 0.5 } }]
  section.appendChild(t)
  t.x = x + 8; t.y = set.y + 50
}
console.log(`demo ${demos.length}개 이동, 진단 텍스트 제거`)
