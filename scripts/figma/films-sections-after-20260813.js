// 상영작 탭 섹션 인벤토리 — 정리 후 (PR #284 반영, 2026-08-13)
//
//  films-sections-chips-20260813.js 로 그린 "FilmsTab 섹션 인벤토리 ASIS" 보드를 지우고
//  리팩터 반영본으로 다시 그린다. 포스터 오버레이 칩 보드는 이번 리팩터에서 바뀐 게 없어
//  건드리지 않는다.
//
//  반영 대상: refactor/films-section-archetypes (PR #284)
//    12f0388 죽은 displayMode prop 제거
//    496b759 특별전 포스터 행을 CurationSectionRow에 위임 (-329줄)
//    1d750cc 인라인 복제된 프리미티브 정리 + 섹션 리듬·연도 크기 통일
//
//  달라진 것: 아키타입 9종 → 8종 (E 특별전이 A에 흡수), D의 장르칩·연도가 프리미티브 값으로,
//  C의 모바일 리듬 24 → 32. 그리고 변경 로그 카드가 붙는다.
// Scripter에서 Run.

const report = []
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

/* ── 토큰 ─────────────────────────────────────────────────── */
const colorVar = new Map()
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (!col.name.includes('2.0')) continue
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v && v.resolvedType === 'COLOR' && !colorVar.has(v.name)) colorVar.set(v.name, v)
  }
}
const HEX = {
  'surface/bg': '#FAF9F8', 'surface/card': '#FFFFFF', 'surface/border': '#EAE5E1',
  'surface/raised': '#EAE5E1',
  'text/primary': '#0C0A08', 'text/sub': '#726B65', 'text/caption': '#857F76',
  'text/body': '#4A4540',
  'primary/base': '#404E81', 'primary/subtle': '#ECEFF9', 'status/gv': '#3E1782',
  'status/warning': '#B9800E', 'status/success': '#4A7C59', 'status/error': '#9B3331',
  'neutral/900': '#0C0A08', 'neutral/800': '#2B2622', 'neutral/300': '#C6BFB9',
  'neutral/200': '#EAE5E1', 'white': '#FFFFFF',
}
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] ?? '#FF00FF') }
  const v = colorVar.get(name)
  if (!v) { report.push('변수 없음: ' + name); return solid }
  return figma.variables.setBoundVariableForPaint(solid, 'color', v)
}
const raw = (hex, a) => ({ type: 'SOLID', color: rgb(hex), opacity: a == null ? 1 : a })

const P = (s) => ({ family: 'Pretendard', style: s })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))
let KIMM = { family: 'KIMM_Bold', style: 'B' }
try { await figma.loadFontAsync(KIMM) } catch {
  const fonts = await figma.listAvailableFontsAsync()
  const c = fonts.find(f => /KIMM/i.test(f.fontName.family))
  KIMM = c ? c.fontName : P('Bold')
  await figma.loadFontAsync(KIMM)
}

async function T(chars, o) {
  o = o || {}
  const t = figma.createText()
  t.fontName = o.font || P('Regular')
  t.fontSize = o.size == null ? 12 : o.size
  t.characters = chars
  t.fills = [o.rawFill ? o.rawFill : paint(o.color || 'text/primary')]
  if (o.ls) t.letterSpacing = { unit: 'PIXELS', value: o.ls }
  if (o.lh) t.lineHeight = { unit: 'PERCENT', value: o.lh }
  t.textAutoResize = 'WIDTH_AND_HEIGHT'
  if (o.w != null) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height) }
  if (o.strike) t.textDecoration = 'STRIKETHROUGH'
  return t
}
function F(name, o) {
  o = o || {}
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : o.dir === 'NONE' ? 'NONE' : 'VERTICAL'
  if (f.layoutMode !== 'NONE') {
    if (o.gap != null) f.itemSpacing = o.gap
    if (o.pad != null) {
      const p = Array.isArray(o.pad) ? o.pad : [o.pad, o.pad, o.pad, o.pad]
      f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3]
    }
    f.counterAxisAlignItems = o.align || 'MIN'
    if (o.mainAlign) f.primaryAxisAlignItems = o.mainAlign
    if (o.wrap) f.layoutWrap = 'WRAP'
  }
  f.fills = o.fill ? [typeof o.fill === 'string' ? paint(o.fill) : o.fill] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.w != null) f.resize(o.w, o.h == null ? f.height : o.h)
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else if (f.layoutMode === 'VERTICAL') {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  if (o.stroke) { f.strokes = [typeof o.stroke === 'string' ? paint(o.stroke) : o.stroke]; f.strokeWeight = o.strokeW == null ? 1 : o.strokeW; f.strokeAlign = 'INSIDE' }
  f.clipsContent = o.clip == null ? false : o.clip
  return f
}

/* ── 페이지 · 자리 ─────────────────────────────────────────── */
const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('페이지 "Design System - work" 없음'); throw new Error('page missing') }
await page.loadAsync()

const OLD_A = 'FilmsTab 섹션 인벤토리 ASIS (2026-08-13)'
const NAME_A = 'FilmsTab 섹션 인벤토리 (2026-08-13 · PR #284 반영)'
const NAME_B = '포스터 오버레이 칩 ASIS (2026-08-13)'

