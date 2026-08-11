// 공유 카드 라이트 전환 + 회차 케이스 — 코드 역싱크 (2026-08-12, 커밋 014ba2d)
// "Design System - work" 페이지의 기존 '공유 카드' 프레임 오른쪽에 새 열로 4장을 만든다.
// 기존 프레임은 건드리지 않는다 — 비교하고 직접 지울 것.
//
// 왜 라이트인가: 2.0에서 다크모드를 폐지해 서비스가 라이트 단일 테마인데 공유 카드만 다크였다.
// 왜 회차 카드인가: 회차까지 골라 공유한 링크(?showtime=)가 실제로 있고, 코드는 이미 그 카드를
// 굽는다(/api/og). 피그마에만 없어서 채운다.
//
// Scripter에서 Run.

/* ── 색: 전부 2.0 컬렉션 변수로 바인딩. 리터럴은 폴백일 뿐이다 ── */
const HEX = {
  'neutral/100': '#FAF9F8',  // surface/bg — 카드 배경
  'neutral/200': '#EAE5E1',  // 포스터 자리
  'neutral/600': '#726B65',  // 메타
  'neutral/900': '#0C0A08',  // 제목
  'primary/100': '#ECEFF9',  // 칩 배경
  'primary/700': '#404E81',  // 워드마크
  'primary/900': '#1F2747',  // 칩 텍스트
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  if (!v) console.log(`⚠ 컬러 변수 없음: ${name} — 리터럴로 칠함`)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}

const KIMM = { family: 'KIMM_Bold', style: 'B' }
const PRE = (style) => ({ family: 'Pretendard', style })
for (const f of [KIMM, PRE('Regular'), PRE('SemiBold')]) await figma.loadFontAsync(f)

/* ── 워드마크: 컴포넌트 세트를 찾아 인스턴스를 만들고 벡터 색만 primary/700로 덮는다.
      배리언트 이름을 모르므로 기본 배리언트를 쓰고 색만 오버라이드한다 — 어느 배리언트든 결과가 같다. ── */
async function findWordmarkComponent() {
  await figma.loadAllPagesAsync()
  const sets = figma.root.findAll((n) => n.type === 'COMPONENT_SET' && n.name === '2.0/logo/wordmark')
  if (sets.length) return sets[0].defaultVariant || sets[0].children.find((c) => c.type === 'COMPONENT')
  const solo = figma.root.findAll((n) => n.type === 'COMPONENT' && n.name === '2.0/logo/wordmark')
  return solo[0] || null
}
const wordmarkComponent = await findWordmarkComponent()
if (!wordmarkComponent) console.log('⚠ 2.0/logo/wordmark 컴포넌트를 못 찾음 — 워드마크 없이 그린다')

function wordmark() {
  if (!wordmarkComponent) return null
  const inst = wordmarkComponent.createInstance()
  inst.name = '2.0/logo/wordmark'
  // 벡터 색만 primary/700으로 — 라이트 배경에선 primary/100(연한 틴트)이 안 읽힌다
  for (const n of inst.findAll((n) => 'fills' in n && Array.isArray(n.fills) && n.fills.length)) {
    n.fills = [paint('primary/700')]
  }
  return inst
}

