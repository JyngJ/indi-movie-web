// 디자인 시스템 페이지 재배치 (2026-08-10)
//  · 새 페이지 "Design System fixed"를 만들고 섹션을 추상도 순으로 위에서 아래로 쌓는다
//    00 읽는 법 · 01 색상 · 02 타이포 · 03 스페이싱/래디우스/그림자 · 04 아이콘 · 05 로고
//    06 프리미티브 · 07 컴포넌트 · 08 지도 핀 · 09 모션·특수
//  · 지도 핀은 독립 섹션 — DivIcon으로 렌더되고 줌에 종속돼 규격 근거가 다른 컴포넌트와 다르다
//  · 1.0 배리언트(2.0/ 없는 세트) 삭제 — 덤프 확인 결과 인스턴스 0개라 깨질 시안 없음
//  · ASIS 시안 섹션 삭제
//  · 섹션 이름에서 날짜·버전·"제안/추출" 제거
// Scripter에서 Run. 되돌리려면 Figma 실행취소(⌘Z).

const report = []
const P = (style) => ({ family: 'Pretendard', style })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))

/* 2.0 컬렉션 색만 */
const HEX = { 'neutral/100': '#FAF9F8', 'neutral/600': '#726B65', 'neutral/900': '#0C0A08' }
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const colorVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.resolvedType === 'COLOR') colorVar.set(v.name, v)
  }
}
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] ?? '#FF00FF') }
  const v = colorVar.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}

const textStyles = await figma.getLocalTextStylesAsync()
const tStyle = (n) => textStyles.find(s => s.name === n)
async function ST(chars, styleName, colorName, fallback) {
  const t = figma.createText()
  const st = tStyle(styleName)
  if (st) await t.setTextStyleIdAsync(st.id)
  else { t.fontName = fallback?.font ?? P('Regular'); t.fontSize = fallback?.size ?? 12 }
  t.characters = chars
  t.fills = [paint(colorName)]
  t.textAutoResize = 'WIDTH_AND_HEIGHT'
  return t
}

/* ── 전 페이지 로드 후 인덱싱 ─────────────────────────────── */
for (const page of figma.root.children) await page.loadAsync()

const allSections = new Map()          // name -> SectionNode
const nodeByName = new Map()           // name -> COMPONENT_SET | COMPONENT
function index(n) {
  if (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') {
    if (!nodeByName.has(n.name)) nodeByName.set(n.name, n)
  }
  if ('children' in n && n.type !== 'COMPONENT_SET') for (const k of n.children) index(k)
}
for (const page of figma.root.children) {
  for (const n of page.children) {
    if (n.type === 'SECTION' && !allSections.has(n.name)) allSections.set(n.name, n)
    index(n)
  }
}

/* ── 새 페이지 ────────────────────────────────────────────── */
const PAGE_NAME = 'Design System fixed'
const existing = figma.root.children.find(p => p.name === PAGE_NAME)
if (existing) {
  // 지우려는 페이지가 현재 페이지면 먼저 다른 페이지로 옮겨야 한다
  if (figma.currentPage === existing) {
    const other = figma.root.children.find(p => p !== existing)
    if (other) await figma.setCurrentPageAsync(other)
  }
  existing.remove()
}
const page = figma.createPage()
page.name = PAGE_NAME
page.backgrounds = [{ type: 'SOLID', color: rgb('#FAF9F8') }]

const SECTION_GAP = 240
let cursorY = 0

function placeSection(sec) {
  page.appendChild(sec)
  sec.x = 0
  sec.y = cursorY
  cursorY += sec.height + SECTION_GAP
  return sec
}

/** 기존 섹션을 통째로 옮기고 이름만 바꾼다 (내부 배치는 그대로) */
function moveSection(oldName, newName) {
  const sec = allSections.get(oldName)
  if (!sec) { report.push('섹션 없음: ' + oldName); return null }
  sec.name = newName
  return placeSection(sec)
}