/* 이전 보드 자리를 물려받는다 — 칩 보드(B)와 나란히 서야 한다 */
let anchorX = 0, anchorY = 0
const prevA = page.children.find(n => n.name === OLD_A || n.name === NAME_A)
if (prevA) { anchorX = prevA.x; anchorY = prevA.y; prevA.remove() }
else {
  const b = page.children.find(n => n.name === NAME_B)
  if (b) { anchorX = b.x - 1340; anchorY = b.y }
  else {
    let maxY = 0
    for (const n of page.children) maxY = Math.max(maxY, n.y + n.height)
    anchorY = maxY + 400
    report.push('이전 보드를 못 찾아 페이지 맨 아래에 새로 놓았다')
  }
}

/* ── 공통 조각 ─────────────────────────────────────────────── */
async function card(host, title, desc, w) {
  const c = F('card/' + title, {
    dir: 'V', gap: 20, pad: 24, r: 16, w,
    fill: 'surface/card', stroke: 'surface/border', strokeW: 1.5,
  })
  host.appendChild(c)
  const head = F('head', { dir: 'V', gap: 4 })
  c.appendChild(head)
  head.appendChild(await T(title, { font: P('Bold'), size: 14 }))
  if (desc) head.appendChild(await T(desc, { font: P('Regular'), size: 12, color: 'text/sub', lh: 155 }))
  return c
}
async function tag(label, fillHex, textHex) {
  const t = F('tag', { dir: 'H', pad: [4, 8, 4, 8], r: 4, fill: raw(fillHex), align: 'CENTER' })
  t.appendChild(await T(label, { font: P('SemiBold'), size: 10, rawFill: raw(textHex) }))
  return t
}
function poster(w, h, r) {
  const p = F('poster', { dir: 'NONE', w: w, h: h, r: r == null ? 6 : r, fill: 'neutral/200' })
  p.clipsContent = false
  return p
}

const SRC = {
  realtime:  ['실시간 상영 데이터', '#ECEFF9', '#404E81'],
  curation:  ['큐레이션 DB',        '#E4F1E8', '#2B5036'],
  personal:  ['개인화 · 이력',       '#FDF1D8', '#885907'],
  external:  ['외부 수집',           '#E7DCF9', '#3E1782'],
  derived:   ['파생 · 집계',         '#F5E1E0', '#9B3331'],
}

/* 아키타입 — E(특별전)가 A로 흡수돼 8종이 됐다 */
const ARCH = {
  A: ['A · 가로 스크롤 행', '#ECEFF9', '#404E81'],
  B: ['B · sparse 카드', '#ECEFF9', '#404E81'],
  C: ['C · 기념일 rich', '#FDF1D8', '#885907'],
  D: ['D · 기념일 sparse', '#FDF1D8', '#885907'],
  F: ['F · 인스타 히어로', '#E7DCF9', '#3E1782'],
  G: ['G · 영화제 배너', '#E7DCF9', '#3E1782'],
  H: ['H · 감독 아바타', '#F5E1E0', '#9B3331'],
  I: ['I · 전체 그리드', '#F5E1E0', '#9B3331'],
}
function archOf(id) {
  if (id === 'festival_banner') return ['G']
  if (id === 'instagram_recs') return ['F']
  if (id === 'anniversary') return ['C', 'D']
  if (id === 'director_special' || id === 'director_special_2') return ['A']   // 이제 A를 쓴다
  if (id === 'director_spotlight') return ['H']
  if (id === 'all_movies_grid') return ['I']
  return ['A', 'B']
}

