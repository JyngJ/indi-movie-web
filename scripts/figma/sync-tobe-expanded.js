// TOBE · Mobile expanded ← collapsed 확정 문법 동기화 (Scripter용)
// 1. 극장 헤더(이름·주소·고스트 액션)를 collapsed에서 복제해 교체
// 2. 포스터 스트립 간격·거터를 collapsed와 통일 (24 거터, gap 16, film gap 8)
// 3. 각 행 좌우 거터 24로 통일

const EXPANDED_ID = '42:1784'
const EXP_HEADER_ID = '42:1788'
const COLLAPSED_HEADER_ID = '42:2332'
const EXP_POSTERS_ID = '42:1846'
const EXP_FILM_IDS = ['42:1847', '42:1853', '42:1858']
const GUTTER_TARGETS = [
  ['42:1785', 'nav-row'],
  ['42:1838', 'count-row'],
]

// 폰트 로드 (복제 헤더 안 텍스트 포함 후속 조작 대비)
const fonts = await figma.listAvailableFontsAsync()
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch (e) {}

const expanded = await figma.getNodeByIdAsync(EXPANDED_ID)
const oldHeader = await figma.getNodeByIdAsync(EXP_HEADER_ID)
const srcHeader = await figma.getNodeByIdAsync(COLLAPSED_HEADER_ID)
if (!expanded || !srcHeader) throw new Error('프레임 못 찾음 — id 확인 필요')

const log = []

// ── 1. 헤더 교체 ──
if (oldHeader) {
  const idx = expanded.children.indexOf(oldHeader)
  const clone = srcHeader.clone()
  expanded.insertChild(idx, clone)
  oldHeader.remove()
  // collapsed 헤더는 head-row가 거터를 담당했으므로, expanded에선 자체 패딩 부여
  clone.paddingLeft = 24
  clone.paddingRight = 24
  clone.paddingTop = 4
  clone.paddingBottom = 20
  clone.layoutSizingHorizontal = 'FILL'
  clone.name = 'theater-header (collapsed 동기화)'
  log.push('헤더 교체 완료 (이름·주소·고스트 액션 동기화)')
} else {
  log.push('⚠ 기존 expanded 헤더 못 찾음 — 교체 생략')
}

// ── 2. 포스터 스트립 통일 ──
const posters = await figma.getNodeByIdAsync(EXP_POSTERS_ID)
if (posters) {
  posters.itemSpacing = 16
  posters.paddingLeft = 24
  posters.paddingRight = 24
  posters.paddingTop = 8
  posters.paddingBottom = 16
  log.push('포스터 스트립: gap 16 · 거터 24')
}
for (const id of EXP_FILM_IDS) {
  const film = await figma.getNodeByIdAsync(id)
  if (film) film.itemSpacing = 8
}
log.push('film 내부 간격 8 (포스터-제목)')

// ── 3. 거터 24 통일 ──
for (const [id, name] of GUTTER_TARGETS) {
  const n = await figma.getNodeByIdAsync(id)
  if (n) { n.paddingLeft = 24; n.paddingRight = 24; log.push(`${name}: 거터 24`) }
}
// card-wrap·showtimes도 24로
for (const id of ['42:1863', '42:1888']) {
  const n = await figma.getNodeByIdAsync(id)
  if (n) { n.paddingLeft = 24; n.paddingRight = 24 }
}
log.push('card-wrap · showtimes: 거터 24')

// 리포트
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const section = expanded.parent
const oldRep = section.findOne(n => n.type === 'TEXT' && n.name === '동기화 리포트')
if (oldRep) oldRep.remove()
const rep = figma.createText()
rep.name = '동기화 리포트'
rep.characters = '[expanded 동기화]\n' + log.join('\n')
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.04, b: 0.03 } }]
section.appendChild(rep)
rep.x = expanded.x; rep.y = expanded.y - rep.height - 24