/* ── 헬퍼 ── */
function frame(name, { dir = 'VERTICAL', gap = 0, pad = [0, 0, 0, 0], fill = null } = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = dir
  f.itemSpacing = gap
  f.paddingTop = pad[0]; f.paddingRight = pad[1]; f.paddingBottom = pad[2]; f.paddingLeft = pad[3]
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.fills = fill ? [paint(fill)] : []
  return f
}
function text(chars, { font = PRE('Regular'), size = 16, color = 'neutral/900', lh = null } = {}) {
  const t = figma.createText()
  t.fontName = font
  t.characters = chars
  t.fontSize = size
  t.fills = [paint(color)]
  if (lh) t.lineHeight = { value: lh, unit: 'PERCENT' }
  return t
}
/** 틴트 칩 — 2.0가 정한 짝: primary/100 면 위 primary/900 텍스트 (다크판의 900/200을 뒤집은 것) */
function chip(label, { size = 16, padV = 3, padH = 12 } = {}) {
  const c = frame(`chip · ${label}`, { dir: 'HORIZONTAL', pad: [padV, padH, padV, padH], fill: 'primary/100' })
  c.cornerRadius = 6
  c.appendChild(text(label, { font: PRE('SemiBold'), size, color: 'primary/900' }))
  return c
}
/** 1200×630 세로 카드 — 정보 위, 워드마크 아래 */
function stackCard(name, infoChildren) {
  const c = frame(name, { dir: 'VERTICAL', pad: [60, 80, 60, 80], fill: 'neutral/100' })
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.resize(1200, 630)
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'
  c.clipsContent = true

  const info = frame('info', { dir: 'VERTICAL', gap: 12 })
  c.appendChild(info)
  for (const child of infoChildren) {
    info.appendChild(child)
    if (child.name && child.name.startsWith('chip')) child.layoutAlign = 'MIN'  // 칩이 가로로 늘어나지 않게
  }
  const w = wordmark()
  if (w) c.appendChild(w)
  return c
}
/** 1200×630 가로 카드(영화) — 포스터 340×510 + 텍스트 열 */
function movieCard(name, infoChildren) {
  const c = frame(name, { dir: 'HORIZONTAL', gap: 60, pad: [60, 80, 60, 80], fill: 'neutral/100' })
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'FIXED'
  c.resize(1200, 630)
  c.clipsContent = true

  const poster = frame('poster (340×510 · 실제는 원격 이미지)', { dir: 'VERTICAL', fill: 'neutral/200' })
  poster.primaryAxisSizingMode = 'FIXED'
  poster.counterAxisSizingMode = 'FIXED'
  poster.resize(340, 510)
  poster.cornerRadius = 16
  poster.primaryAxisAlignItems = 'CENTER'
  poster.counterAxisAlignItems = 'CENTER'
  c.appendChild(poster)
  poster.appendChild(text('poster', { size: 20, color: 'neutral/600' }))

  const col = frame('text', { dir: 'VERTICAL' })
  c.appendChild(col)
  col.layoutGrow = 1
  col.layoutSizingVertical = 'FILL'   // appendChild 뒤에만 먹는다
  col.primaryAxisAlignItems = 'SPACE_BETWEEN'

  const info = frame('info', { dir: 'VERTICAL', gap: 12 })
  col.appendChild(info)
  for (const child of infoChildren) {
    info.appendChild(child)
    if (child.name && child.name.startsWith('chip')) child.layoutAlign = 'MIN'
  }
  const w = wordmark()
  if (w) col.appendChild(w)
  return c
}
const title = (chars, size) => text(chars, { font: KIMM, size, color: 'neutral/900', lh: 110 })
const metaRow = (parts) => {
  const row = frame('meta', { dir: 'HORIZONTAL', gap: 12 })
  for (const p of parts) row.appendChild(text(p, { size: 22, color: 'neutral/600' }))
  return row
}

/* ── 페이지 선택: 기존 '공유 카드'가 있는 작업 페이지 ── */
await figma.loadAllPagesAsync()
const workPage = figma.root.children.find((p) => p.name === 'Design System - work') || figma.currentPage
await figma.setCurrentPageAsync(workPage)

/* ── 카드 4장 ── */
const cards = []

// 1. 영화 상세 — 기본 (장르 칩 + 감독·연도)
{
  const genres = frame('genres', { dir: 'HORIZONTAL', gap: 8 })
  genres.appendChild(chip('드라마'))
  genres.appendChild(chip('다큐멘터리'))
  cards.push(movieCard('OG · 영화 상세 · 라이트 (/films/movie/[id])', [
    genres,
    title('가능주의자', 72),
    metaRow(['박이윤정 감독', '·', '2025']),
  ]))
}

