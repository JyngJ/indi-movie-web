// 2.0/logo/tile → Color variant 셋으로 확장 (Scripter용)
// Color=인디고 (현행: primary/700 타일 + 크림 글자)
// Color=잉크   (neutral/900 타일 + neutral/300 웜그레이 글자)

const TILE_ID = '64:532'
const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name.toLowerCase() === 'logo')

const colls = await figma.variables.getLocalVariableCollectionsAsync()
const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of cc.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); VAR[v.name] = v }
const paintOf = n => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[n])]

const tile = await figma.getNodeByIdAsync(TILE_ID)
if (!tile || tile.type !== 'COMPONENT') throw new Error('tile 컴포넌트 못 찾음')
if (tile.parent && tile.parent.type === 'COMPONENT_SET') throw new Error('이미 variant 셋임')

const x = tile.x, y = tile.y

// 잉크 variant 생성
const dark = tile.clone()
section.appendChild(dark)
dark.name = 'Color=잉크'
// 배경: 가장 큰 사각형(또는 루트 fills) → neutral/900
const bg = dark.findAll(n => n.type === 'RECTANGLE').sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
if (bg) bg.fills = paintOf('neutral/900')
else if (dark.fills && dark.fills.length) dark.fills = paintOf('neutral/900')
// 글자: 벡터류 → neutral/300 (웜그레이)
for (const v of dark.findAll(n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION')) {
  if (v === bg) continue
  if (v.fills !== figma.mixed && v.fills.length) v.fills = paintOf('neutral/300')
  if (v.strokes && v.strokes.length) v.strokes = paintOf('neutral/300')
}

tile.name = 'Color=인디고'
const set = figma.combineAsVariants([tile, dark], section)
set.name = '2.0/logo/tile'
set.layoutMode = 'HORIZONTAL'
set.primaryAxisSizingMode = 'AUTO'
set.counterAxisSizingMode = 'AUTO'
set.itemSpacing = 60
set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 40
set.x = x; set.y = y
set.description = '락업 타일. 인디고=기본(앱 아이콘·레일), 잉크=다크 컨텍스트(스플래시·OG 다크). 글자색: 인디고 타일=크림, 잉크 타일=neutral/300 웜그레이'

console.log('tile → Color 2 variants (인디고/잉크). 기존 레일 인스턴스는 인디고 variant로 유지됨')
