// Spacing 2.0 / Radius 2.0 변수 컬렉션 등록 (Scripter용)
// 기존 1.0 컬렉션(Spacing/Radius) 안 건드림. 재실행 안전(없는 것만 추가).

const GAP_SCOPES = ['GAP', 'WIDTH_HEIGHT']
const RAD_SCOPES = ['CORNER_RADIUS']

// [이름, 값, 설명]
const SPACING = [
  ['spacing/1', 4, '칩·배지 내부, 아이콘-글자 사이'],
  ['spacing/2', 8, '요소 간 기본 간격'],
  ['spacing/3', 12, '카드 내부 요소 사이'],
  ['spacing/4', 16, '카드 패딩, 거터'],
  ['spacing/6', 24, '카드 내부 그룹 사이'],
  ['spacing/8', 32, '카드 사이, 큰 패딩'],
  ['spacing/12', 48, '섹션 사이'],
  ['spacing/16', 64, '큰 섹션 사이, 화면 상하'],
  ['spacing/24', 96, '히어로 위아래'],
  ['spacing/32', 128, '특대 — 엠티 스테이트·랜딩'],
]
const RADIUS = [
  ['radius/poster', 2, '포스터·썸네일 — 인쇄물 모서리 (2.0에서 8→2)'],
  ['radius/badge', 4, '배지·오버레이 칩·인디케이터'],
  ['radius/button', 8, '버튼 전용'],
  ['radius/control', 12, '입력·칩·카드·시간표 셀'],
  ['radius/popover', 16, '드롭다운·팝오버·모달'],
  ['radius/sheet', 20, '바텀시트 상단'],
  ['radius/pill', 9999, '검색창·필터 칩·FAB pill'],
]

const ensureCollection = async (name) => {
  const colls = await figma.variables.getLocalVariableCollectionsAsync()
  let c = colls.find(x => x.name === name)
  if (!c) { c = figma.variables.createVariableCollection(name); c.renameMode(c.modes[0].modeId, 'Value') }
  const names = new Set()
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    names.add(v.name)
  }
  return { coll: c, names }
}
const register = async (collName, defs, scopes, cssPrefix) => {
  const { coll, names } = await ensureCollection(collName)
  const mode = coll.modes[0].modeId
  const made = []
  for (const [name, val, desc] of defs) {
    if (names.has(name)) { made.push(`${name} 이미 있음`); continue }
    const v = figma.variables.createVariable(name, coll, 'FLOAT')
    v.setValueForMode(mode, val)
    v.description = desc
    v.scopes = scopes
    v.setVariableCodeSyntax('WEB', `var(--${name.replace('/', '-')})`)
    made.push(`${name} = ${val}`)
  }
  return made
}

const spLog = await register('영화볼지도 스페이싱 - 2.0', SPACING, GAP_SCOPES, 'spacing')
const rdLog = await register('영화볼지도 래디우스 - 2.0', RADIUS, RAD_SCOPES, 'radius')

// 쉐도우 확인 (이미 이펙트 스타일 + shadow/base 변수로 등록됨)
const fx = await figma.getLocalEffectStylesAsync()
const fx2 = fx.filter(s => s.name.startsWith('2.0/shadow/')).map(s => s.name)

// 캔버스 리포트
const section = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name.includes('spacing / radius / shadow'))
const parent = section || figma.currentPage
const oldRep = parent.findOne ? parent.findOne(n => n.type === 'TEXT' && n.name === '변수 등록 리포트') : null
if (oldRep) oldRep.remove()
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const rep = figma.createText()
rep.name = '변수 등록 리포트'
rep.characters = [
  '[변수 등록 리포트]',
  `— 영화볼지도 스페이싱 - 2.0 (${SPACING.length}) —`, ...spLog,
  `— 영화볼지도 래디우스 - 2.0 (${RADIUS.length}) —`, ...rdLog,
  `— 쉐도우: 이펙트 스타일 ${fx2.length}종 확인 (${fx2.join(', ')}) + shadow/base 변수`,
].join('\n')
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.04, b: 0.03 } }]
parent.appendChild(rep)
rep.x = section ? 0 : 0
rep.y = section ? -rep.height - 40 : 0