const SECTIONS = [
  { grp: '고정 상단 — run 번호 체계 밖' },
  { no: 'A', title: '주목할 영화제', desc: '(배너 카드 — 포스터 행 아님)', id: 'festival_banner',
    gate: 'festivals.length > 0 · 지역 필터 무관 전국', cap: 'FestivalBannerCard 단독 레이아웃', src: 'external' },
  { no: 'B', title: '이런 작품은 어때요', desc: '최근 조회 이력 기반 추천', id: 'personalized',
    gate: '최근 본 영화 이력 있을 때만', cap: '기본 캡션(감독·장르칩·연도)', src: 'personal' },
  { no: 'C', title: '기념일 (생몰일)', desc: '오늘 생일·기일인 인물의 상영작', id: 'anniversary',
    gate: '3편↑=단독 행 / 2편↓=카드, PC는 2열 페어링', cap: 'AnniversarySection 자체 헤더', src: 'curation' },
  { no: 'D', title: '특별전 #0', desc: '같은 극장에서 같은 감독 영화가 몰릴 때', id: 'director_special',
    gate: '동일 극장 · 동일 감독 3편↑ · 최대 2개', cap: '자체 헤더(감독·극장·거리) + 행은 A에 위임', src: 'derived' },
  { no: 'E', title: '인스타그램에서 추천한 그 영화', desc: '발견 성격이라 시의성 run1보다 위', id: 'instagram_recs',
    gate: '수집된 추천 있을 때', cap: '영화제 상태 배지(포스터 우하단)', src: 'external' },

  { grp: 'run1 — 시의성 최상단 (30일 CTR 기준 재배치)' },
  { no: 0, title: '지금 출발하면 볼 수 있는', desc: '지금 출발하면 늦지 않게 볼 수 있는 회차예요', id: 'realtime_leave_now',
    gate: '3편 미만이면 섹션 숨김 · 위치 권한 필요', cap: '캡션 2줄: 시간 / 극장명', src: 'realtime' },
  { no: 1, title: '막바지 상영', desc: '상영관이 줄고 있어요. 미리 확인하고 예매하세요', id: 'realtime_last_week',
    gate: '3편 미만이면 숨김', cap: '포스터 우상단 D-N 배지 (오늘=error / D-1=warning / 그 외 #78716C)', src: 'realtime' },
  { no: 2, title: '매진 임박', desc: '최근 확인 기준, 오늘·내일 회차의 좌석이 얼마 남지 않았어요', id: 'realtime_almost_soldout',
    gate: '3편 미만이면 숨김 · 좌석 크롤 데이터 의존', cap: '캡션 + customBottomInfo (잔여석)', src: 'realtime' },

  { grp: '특별전 #1 (interleave)' },
  { no: 'F', title: '특별전 #1', desc: '특별전이 2개 있을 때만 run1과 run2 사이에 낀다', id: 'director_special_2',
    gate: 'specialDirectorSections[1] 존재 시', cap: '특별전 #0과 동일', src: 'derived' },

  { grp: 'run2 — 나머지 전부' },
  { no: 3, title: '지금 예매 많은 영화', desc: '최근 7일, 예매하러 가장 많이 떠난 영화들이에요', id: 'realtime_booking_rank',
    gate: '현재 상영작만 · 상위 10 · 3편 미만 숨김', cap: '캡션 "예매 N위"', src: 'derived' },
  { no: 4, title: '이번 주 많이 찾아본 영화', desc: '최근 7일 동안 사람들이 가장 많이 들여다본 영화들이에요', id: 'realtime_view_rank',
    gate: '현재 상영작만 · 상위 10 · 3편 미만 숨김', cap: '캡션 "조회 N위"', src: 'derived' },
  { no: 5, title: '이번 주말 상영', desc: '이번 주말 볼 수 있는 회차예요', id: 'realtime_weekend',
    gate: '3편 미만이면 숨김', cap: '캡션 2줄 + customBottomInfo', src: 'realtime' },
  { no: 6, title: '이번 주 새롭게 상영하는 영화', desc: '이번 주 스크린에 새로 오른 영화들', id: 'realtime_new_indie',
    gate: '해당 영화 없으면 숨김', cap: '기본 캡션', src: 'realtime' },
  { no: 7, title: '오랜만에 상영하는 영화', desc: '잠시 사라졌다가 다시 스크린으로 돌아온 영화들', id: 'realtime_returning',
    gate: '해당 영화 없으면 숨김', cap: '캡션: 제작연도 (15년↑ 작품에만)', src: 'realtime' },
  { no: 8, title: '심야 상영', desc: '하루의 끝, 밤 깊은 시간에 시작하는 회차들이에요', id: 'realtime_late_night',
    gate: '3편 미만이면 숨김', cap: '캡션 2줄 + customBottomInfo', src: 'realtime' },
  { no: 9, title: '{지역}에서 단 한 곳', desc: '이 지역에서는 이 극장에서만 상영해요', id: 'realtime_solo_theater',
    gate: '3편 미만 또는 지역 미선택이면 숨김', cap: '캡션: 극장명', src: 'realtime' },
  { no: 10, title: '퇴근 후 부담 없는, 100분 이내', desc: '짧아서 더 오래 남는 영화들이에요', id: 'realtime_short_runtime',
    gate: '러닝타임 60~100분 · 3편 미만 숨김', cap: '캡션 "N분"', src: 'realtime', isNew: true },
  { no: 11, title: '개봉 N주년, 다시 스크린에', desc: '올해로 딱 떨어지는 주년을 맞아 돌아온 영화들이에요', id: 'realtime_release_anniversary',
    gate: '10의 배수 주년 · 현재 상영작 · 3편 미만 숨김', cap: '캡션 "개봉 N주년"', src: 'realtime', isNew: true },
  { no: 12, title: '테마 — 상황·감정 (SECTION_GROUP 6)', desc: '9종: 눈물 / 힐링 / 아무생각 / 영상미 / 노스포 / 비 오는 날 / 새벽 / 흑백 / 원작소설', id: 'theme_*',
    gate: '리스트별 min_n 미달이면 숨김', cap: '기본 캡션', src: 'curation', isNew: true },
  { no: 13, title: '3시간, 각오하고 보는 영화', desc: '긴 호흡만이 데려갈 수 있는 곳이 있어요', id: 'realtime_long_runtime',
    gate: '러닝타임 180분↑ · 3편 미만 숨김', cap: '캡션 "N분"', src: 'realtime', isNew: true },
  { no: 14, title: '영화제 · 수상 (그룹 2)', desc: '칸 황금종려 / 베니스 황금사자 / 베를린 황금곰 / 아카데미 작품상 / 거장의 데뷔작', id: 'festival_* · collection_masters_debut',
    gate: 'min_n 미달이면 숨김', cap: '기본 캡션 (수상 워터마크는 sparse 카드에만)', src: 'curation' },
  { no: 15, title: '시기별 (그룹 1)', desc: '여름 호러 / 발렌타인 로맨스 / 크리스마스 / 연말 / 여름밤', id: 'seasonal_* · summer_horror · valentine_romance · theme_summer_night',
    gate: 'isInSeason 통과 + min_n', cap: '기본 캡션', src: 'curation' },
  { no: 16, title: '연도별 (그룹 3)', desc: '90년대 / 2000년대', id: 'decade_90s · decade_00s',
    gate: 'min_n 미달이면 숨김', cap: '기본 캡션', src: 'curation' },
  { no: 17, title: '평론가 (그룹 4)', desc: '박평식 / 이동진', id: 'critic_*',
    gate: 'min_n 미달이면 숨김', cap: '기본 캡션', src: 'curation' },
  { no: 18, title: '무브먼트 (그룹 5)', desc: '대만 뉴웨이브 / 누벨바그 / 홍콩 예술영화', id: 'movement_*',
    gate: 'min_n 미달이면 숨김', cap: '기본 캡션', src: 'curation' },

  { grp: '고정 하단' },
  { no: 'G', title: '감독 스포트라이트', desc: '(포스터 행 아님 — 감독 카드)', id: 'director_spotlight',
    gate: '조건 충족 감독 있을 때', cap: 'DirectorSpotlightSection 자체 레이아웃', src: 'derived' },
  { no: 'H', title: '전체 상영작', desc: '(그리드 — 행 아님)', id: 'all_movies_grid',
    gate: '항상', cap: '그리드 카드 + 상영관 수', src: 'realtime' },
]