/** 세트/컴포넌트를 라벨과 함께 세로로 쌓는 새 섹션 */
async function buildSection(title, names) {
  const sec = figma.createSection()
  sec.name = title
  page.appendChild(sec)

  const root = figma.createFrame()
  root.name = 'items'
  root.layoutMode = 'VERTICAL'
  root.itemSpacing = 64
  root.paddingTop = 64; root.paddingBottom = 64; root.paddingLeft = 64; root.paddingRight = 64
  root.primaryAxisSizingMode = 'AUTO'
  root.counterAxisSizingMode = 'AUTO'
  root.counterAxisAlignItems = 'MIN'
  root.fills = [paint('neutral/100')]
  root.clipsContent = false
  sec.appendChild(root)
  root.x = sec.x; root.y = sec.y

  for (const name of names) {
    const node = nodeByName.get(name)
    if (!node) { report.push('노드 없음: ' + name); continue }
    const item = figma.createFrame()
    item.name = name
    item.layoutMode = 'VERTICAL'
    item.itemSpacing = 16
    item.primaryAxisSizingMode = 'AUTO'
    item.counterAxisSizingMode = 'AUTO'
    item.counterAxisAlignItems = 'MIN'
    item.fills = []
    item.clipsContent = false
    root.appendChild(item)
    item.appendChild(await ST(name, '2.0/body-strong', 'neutral/900', { font: P('Bold'), size: 14 }))
    item.appendChild(node)          // 세트를 그대로 이동 (인스턴스 링크 유지)
  }

  sec.resizeWithoutConstraints(root.width, root.height)
  placeSection(sec)
  return sec
}

/** 프레임 여러 개를 세로로 쌓는 새 섹션 (지도 핀 규격 프레임 등) */
function buildFrameSection(title, frames) {
  const sec = figma.createSection()
  sec.name = title
  page.appendChild(sec)
  let y = 0
  let w = 0
  for (const f of frames) {
    if (!f) continue
    sec.appendChild(f)
    f.x = sec.x
    f.y = sec.y + y
    y += f.height + 96
    w = Math.max(w, f.width)
  }
  sec.resizeWithoutConstraints(w || 400, Math.max(y - 96, 100))
  placeSection(sec)
  return sec
}

/* ── 00 읽는 법 ───────────────────────────────────────────── */
{
  const sec = figma.createSection()
  sec.name = '00 · 읽는 법'
  page.appendChild(sec)
  const root = figma.createFrame()
  root.name = 'guide'
  root.layoutMode = 'VERTICAL'
  root.itemSpacing = 24
  root.paddingTop = 64; root.paddingBottom = 64; root.paddingLeft = 64; root.paddingRight = 64
  root.primaryAxisSizingMode = 'AUTO'
  root.counterAxisSizingMode = 'AUTO'
  root.fills = [paint('neutral/100')]
  sec.appendChild(root)
  root.x = sec.x; root.y = sec.y
  root.appendChild(await ST('영화볼지도 디자인 시스템', '2.0/display/h2', 'neutral/900', { font: P('Bold'), size: 20 }))
  root.appendChild(await ST([
    '섹션은 추상도 순이다 — 토큰 → 아이콘·로고 → 프리미티브 → 컴포넌트 → 지도 핀 → 모션.',
    '찾을 때는 "이게 얼마나 작은 조각인가"로 좁혀 들어오면 된다.',
    '',
    '· 배리언트 격자는 가로가 종류·크기, 세로가 상태(default → selected/active → disabled)다.',
    '· 세트 이름의 2.0/ 은 현행 시스템이라는 뜻이다. 접두어 없는 구버전은 없앴다.',
    '· 지도 핀을 따로 둔 이유: DOM이 아니라 지도 DivIcon으로 렌더되고 크기가 줌에 종속돼,',
    '  앵커·아이콘 박스라는 다른 규격 근거를 갖는다. 다른 컴포넌트 규칙과 섞으면 안 된다.',
    '· 색은 "영화볼지도 색상 - 2.0" 컬렉션만 쓴다. Primitives·Semantic 컬렉션은 1.0 잔재라',
    '  같은 이름(primary/base 등)이 있어도 값이 다르다.',
  ].join('\n'), '2.0/body', 'neutral/600', { font: P('Regular'), size: 14 }))
  sec.resizeWithoutConstraints(root.width, root.height)
  placeSection(sec)
}

