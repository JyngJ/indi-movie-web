// "영화볼지도 색상 - 2.0" 컬렉션 내용 검증 (Scripter용)
// 등록된 변수 전체를 캔버스 리포트로 출력

const COLLECTION_NAME = '영화볼지도 색상 - 2.0'
const SECTION_ID = '35:184'

const colls = await figma.variables.getLocalVariableCollectionsAsync()
const coll = colls.find(c => c.name === COLLECTION_NAME)
if (!coll) throw new Error('컬렉션 없음')

const toHex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
const mode = coll.modes[0].modeId
const lines = [`[컬렉션 검증] ${COLLECTION_NAME} — 변수 ${coll.variableIds.length}개`]
const byGroup = {}
for (const id of coll.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  const val = v.valuesByMode[mode]
  const hex = val && val.r !== undefined ? toHex(val) : JSON.stringify(val)
  const grp = v.name.split('/')[0]
  ;(byGroup[grp] = byGroup[grp] || []).push(`  ${v.name}  ${hex}  — ${v.description || '(설명 없음)'}`)
}
for (const [grp, arr] of Object.entries(byGroup)) {
  lines.push(`${grp} (${arr.length}):`)
  lines.push(...arr)
}

const section = await figma.getNodeByIdAsync(SECTION_ID)
const old = section.findOne(n => n.type === 'TEXT' && n.name === '검증 리포트')
if (old) old.remove()
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const rep = figma.createText()
rep.name = '검증 리포트'
rep.characters = lines.join('\n')
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
section.appendChild(rep)
rep.x = 700; rep.y = -lines.length * 18 - 40