// 2. 영화 상세 — 회차 선택 (?showtime=). 장르·감독 대신 날짜 칩 + 시각·극장
cards.push(movieCard('OG · 영화 상세 · 회차 선택 (?showtime=)', [
  chip('8월 12일(수)', { size: 18, padV: 4, padH: 14 }),
  title('오케이 마담2', 72),
  metaRow(['08:00', '·', '제천시네마']),
]))

// 3. 극장 상세 — 기본 (도시 칩 + 주소)
cards.push(stackCard('OG · 극장 상세 · 라이트 (/films/theater/[id])', [
  chip('전라남도', { size: 18, padV: 4, padH: 14 }),
  title('목포아트시네마', 80),
  metaRow(['전라남도 목포시 영산로59번길 30']),
]))

// 4. 극장 상세 — 회차 선택. 코드는 이미 굽는데 피그마에만 없던 케이스
cards.push(stackCard('OG · 극장 상세 · 회차 선택 (?showtime=)', [
  chip('8월 12일(수)', { size: 18, padV: 4, padH: 14 }),
  title('제천시네마', 80),
  metaRow(['08:00', '·', '오케이 마담2']),
]))

// 5. 감독 상세 — 기본
cards.push(stackCard('OG · 감독 상세 · 라이트 (/films/director/[name])', [
  chip('감독', { size: 18, padV: 4, padH: 14 }),
  title('존 포드', 80),
  metaRow(['리버티 밸런스를 쏜 사나이 (1962) · 기병대 (1959) · 수색자 (1956)']),
]))

/* ── 배치: 기존 열 오른쪽에 새 열 ── */
const COL_X = 2931   // 기존 '시간표 선택' 프레임(x1616)에서 1200 + 여백 115
let y = 375
for (const c of cards) {
  workPage.appendChild(c)
  c.x = COL_X
  c.y = y
  y += 630 + 80
}

/* ── 공유 케이스 커버리지 노트 ── */
const noteTitle = text('공유 카드 2.0 (라이트) — 코드 역싱크 2026-08-12', { font: KIMM, size: 24, color: 'neutral/900', lh: 125 })
workPage.appendChild(noteTitle)
noteTitle.x = COL_X; noteTitle.y = 195

const note = text([
  '서비스가 라이트 단일 테마(2.0에서 다크모드 폐지)라 카드도 라이트로 뒤집었다. 칩은 primary/100 면 위 primary/900 — 2.0이 정한 틴트 짝.',
  '',
  '공유 진입점 7곳이 어느 카드로 떨어지는지:',
  '  1. 영화 상세 헤더            → 영화 카드(기본)',
  '  2. 영화 상세 회차 선택        → 영화 카드(회차)   ?date&theater&showtime',
  '  3. 극장 상세 헤더            → 극장 카드(기본)',
  '  4. 극장 상세 회차 선택        → 극장 카드(회차)   ?date&showtime',
  '  5. 감독 상세                → 감독 카드',
  '  6. 지도 극장 시트            → /map · 브랜드 og-image.png (극장별 카드 없음)',
  '  7. GV 상세 패널             → /map · 브랜드 og-image.png (이벤트별 카드 없음)',
  '',
  '6·7은 지도 상태를 복원하는 링크라 상세 라우트가 없다. 전용 카드가 필요하면 여기서 그리고 역싱크할 것.',
  '카드는 /api/og 라우트 핸들러가 굽는다 — 파일 규약(opengraph-image.tsx)은 searchParams를 못 받아 회차를 실을 수 없다.',
].join('\n'), { size: 16, color: 'neutral/600', lh: 160 })
workPage.appendChild(note)
note.x = COL_X; note.y = 245
note.resize(1200, note.height)

figma.currentPage.selection = cards
figma.viewport.scrollAndZoomIntoView(cards)
console.log(`라이트 공유 카드 ${cards.length}장 생성 (x=${COL_X}) — 기존 다크 카드는 그대로 뒀다. 비교 후 지울 것.`)