const BOARD_W = 1180
const boardA = F(NAME_A, { dir: 'V', gap: 32, pad: 64, fill: 'surface/bg' })
page.appendChild(boardA)
boardA.x = anchorX
boardA.y = anchorY

/* 헤더 */
{
  const head = F('header', { dir: 'V', gap: 8 })
  boardA.appendChild(head)
  head.appendChild(await T('상영작 탭 — 섹션 인벤토리', { font: KIMM, size: 32, ls: 1.6 }))
  head.appendChild(await T([
    '2026-08-13 코드 기준 · PR #284(중복·죽은 코드 정리) 반영본.',
    '문구·조건·캡션 사양은 FilmsClient.tsx / CurationSectionRow.tsx에서 그대로 옮겼다. 추정 없음.',
    '순번은 화면에 나오는 순서다. run1/run2의 position(애널리틱스 값)은 이것과 다르다 — 개인화·기념일·특별전은 번호 체계 밖이라 run 내 상대 순번만 실린다.',
    '행 생김새는 하나가 아니라 8종이다. 정리 전엔 9종이었고, 특별전(E)이 A로 흡수되며 하나 줄었다.',
  ].join('\n'), { font: P('Regular'), size: 14, color: 'text/sub', lh: 155 }))
}

/* ── 변경 로그 ─────────────────────────────────────────────── */
{
  const c = await card(boardA, '2026-08-13 정리 (PR #284)',
    '섹션 순서·디자인은 아직 안 건드렸다. 같은 걸 두 번 그린 자리와 죽은 코드만 걷어낸 상태다.', BOARD_W - 128)

  const tbl = F('tbl', { dir: 'V', gap: 0, w: BOARD_W - 128 - 48, stroke: 'surface/border', r: 8, clip: true })
  c.appendChild(tbl)
  const W = BOARD_W - 128 - 48
  const COLS = [Math.round(W * 0.22), Math.round(W * 0.39), W - Math.round(W * 0.22) - Math.round(W * 0.39)]
  async function tr(a, b, d, head) {
    const r = F('tr', { dir: 'H', gap: 0, w: W, fill: head ? 'surface/raised' : 'surface/card' })
    tbl.appendChild(r)
    const cells = [[a, COLS[0]], [b, COLS[1]], [d, COLS[2]]]
    for (let i = 0; i < cells.length; i++) {
      const cf = F('td', { dir: 'V', pad: [10, 12, 10, 12], w: cells[i][1] })
      r.appendChild(cf)
      cf.appendChild(await T(cells[i][0], {
        font: head ? P('Bold') : P('Regular'), size: 11,
        color: head ? 'text/primary' : (i === 2 ? 'text/primary' : 'text/sub'),
        lh: 150, w: cells[i][1] - 24,
      }))
    }
  }
  await tr('항목', '정리 전', '정리 후', true)
  await tr('displayMode prop', "'year' | 'genre' | 'default' — 전 섹션이 넘기는데 아무도 안 읽음", '타입·prop·호출처 전부 삭제 (렌더 변화 없음)')
  await tr('특별전 포스터 행', 'MovieCard·HoverPopup·스크롤·마스크를 통째로 복사 (390줄)', 'CurationSectionRow(noHeader)에 위임 (80줄, -329줄)')
  await tr('특별전 스크롤', '네이티브 overflow + scrollRailBy — 화살표 연타 시 거리 누적', 'embla Carousel — 진행 중 요청을 흡수')
  await tr('특별전 화살표', 'hover 조건부 마운트 — 클릭 직전 언마운트되어 첫 클릭 증발', '항상 마운트 + opacity/pointer-events로만 감춤')
  await tr('특별전 hover 팝업', '180ms 지연 (원본은 400ms)', '400ms — 다른 행과 동일')
  await tr('특별전 장르칩', '인라인 복제 10px', 'GenreChip 프리미티브 12px · padding 4/8')
  await tr('기념일 sparse 장르칩', '인라인 복제 10px · padding 4 균등', 'GenreChip 프리미티브 12px · padding 4/8')
  await tr('연도 fontSize', '12 / 10 / 10 — 한 화면에 세 크기', '--text-meta 12로 일원화')
  await tr('기념일 섹션 리듬', '모바일 24 (다른 섹션은 32)', '모바일 32 · PC 48')
  await tr('GV 넘김 버튼', '32px 원형을 인라인으로 다시 그림 (반투명 + blur)', 'ScrollNavButton 프리미티브')
  await tr('맨 위로 버튼', '40px 인라인 · 그림자 하드코딩 · hit area 44 미만', 'FabRound 프리미티브 44 · --shadow-md')
  await tr('LeftPanel (특별전)', '140줄이 정의만 되고 한 번도 렌더 안 됨', '삭제 (딸린 hashColor·AVATAR_COLORS·onDirectorClick 포함)')

  const gate = F('gate', { dir: 'V', gap: 6, pad: 16, r: 12, fill: 'primary/subtle', w: W })
  c.appendChild(gate)
  gate.appendChild(await T('감사 게이트', { font: P('Bold'), size: 12, color: 'primary/base' }))
  gate.appendChild(await T([
    '프리미티브 채택률 48.3 → 48.7 · REVIEW 81 → 78 · gutter 53 → 51 · color 28 → 27.',
    'tsc · build(webpack) · audit:ui:check 통과. baseline 하향 반영해서 같이 커밋.',
  ].join('\n'), { font: P('Regular'), size: 11, color: 'primary/base', lh: 155, w: W - 32 }))
}