/* ── 01~03 토큰 · 04~05 아이콘·로고 (통째 이동) ──────────── */
moveSection('색상 토큰 완료', '01 · 색상')
moveSection('타이포그래피 완료', '02 · 타이포그래피')
moveSection('spacing / radius / shadow 완료', '03 · 스페이싱 · 래디우스 · 그림자')
moveSection('Iconography', '04 · 아이콘')
moveSection('logo', '05 · 로고')

/* ── 06 프리미티브 ────────────────────────────────────────── */
await buildSection('06 · 프리미티브', [
  '2.0/Button', '2.0/IconButton', '2.0/FAB', '2.0/ScrollNavButton',
  '2.0/Chip', '2.0/FilterPill', '2.0/FilterButton', '2.0/ActiveFilterChip', '2.0/SortToggle',
  '2.0/Avatar', '2.0/GhostAction',
])

/* ── 07 컴포넌트 ──────────────────────────────────────────── */
await buildSection('07 · 컴포넌트', [
  '2.0/ShowtimeCell', '2.0/ShowtimeGroupCard', '2.0/DateCell',
  '2.0/PosterItem', '2.0/MovieCard',
  '2.0/TheaterHeader', '2.0/DetailTopBar', '2.0/SectionHeader',
  '2.0/Dropdown', '2.0/DropdownRow',
  '2.0/SurveyChoice', '2.0/BookingCTA', '2.0/RegionHintBubble',
])

/* ── 08 지도 핀 (규격 프레임 통째로) ──────────────────────── */
{
  const gv = allSections.get('GV 핀 — 개선안 v3 (2026-08-10)')
  const poster = allSections.get('지도 포스터 핀 — 규격 v3 (2026-08-10)')
  const frames = []
  for (const [sec, label] of [[gv, 'GV 핀'], [poster, '포스터 핀']]) {
    if (!sec) { report.push('핀 섹션 없음: ' + label); continue }
    const root = sec.children.find(n => n.type === 'FRAME')
    if (root) { root.name = label; frames.push(root) }
  }
  buildFrameSection('08 · 지도 핀', frames)
  for (const sec of [gv, poster]) if (sec && sec.children.length === 0) sec.remove()
}

/* ── 09 모션 · 특수 ───────────────────────────────────────── */
moveSection('상영중 영사기 — 확정 (2026-08-09)', '09 · 모션 · 특수')

/* ── 정리: 1.0 배리언트 삭제 (인스턴스 0개 확인분) ────────── */
const LEGACY_SETS = ['Button', 'Badge', 'Chip', 'Input', 'FilterChip', 'PosterOverlayChip', 'PosterThumb', 'ShowtimeCell']
const deleted = []
for (const page2 of figma.root.children) {
  for (const n of page2.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
    if (LEGACY_SETS.includes(n.name)) {
      // 인스턴스가 하나라도 있으면 남긴다 (덤프상 0개지만 파일이 바뀌었을 수 있다)
      let used = false
      for (const v of n.children) {
        try { used = used || (await v.getInstancesAsync()).length > 0 }
        catch { used = used || (v.instances?.length ?? 0) > 0 }
      }
      if (used) { report.push('인스턴스가 있어 남김: ' + n.name); continue }
      deleted.push(n.name)
      n.remove()
    }
  }
}

/* ── 정리: ASIS 시안 삭제 ─────────────────────────────────── */
const asisRemoved = []
for (const page2 of figma.root.children) {
  for (const n of [...page2.children]) {
    if (n.type === 'SECTION' && n.name.includes('ASIS')) { asisRemoved.push(n.name); n.remove() }
  }
}

await figma.setCurrentPageAsync(page)
figma.viewport.scrollAndZoomIntoView(page.children)
figma.notify(`재배치 완료 — 1.0 세트 ${deleted.length}개·ASIS ${asisRemoved.length}개 삭제${report.length ? ` · 경고 ${report.length}` : ''}`)
console.log('삭제한 1.0 세트:', deleted.join(', ') || '없음')
console.log('삭제한 ASIS 섹션:', asisRemoved.join(', ') || '없음')
if (report.length) console.log('경고:\n' + [...new Set(report)].join('\n'))
