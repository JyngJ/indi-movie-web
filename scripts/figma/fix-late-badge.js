// ShowtimeCell 심야 variant — 배지를 관 줄에 인라인 (Scripter용)
// 5줄 → 4줄로 통일: [2관 2D(자막) ←space-between→ 심야배지]

const TARGET_PAGE = 'Design System'
const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ShowtimeCell')
if (!set) throw new Error('2.0/ShowtimeCell 못 찾음')
const late = set.children.find(c => c.name.includes('심야'))
if (!late) throw new Error('심야 variant 못 찾음')

// 폰트 로드
for (const t of late.findAll(n => n.type === 'TEXT')) {
  if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
}

const hall = late.findAll(n => n.type === 'TEXT').find(t => t.characters.includes('관'))
const badge = late.children.find(n => n.type === 'FRAME' && n.findOne && n.findOne(t => t.type === 'TEXT' && t.characters === '심야'))
if (!hall || !badge) throw new Error('관 텍스트 또는 심야 배지 못 찾음')

const cellW = late.width
const row = figma.createFrame()
row.name = 'hall-row'
row.layoutMode = 'HORIZONTAL'
row.counterAxisAlignItems = 'CENTER'
row.primaryAxisAlignItems = 'SPACE_BETWEEN'
row.fills = []
const hallIdx = late.children.indexOf(hall)
late.insertChild(hallIdx, row)
row.appendChild(hall)
row.appendChild(badge)
row.layoutSizingHorizontal = 'FILL'
row.counterAxisSizingMode = 'AUTO'
// 높이 통일 확인용: 다른 variant와 같은 높이인지 리턴
const heights = set.children.map(c => `${c.name.replace('State=', '')}:${Math.round(c.height)}`)
console.log('variant 높이 — ' + heights.join(' / '))