/* ── 아키타입 8종 ───────────────────────────────────────────── */
{
  const c = await card(boardA, '행 아키타입 8종',
    '섹션마다 생김새가 다르다. 정리 전엔 9종이었고, 특별전이 자체 포스터 행을 버리고 A를 쓰면서 하나 줄었다.', BOARD_W - 128)

  const gal = F('gal', { dir: 'H', gap: 24, wrap: true, w: BOARD_W - 128 - 48, align: 'MIN' })
  c.appendChild(gal)

  async function archCard(key, build, specs) {
    const a = ARCH[key]
    const col = F('arch/' + key, { dir: 'V', gap: 10, w: 500 })
    gal.appendChild(col)
    const head = F('h', { dir: 'H', gap: 8, align: 'CENTER' })
    col.appendChild(head)
    head.appendChild(await tag(a[0], a[1], a[2]))
    const box = F('box', { dir: 'V', gap: 0, w: 500, pad: 16, r: 12, fill: 'surface/card', stroke: 'surface/border', clip: true })
    col.appendChild(box)
    await build(box)
    const sp = F('sp', { dir: 'V', gap: 4 })
    col.appendChild(sp)
    for (const s of specs) sp.appendChild(await T('· ' + s, { font: P('Regular'), size: 11, color: 'text/sub', lh: 150, w: 500 }))
    return col
  }

  /* 캡션 3줄 — 이제 전 아키타입이 GenreChip 12/4-8 · 연도 12로 같다 */
  async function caption(host, w, titleSize, subSize) {
    const info = F('info', { dir: 'V', gap: 4, w: w })
    host.appendChild(info)
    info.appendChild(await T('영화 제목', { font: P('Bold'), size: titleSize, color: 'text/body', lh: 130 }))
    info.appendChild(await T('감독명', { font: P('Regular'), size: subSize, color: 'text/caption' }))
    const gr = F('genre', { dir: 'H', gap: 4, align: 'CENTER' })
    info.appendChild(gr)
    const gc = F('GenreChip', { dir: 'H', pad: [4, 8, 4, 8], r: 9999, fill: 'surface/raised', stroke: 'surface/border', align: 'CENTER', mainAlign: 'CENTER' })
    gr.appendChild(gc)
    gc.appendChild(await T('드라마', { font: P('Regular'), size: 12, color: 'text/caption' }))
    gr.appendChild(await T('2024', { font: P('SemiBold'), size: 12, color: 'text/caption' }))
    return info
  }

  /* A */
  await archCard('A', async (box) => {
    const h = F('h', { dir: 'V', gap: 4, pad: [0, 0, 0, 8] })
    box.appendChild(h)
    h.appendChild(await T('막바지 상영', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    h.appendChild(await T('상영관이 줄고 있어요. 미리 확인하고 예매하세요', { font: P('Regular'), size: 12, color: 'text/caption', lh: 150 }))
    const row = F('row', { dir: 'H', gap: 10, pad: [16, 0, 0, 8] })
    box.appendChild(row)
    for (let i = 0; i < 3; i++) {
      const cc = F('card', { dir: 'V', gap: 8 })
      row.appendChild(cc)
      const pw = poster(120, 180, 6)
      cc.appendChild(pw)
      if (i === 0) {
        const chip = F('chip/D-day', { dir: 'H', pad: [4, 8, 4, 8], r: 4, fill: 'status/error', align: 'CENTER' })
        pw.appendChild(chip)
        chip.appendChild(await T('오늘', { font: P('SemiBold'), size: 10, color: 'white' }))
        chip.x = 120 - chip.width - 6; chip.y = 6
      }
      await caption(cc, 120, 14, 12)
    }
  }, [
    'CurationSectionRow (기본) — 섹션 21개가 이걸 쓴다 (특별전 흡수로 20 → 21)',
    '포스터 모바일 120×180 · PC 210×315 / 행 gap 10 · 16',
    '헤더는 종이 위 플랫 · 거터 --gutter-sheet 24 · 리듬 모바일 32 · PC 48',
    '캡션 제목 14(PC 16)/700 2줄 클램프 · 보조 12(PC 14) · GenreChip 12 · 연도 --text-meta 12',
    '스크롤 = embla Carousel (드래그 관성 · 연타 흡수 · 화살표 1회 3편)',
    '화살표는 항상 마운트 + opacity로만 감춤 (rage click 대응)',
    '포스터 hover scale 1.1 130ms · 400ms 후 HoverPopup 220px (PC)',
    '특별전은 자체 헤더(감독·극장·거리)만 얹고 행은 이걸 그대로 쓴다',
  ])

  /* B */
  await archCard('B', async (box) => {
    const cardBox = F('CardContainer', { dir: 'V', gap: 0, w: 300, r: 12, fill: 'surface/card', stroke: 'surface/border', clip: true })
    box.appendChild(cardBox)
    const h = F('h', { dir: 'V', gap: 4, pad: [12, 16, 12, 16] })
    cardBox.appendChild(h)
    h.appendChild(await T('칸 황금종려상', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    cardBox.appendChild(F('rule', { dir: 'H', w: 300, h: 1, fill: 'surface/border' }))
    const stack = F('stack', { dir: 'V', gap: 16, pad: [12, 16, 12, 16] })
    cardBox.appendChild(stack)
    for (let i = 0; i < 2; i++) {
      const rowi = F('film', { dir: 'H', gap: 8, align: 'MIN' })
      stack.appendChild(rowi)
      rowi.appendChild(poster(108, 162, 6))
      await caption(rowi, 140, 14, 12)
    }
  }, [
    'CurationSectionRow (compact) — 같은 컴포넌트의 다른 분기',
    '전환 조건: movies.length ≤ 2 (섹션 종류와 무관, 그날 편수로 갈림)',
    'CardContainer로 감싸고 헤더가 카드 안 + 1px 하단 구분선',
    '포스터 108×162 · 세로 스택 gap 16',
    '연도 --text-badge 10 → --text-meta 12로 교정 (A와 동일)',
    '칸·베니스에만 수상 문양 워터마크 (우측 -16% · 회전 -10° · opacity 0.07)',
    'PC는 2개를 짝지어 2열, 짝이 없으면 단독 1열',
  ])

  /* C */
  await archCard('C', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 0, w: 440 })
    box.appendChild(wrap)
    const h = F('h', { dir: 'V', gap: 4, pad: [0, 0, 12, 0] })
    wrap.appendChild(h)
    h.appendChild(await T('오늘은 오즈 야스지로가 태어난 날', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    h.appendChild(await T('1903 — 1963 · 오늘 볼 수 있는 작품', { font: P('Regular'), size: 12, color: 'text/caption' }))
    const framed = F('framed', { dir: 'H', gap: 10, w: 440, pad: 12, fill: 'surface/card', stroke: 'surface/border', clip: true })
    framed.topLeftRadius = 0; framed.topRightRadius = 0
    framed.bottomLeftRadius = 10; framed.bottomRightRadius = 10
    wrap.appendChild(framed)
    for (let i = 0; i < 3; i++) {
      const cc = F('card', { dir: 'V', gap: 8 })
      framed.appendChild(cc)
      cc.appendChild(poster(120, 180, 6))
      await caption(cc, 120, 14, 12)
    }
  }, [
    'AnniversarySection (3편↑) + CurationSectionRow noHeader',
    '자체 헤더를 쓰고, 포스터 행만 CurationSectionRow에 위임한다',
    '행을 1px 테두리로 감싸고 radius 0 0 10 10 — 헤더와 붙은 것처럼',
    '포스터는 A와 동일 (120×180 · 210×315)',
    'paddingTop 모바일 24 → 32로 교정 (다른 섹션과 같은 리듬)',
  ])

  /* D */
  await archCard('D', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 0, w: 320 })
    box.appendChild(wrap)
    const h = F('h', { dir: 'V', gap: 4, pad: [0, 0, 12, 0] })
    wrap.appendChild(h)
    h.appendChild(await T('오늘 세상을 떠난 감독', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const framed = F('framed', { dir: 'H', gap: 12, w: 320, pad: [12, 16, 12, 16], fill: 'surface/card', stroke: 'surface/border', clip: true })
    framed.topLeftRadius = 0; framed.topRightRadius = 0
    framed.bottomLeftRadius = 10; framed.bottomRightRadius = 10
    wrap.appendChild(framed)
    const rowi = F('film', { dir: 'H', gap: 8, align: 'MIN' })
    framed.appendChild(rowi)
    rowi.appendChild(poster(90, 135, 6))
    await caption(rowi, 150, 14, 12)
  }, [
    'AnniversarySection (2편↓) — B와 그림은 비슷하나 레이아웃이 다르다',
    'D는 카드 안에서 가로 2열 · B는 세로 스택 — 그래서 포스터도 90×135 vs 108×162',
    '장르칩 인라인 복제 → GenreChip 프리미티브, 연도 10 → 12로 교정',
    'CardContainer를 안 쓰고 border를 직접 그린다 (헤더와 이어붙는 radius 때문)',
    '⚠ B와의 통합은 아직 — 레이아웃이 달라 디자인 결정이 필요하다',
  ])

  /* F */
  await archCard('F', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 12, w: 440 })
    box.appendChild(wrap)
    wrap.appendChild(await T('인스타그램에서 추천한 그 영화', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const hero = F('hero', { dir: 'NONE', w: 440, h: 260, r: 12, fill: raw('#0C0A08'), clip: true })
    wrap.appendChild(hero)
    const img = F('img', { dir: 'NONE', w: 273, h: 260, fill: 'neutral/300' })
    hero.appendChild(img); img.x = 0; img.y = 0
    const cap = F('cap', { dir: 'V', gap: 4 })
    hero.appendChild(cap); cap.x = 20; cap.y = 20
    cap.appendChild(await T('@cinephile_kr', { font: P('SemiBold'), size: 11, rawFill: raw('#FFFFFF') }))
    cap.appendChild(await T('이 계정이 추천한 영화', { font: P('Bold'), size: 15, rawFill: raw('#FFFFFF') }))
    const strip = F('strip', { dir: 'H', gap: 8 })
    hero.appendChild(strip); strip.x = 320; strip.y = 36
    for (let i = 0; i < 2; i++) strip.appendChild(poster(125, 188, 6))
  }, [
    'InstagramRecsSection — 행이 아니라 히어로 카드',
    'PC 높이 260 고정 · 모바일 aspect-ratio 4/3',
    '이미지가 왼쪽 62%, 오른쪽으로 갈수록 검정 (mask 52%→투명)',
    '포스터 스트립이 검정 위에 얹힌다 — PC left 320 / 모바일 하단 띠',
    '영화제 카드엔 상태 배지(우하단), 영화 카드엔 칩 없음',
  ])

  /* G */
  await archCard('G', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 12, w: 440 })
    box.appendChild(wrap)
    wrap.appendChild(await T('주목할 영화제', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const band = F('band', { dir: 'H', w: 440, h: 84, fill: 'surface/raised', align: 'CENTER', mainAlign: 'CENTER' })
    wrap.appendChild(band)
    band.appendChild(F('banner', { dir: 'H', w: 332, h: 63, fill: 'neutral/300' }))
  }, [
    'FilmsClient 안에 인라인 정의 (FestivalBannerCard)',
    '배너 비율 21:4 · PC 고정폭 662 (포스터 210×3 + gap 16×2)',
    'PC는 양옆 빈 공간을 surface-raised로 채운다 · 모바일은 100% 꽉',
    '헤더에 ChevronRight trailing — 다른 섹션엔 없는 어포던스',
    'banner_url 죽으면(403·삭제) 통째 숨김',
  ])

  /* H */
  await archCard('H', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 12, w: 440 })
    box.appendChild(wrap)
    wrap.appendChild(await T('이 감독들도 지금 극장에', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const rowH = F('row', { dir: 'H', gap: 12 })
    wrap.appendChild(rowH)
    for (let i = 0; i < 5; i++) {
      const cc = F('d', { dir: 'V', gap: 8, w: 96, align: 'CENTER' })
      rowH.appendChild(cc)
      cc.appendChild(F('av', { dir: 'H', w: 80, h: 80, r: 40, fill: 'neutral/300' }))
      cc.appendChild(await T('감독명', { font: P('Medium'), size: 12, color: 'text/body' }))
    }
  }, [
    'DirectorSpotlightSection — 포스터가 아예 없다',
    '원형 아바타 PC 80 · 모바일 64 / 칸 폭 = size + 16',
    '사진 없으면 이름 해시 색으로 채움',
    '⚠ Avatar 프리미티브가 있는데 안 쓴다 — 아직 인라인 (다음 정리 후보)',
    'hover-lift (scale 1.03) — A의 포스터 hover(1.1)와 다른 값',
  ])

  /* I */
  await archCard('I', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 12, w: 440 })
    box.appendChild(wrap)
    wrap.appendChild(await T('전체 상영작', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const grid = F('grid', { dir: 'H', gap: 20, wrap: true, w: 440 })
    wrap.appendChild(grid)
    for (let i = 0; i < 8; i++) {
      const cc = F('g', { dir: 'V', gap: 4, w: 95 })
      grid.appendChild(cc)
      cc.appendChild(poster(95, 142, 6))
      cc.appendChild(await T('영화 제목', { font: P('Bold'), size: 13, color: 'text/body' }))
      cc.appendChild(await T('3개 극장', { font: P('Regular'), size: 11, color: 'text/caption' }))
    }
  }, [
    'AllMoviesGrid — 가로 스크롤이 아니라 그리드',
    'PC 4열 gap 20 · 모바일 3열 gap 12',
    '포스터가 고정 px이 아니라 1fr · aspect-ratio 2/3 (유일하게 유동)',
    '정렬 드롭다운 + 무한 스크롤 sentinel',
    '캡션에 상영관 수가 붙는다 — 다른 아키타입엔 없는 정보',
  ])
}

/* ── 섹션 목록 ─────────────────────────────────────────────── */
{
  const c = await card(boardA, '렌더 순서 — 위에서부터', '이 카드의 행 순서를 바꾸는 게 곧 리뉴얼 결과물이다', BOARD_W - 128)
  const list = F('list', { dir: 'V', gap: 8 })
  c.appendChild(list)

  for (const s of SECTIONS) {
    if (s.grp) {
      const g = F('grp', { dir: 'H', gap: 8, align: 'CENTER', pad: [16, 0, 4, 0] })
      list.appendChild(g)
      g.appendChild(await T(s.grp, { font: P('Bold'), size: 11, color: 'primary/base', ls: 0.4 }))
      g.appendChild(F('rule', { dir: 'H', w: 700, h: 1, fill: 'surface/border' }))
      continue
    }

    const row = F('row/' + s.id, {
      dir: 'H', gap: 16, pad: 16, r: 12, align: 'MIN',
      fill: 'surface/card', stroke: 'surface/border', strokeW: 1,
      w: BOARD_W - 128 - 48,
    })
    list.appendChild(row)

    const num = F('no', { dir: 'H', w: 32, h: 32, r: 8, fill: s.isNew ? 'primary/base' : 'surface/raised', align: 'CENTER', mainAlign: 'CENTER' })
    row.appendChild(num)
    num.appendChild(await T(String(s.no), { font: P('Bold'), size: 13, color: s.isNew ? 'white' : 'text/sub' }))

    const mid = F('mid', { dir: 'V', gap: 6, w: 520 })
    row.appendChild(mid)
    const titleRow = F('titleRow', { dir: 'H', gap: 8, align: 'CENTER' })
    mid.appendChild(titleRow)
    titleRow.appendChild(await T(s.title, { font: KIMM, size: 20, ls: 1, lh: 130 }))
    if (s.isNew) titleRow.appendChild(await tag('NEW', '#ECEFF9', '#404E81'))
    mid.appendChild(await T(s.desc, { font: P('Regular'), size: 12, color: 'text/caption', lh: 150, w: 520 }))
    mid.appendChild(await T(s.id, { font: P('Medium'), size: 10, color: 'text/sub' }))

    const meta = F('meta', { dir: 'V', gap: 6, w: 300 })
    row.appendChild(meta)
    const tags = F('tags', { dir: 'H', gap: 4, wrap: true, w: 300 })
    meta.appendChild(tags)
    const st = SRC[s.src]
    tags.appendChild(await tag(st[0], st[1], st[2]))
    for (const k of archOf(s.id)) {
      const a = ARCH[k]
      tags.appendChild(await tag(a[0], a[1], a[2]))
    }
    meta.appendChild(await T('노출  ' + s.gate, { font: P('Regular'), size: 11, color: 'text/sub', lh: 150, w: 300 }))
    meta.appendChild(await T('캡션  ' + s.cap, { font: P('Regular'), size: 11, color: 'text/sub', lh: 150, w: 300 }))

    const mini = F('mini', { dir: 'H', gap: 6 })
    row.appendChild(mini)
    for (let i = 0; i < 3; i++) mini.appendChild(poster(40, 60, 4))
  }
}

/* ── 다음 ─────────────────────────────────────────────────── */
{
  const c = await card(boardA, '다음', '코드 정리는 끝났고, 여기부터는 디자인·데이터 결정이 필요하다', BOARD_W - 128)
  const W = BOARD_W - 128 - 48
  const l = F('l', { dir: 'V', gap: 10 })
  c.appendChild(l)
  for (const line of [
    '1. 섹션이 24개다. 실제 노출은 "3편 미만 숨김" 게이트에 걸려 그날그날 다르다 — 평균 몇 개가 뜨는지부터 재야 순서 논의가 성립한다.',
    '2. 아키타입 A 하나가 24개 중 21개를 먹는다. 시의성(지금 출발하면 볼 수 있는)과 지식형(누벨바그)이 같은 크기·같은 리듬으로 놓인다 — 급한 것과 안 급한 것이 구분되지 않는다.',
    '3. 최근 추가분(NEW 4종: 러닝타임 2 · 개봉주년 · 상황감정 테마 9)이 전부 run2 중반에 있다 — 스크롤 깊이상 거의 안 보이는 자리다.',
    '4. 캡션 사양이 여섯 갈래다: 기본(감독·장르·연도) / 시의성 2줄(시간·극장) / 순위 / 러닝타임 / 주년 / 제작연도. 한 화면에서 섞이면 읽는 규칙이 안 잡힌다.',
    '5. 시급성 표현이 두 갈래다. 막바지 상영은 포스터 배지, 매진 임박은 하단 텍스트로만 잔여석을 말한다.',
    '6. A/B 전환이 섹션 종류가 아니라 그날 편수(≤2편)로 갈린다. 같은 섹션이 어제는 가로 행, 오늘은 카드로 뜬다 — 사용자가 배치를 기억할 수 없다.',
    '7. B(세로 스택 108×162)와 D(가로 2열 90×135)는 아직 각자 그린다. 합치려면 어느 쪽 레이아웃으로 갈지 정해야 한다.',
    '8. DirectorSpotlightSection이 Avatar 프리미티브를 두고 원형 아바타를 인라인으로 그린다 — 다음 정리 후보.',
    '9. 감사 스크립트의 PRIM 정규식이 FabRound·FabPill·ScrollNavButton을 프리미티브로 세지 않는다(FAB 대문자만 매칭). 채택률이 실제보다 낮게 잡힌다 — 지표 정의 변경이라 따로 다룰 것.',
  ]) {
    l.appendChild(await T(line, { font: P('Regular'), size: 12, color: 'text/sub', lh: 165, w: W }))
  }
}

/* ── 마무리 ─────────────────────────────────────────────── */
figma.currentPage = page
figma.viewport.scrollAndZoomIntoView([boardA])
figma.notify('섹션 인벤토리 갱신 (PR #284 반영)' + (report.length ? ' · 확인 ' + [...new Set(report)].length : ''))
if (report.length) console.log([...new Set(report)].join('\n'))
