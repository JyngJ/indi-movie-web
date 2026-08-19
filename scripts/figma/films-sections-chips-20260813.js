// 상영작 탭 섹션 인벤토리 + 포스터 오버레이 칩 인벤토리 (ASIS, 2026-08-13)
//
//  목적: 리뉴얼·순서 재배치 전에 "지금 코드가 실제로 이렇게 생겼다"를 한 판에 깔아둔다.
//  추정 금지 — 아래 수치·문구는 전부 코드에서 그대로 옮긴 것이다.
//    섹션 순서/문구: src/app/(tabs)/FilmsClient.tsx (렌더 순서 주석 + run1/run2)
//    섹션 헤더 스펙: src/components/primitives/SectionHeader.tsx
//    카드/포스터 스펙: src/components/domain/CurationSectionRow.tsx
//    칩: CurationSectionRow · GvEventSection · InstagramRecsSection · TheaterSheet · PosterThumb · FilmRankingSection
//
//  "Design System - work" 페이지 맨 아래 빈 자리에 그린다. 재실행하면 같은 이름 보드를 지우고 다시 그린다.
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

const NAME_A = 'FilmsTab 섹션 인벤토리 ASIS (2026-08-13)'
const NAME_B = '포스터 오버레이 칩 ASIS (2026-08-13)'
for (const n of [...page.children]) {
  if (n.name === NAME_A || n.name === NAME_B || n.name === 'FilmsTab 리뉴얼 작업판 (2026-08-13)') n.remove()
}
let maxY = 0
for (const n of page.children) maxY = Math.max(maxY, n.y + n.height)
const ORIGIN_X = 0
const ORIGIN_Y = maxY + 400

/* ── 공통 조각 ─────────────────────────────────────────────── */
async function boardHead(host, title, sub) {
  const head = F('header', { dir: 'V', gap: 8 })
  host.appendChild(head)
  head.appendChild(await T(title, { font: KIMM, size: 32, ls: 1.6 }))
  head.appendChild(await T(sub, { font: P('Regular'), size: 14, color: 'text/sub', lh: 155 }))
  return head
}
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
/** 작은 라벨 칩 (분류 태그) */
async function tag(label, fillHex, textHex) {
  const t = F('tag', { dir: 'H', pad: [4, 8, 4, 8], r: 4, fill: raw(fillHex), align: 'CENTER' })
  t.appendChild(await T(label, { font: P('SemiBold'), size: 10, rawFill: raw(textHex) }))
  return t
}
/** 포스터 플레이스홀더 (실제 이미지 없이 규격만) */
function poster(w, h, r) {
  const p = F('poster', { dir: 'NONE', w: w, h: h, r: r == null ? 6 : r, fill: 'neutral/200' })
  p.clipsContent = false
  return p
}

/* ══════════════════════════════════════════════════════════
   BOARD A — 상영작 탭 섹션 인벤토리
   ══════════════════════════════════════════════════════════ */

// 데이터 출처 분류 색 (보드 전용 — 프로덕션 토큰 아님)
const SRC = {
  realtime:  ['실시간 상영 데이터', '#ECEFF9', '#404E81'],
  curation:  ['큐레이션 DB',        '#E4F1E8', '#2B5036'],
  personal:  ['개인화 · 이력',       '#FDF1D8', '#885907'],
  external:  ['외부 수집',           '#E7DCF9', '#3E1782'],
  derived:   ['파생 · 집계',         '#F5E1E0', '#9B3331'],
}

/* 행 아키타입 — "모든 섹션이 같은 규격"이 아니다. 실제로 9종이 섞여 있다. */
const ARCH = {
  A: ['A · 가로 스크롤 행', '#ECEFF9', '#404E81'],
  B: ['B · sparse 카드', '#ECEFF9', '#404E81'],
  C: ['C · 기념일 rich', '#FDF1D8', '#885907'],
  D: ['D · 기념일 sparse', '#FDF1D8', '#885907'],
  E: ['E · 특별전', '#E4F1E8', '#2B5036'],
  F: ['F · 인스타 히어로', '#E7DCF9', '#3E1782'],
  G: ['G · 영화제 배너', '#E7DCF9', '#3E1782'],
  H: ['H · 감독 아바타', '#F5E1E0', '#9B3331'],
  I: ['I · 전체 그리드', '#F5E1E0', '#9B3331'],
}

/**
 * 섹션 목록 — FilmsClient.tsx 렌더 순서 그대로. 순서 바꿀 땐 이 배열만 옮기면 된다.
 *  no       화면상 순번 (run1/run2 position과는 별개 — 주석 참고)
 *  title    실제 h2 문구 (.display-h2 = KIMM 20 / 700 / 자간 5% / lh 1.3)
 *  desc     실제 설명 문구 (모바일 --text-caption 12 / caption색 / lh 1.5)
 *  id       list_id (애널리틱스 키)
 *  gate     노출 조건
 *  cap      포스터 하단 캡션 · 포스터 배지 사양
 *  src      데이터 출처
 *  isNew    최근 추가된 섹션 (리뉴얼 검토 우선 대상)
 */
const SECTIONS = [
  { grp: '고정 상단 — run 번호 체계 밖' },
  { no: 'A', title: '주목할 영화제', desc: '(배너 카드 — 포스터 행 아님)', id: 'festival_banner',
    gate: 'festivals.length > 0 · 지역 필터 무관 전국', cap: 'FestivalBannerCard 단독 레이아웃', src: 'external' },
  { no: 'B', title: '이런 작품은 어때요', desc: '최근 조회 이력 기반 추천', id: 'personalized',
    gate: '최근 본 영화 이력 있을 때만', cap: '기본 캡션(감독·장르칩·연도)', src: 'personal' },
  { no: 'C', title: '기념일 (생몰일)', desc: '오늘 생일·기일인 인물의 상영작', id: 'anniversary',
    gate: '3편↑=단독 행 / 2편↓=카드, PC는 2열 페어링', cap: 'AnniversarySection 자체 헤더', src: 'curation' },
  { no: 'D', title: '특별전 #0', desc: '같은 극장에서 같은 감독 영화가 몰릴 때', id: 'director_special',
    gate: '동일 극장 · 동일 감독 3편↑ · 최대 2개', cap: '극장명 + 거리 suffix', src: 'derived' },
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

/** 섹션이 실제로 어느 아키타입으로 그려지는지. 여러 개면 편수에 따라 갈린다. */
function archOf(id) {
  if (id === 'festival_banner') return ['G']
  if (id === 'instagram_recs') return ['F']
  if (id === 'anniversary') return ['C', 'D']
  if (id === 'director_special' || id === 'director_special_2') return ['E']
  if (id === 'director_spotlight') return ['H']
  if (id === 'all_movies_grid') return ['I']
  return ['A', 'B']   // 나머지 전부 — 3편↑이면 A, 2편↓이면 B
}

const BOARD_W = 1180

const boardA = F(NAME_A, {
  dir: 'V', gap: 32, pad: 64, fill: 'surface/bg',
})
page.appendChild(boardA)
boardA.x = ORIGIN_X
boardA.y = ORIGIN_Y

await boardHead(boardA,
  '상영작 탭 — 섹션 인벤토리 (ASIS)',
  [
    '2026-08-13 코드 기준. 문구·조건·캡션 사양은 FilmsClient.tsx / CurationSectionRow.tsx에서 그대로 옮겼다.',
    '순번은 화면에 나오는 순서다. run1/run2의 position(애널리틱스 값)은 이것과 다르다 — 개인화·기념일·특별전은 번호 체계 밖이라 run 내 상대 순번만 실린다.',
    '"3편 미만 숨김"이 대부분에 걸려 있어서, 실제로 한 화면에 몇 개가 뜨는지는 그날 상영 데이터에 따라 달라진다.',
    '행 생김새는 하나가 아니라 9종이다 — 아래 아키타입 카드 참고. 어떤 섹션이 어느 아키타입으로 그려지는지는 목록의 태그에 붙여뒀다.',
  ].join('\n'))

/* 행 아키타입 — 섹션마다 생김새가 다르다. 9종. */
{
  const c = await card(boardA, '행 아키타입 9종 — 섹션마다 생김새가 다르다',
    '"모두 같은 규격"이 아니다. 같은 자리에 놓이는 행인데 컴포넌트가 5개로 갈려 있고, 같은 모양을 서로 다른 코드가 두 번씩 그린다.', BOARD_W - 128)

  const gal = F('gal', { dir: 'H', gap: 24, wrap: true, w: BOARD_W - 128 - 48, align: 'MIN' })
  c.appendChild(gal)

  /** 아키타입 한 칸: 이름표 + 축소 재현 + 수치 */
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

  /** 기본 캡션 3줄 (제목/보조/장르칩+연도) — 아키타입마다 수치가 다르다 */
  async function caption(host, w, titleSize, subSize, chipSize, chipPad, yearSize) {
    const info = F('info', { dir: 'V', gap: 4, w: w })
    host.appendChild(info)
    info.appendChild(await T('영화 제목', { font: P('Bold'), size: titleSize, color: 'text/body', lh: 130 }))
    info.appendChild(await T('감독명', { font: P('Regular'), size: subSize, color: 'text/caption' }))
    const gr = F('genre', { dir: 'H', gap: 4, align: 'CENTER' })
    info.appendChild(gr)
    const gc = F('GenreChip', { dir: 'H', pad: chipPad, r: 9999, fill: 'surface/raised', stroke: 'surface/border', align: 'CENTER', mainAlign: 'CENTER' })
    gr.appendChild(gc)
    gc.appendChild(await T('드라마', { font: P('Regular'), size: chipSize, color: 'text/caption' }))
    gr.appendChild(await T('2024', { font: P('SemiBold'), size: yearSize, color: 'text/caption' }))
    return info
  }

  /* A — 가로 스크롤 행 (기본) */
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
      await caption(cc, 120, 14, 12, 12, [4, 8, 4, 8], 12)
    }
  }, [
    'CurationSectionRow (기본) — 섹션 20개가 이걸 쓴다',
    '포스터 모바일 120×180 · PC 210×315 / 행 gap 10 · 16',
    '헤더는 종이 위 플랫 (카드 없음) · 거터 --gutter-sheet 24',
    '섹션 간 리듬 모바일 32 · PC 48 (paddingTop)',
    '캡션 제목 14(PC 16)/700 2줄 클램프 · 보조 12(PC 14) · 장르칩 12 padding 4/8 · 연도 12',
    '스크롤 = embla Carousel (드래그 관성 · 연타 흡수 · 화살표 1회 3편)',
    '화살표는 항상 마운트 + opacity로만 감춤 (rage click 대응)',
    '포스터 hover scale 1.1 130ms · 400ms 후 HoverPopup 220px (PC)',
  ])

  /* B — sparse 카드 (같은 컴포넌트, 2편 이하) */
  await archCard('B', async (box) => {
    const cardBox = F('CardContainer', { dir: 'V', gap: 0, w: 300, r: 12, fill: 'surface/card', stroke: 'surface/border', clip: true })
    box.appendChild(cardBox)
    const h = F('h', { dir: 'V', gap: 4, pad: [12, 16, 12, 16] })
    cardBox.appendChild(h)
    h.appendChild(await T('칸 황금종려상', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const rule = F('rule', { dir: 'H', w: 300, h: 1, fill: 'surface/border' })
    cardBox.appendChild(rule)
    const stack = F('stack', { dir: 'V', gap: 16, pad: [12, 16, 12, 16] })
    cardBox.appendChild(stack)
    for (let i = 0; i < 2; i++) {
      const rowi = F('film', { dir: 'H', gap: 8, align: 'MIN' })
      stack.appendChild(rowi)
      rowi.appendChild(poster(108, 162, 6))
      await caption(rowi, 140, 14, 12, 12, [4, 8, 4, 8], 10)
    }
  }, [
    'CurationSectionRow (compact) — 같은 컴포넌트의 다른 분기',
    '전환 조건: movies.length ≤ 2 (섹션 종류와 무관, 그날 편수로 갈림)',
    'CardContainer로 감싸고 헤더가 카드 안 + 1px 하단 구분선',
    '포스터 108×162 · 가로 배치 세로 스택 gap 16',
    '연도만 --text-badge 10 (기본 행은 12) — 이유 없는 차이',
    '칸·베니스에만 수상 문양 워터마크 (우측 -16% · 회전 -10° · opacity 0.07)',
    'PC는 2개를 짝지어 2열, 짝이 없으면 단독 1열',
  ])

  /* C — 기념일 rich */
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
      await caption(cc, 120, 14, 12, 12, [4, 8, 4, 8], 12)
    }
  }, [
    'AnniversarySection (3편↑) + CurationSectionRow noHeader',
    '자체 헤더를 쓰고, 포스터 행만 CurationSectionRow에 위임한다',
    '행을 1px 테두리로 감싸고 radius 0 0 10 10 — 헤더와 붙은 것처럼',
    '포스터는 A와 동일 (120×180 · 210×315)',
    'paddingTop 모바일 24 (A는 32) — 리듬이 어긋난다',
  ])

  /* D — 기념일 sparse */
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
    await caption(rowi, 150, 14, 12, 10, 4, 10)
  }, [
    'AnniversarySection (2편↓) — B와 거의 같은 그림인데 코드가 따로다',
    '포스터 90×135 (B는 108×162) — 근거 없는 차이',
    '장르칩이 GenreChip 프리미티브가 아니라 인라인 복제: 10px · padding 4 균등',
    '(B는 GenreChip 프리미티브 12px · padding 4/8)',
    'CardContainer를 안 쓰고 border를 직접 그린다',
  ])

  /* E — 특별전 */
  await archCard('E', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 12, w: 440 })
    box.appendChild(wrap)
    wrap.appendChild(await T('허우샤오셴 특별전', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const meta = F('meta', { dir: 'H', gap: 8, align: 'CENTER' })
    wrap.appendChild(meta)
    const av = F('avatar', { dir: 'H', w: 40, h: 40, r: 20, fill: 'neutral/300' })
    meta.appendChild(av)
    const mt = F('mt', { dir: 'V', gap: 2 })
    meta.appendChild(mt)
    mt.appendChild(await T('아트나인', { font: P('Bold'), size: 13, color: 'text/body' }))
    mt.appendChild(await T('(2.4km)', { font: P('Regular'), size: 11, color: 'text/caption' }))
    const rowE = F('row', { dir: 'H', gap: 10 })
    wrap.appendChild(rowE)
    for (let i = 0; i < 3; i++) {
      const cc = F('card', { dir: 'V', gap: 8 })
      rowE.appendChild(cc)
      cc.appendChild(poster(120, 180, 6))
      await caption(cc, 120, 14, 12, 12, [4, 8, 4, 8], 12)
    }
  }, [
    'DirectorSpecialSection — 전용 컴포넌트. 포스터 규격은 A와 같다',
    '헤더에 감독 아바타 + 극장명 + 거리 suffix가 붙는다',
    '⚠ 스크롤이 embla가 아니라 네이티브 overflow + scrollRailBy',
    '   → 화살표 연타 시 거리 누적 문제가 여기만 남아 있다 (A는 embla가 흡수)',
    '⚠ 화살표를 hover 조건부로 마운트한다 (scrollAreaHovered && canScroll)',
    '   → A에서 고친 rage click 원인(클릭 직전 언마운트)이 여기만 그대로',
    'MovieCard·HoverPopup·마스크 계산은 A에서 복붙된 코드',
  ])

  /* F — 인스타 히어로 */
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
    '카드가 role="button" div — 안에 ScrollNavButton(<button>)이 들어가서',
  ])

  /* G — 영화제 배너 */
  await archCard('G', async (box) => {
    const wrap = F('wrap', { dir: 'V', gap: 12, w: 440 })
    box.appendChild(wrap)
    const hr = F('hr', { dir: 'H', gap: 8, align: 'CENTER', w: 440 })
    wrap.appendChild(hr)
    hr.appendChild(await T('주목할 영화제', { font: KIMM, size: 20, ls: 1, lh: 130 }))
    const band = F('band', { dir: 'H', w: 440, h: 84, fill: 'surface/raised', align: 'CENTER', mainAlign: 'CENTER' })
    wrap.appendChild(band)
    const banner = F('banner', { dir: 'H', w: 332, h: 63, fill: 'neutral/300' })
    band.appendChild(banner)
  }, [
    'FilmsClient 안에 인라인 정의 (FestivalBannerCard)',
    '배너 비율 21:4 · PC 고정폭 662 (포스터 3장 + gap 2 = 662)',
    'PC는 양옆 빈 공간을 surface-raised로 채운다 · 모바일은 100% 꽉',
    '헤더에 ChevronRight trailing — 다른 섹션엔 없는 어포던스',
    'banner_url 죽으면(403·삭제) 통째 숨김',
  ])

  /* H — 감독 아바타 */
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
    'hover-lift (scale 1.03) — A의 포스터 hover(1.1)와 다른 값',
  ])

  /* I — 전체 그리드 */
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

/* 아키타입이 갈라진 지점 */
{
  const c = await card(boardA, '같은 걸 두 번 그린 곳', '리뉴얼에서 합칠지 말지 정해야 하는 지점들', BOARD_W - 128)
  const l = F('l', { dir: 'V', gap: 10 })
  c.appendChild(l)
  for (const line of [
    'B(sparse 카드) vs D(기념일 sparse) — 거의 같은 그림. 포스터 108×162 vs 90×135, GenreChip 프리미티브 vs 인라인 복제(10px·padding 4), CardContainer 사용 여부까지 다르다.',
    'A(기본 행) vs E(특별전) — 포스터 규격은 같은데 스크롤 엔진이 다르다. A는 embla, E는 네이티브 overflow. E에는 A가 고친 두 가지(연타 거리 누적, 화살표 hover 언마운트로 인한 rage click)가 그대로 남아 있다.',
    '연도 fontSize가 세 벌 — A는 --text-meta 12, B는 --text-badge 10, D는 --text-badge 10. 근거를 못 찾았다.',
    'paddingTop이 두 벌 — A/E는 모바일 32·PC 48, C(기념일 rich)는 모바일 24·PC 48. 섹션 리듬이 기념일에서만 어긋난다.',
    'hover 확대율이 두 벌 — 포스터는 scale 1.1(130ms), 감독 아바타는 hover-lift scale 1.03.',
    'displayMode prop(\'year\' | \'genre\' | \'default\')은 타입도 있고 전 섹션이 넘기는데 CurationSectionRow가 한 번도 안 쓴다. 구조분해만 하고 버려진다 — 죽은 prop.',
  ]) {
    l.appendChild(await T(line, { font: P('Regular'), size: 12, color: 'text/sub', lh: 165, w: BOARD_W - 128 - 48 }))
  }
}

/* 섹션 목록 */
{
  const c = await card(boardA, '렌더 순서 — 위에서부터', '이 카드의 행 순서를 바꾸는 게 곧 리뉴얼 결과물이다', BOARD_W - 128)
  const list = F('list', { dir: 'V', gap: 8 })
  c.appendChild(list)

  for (const s of SECTIONS) {
    if (s.grp) {
      const g = F('grp', { dir: 'H', gap: 8, align: 'CENTER', pad: [16, 0, 4, 0] })
      list.appendChild(g)
      g.appendChild(await T(s.grp, { font: P('Bold'), size: 11, color: 'primary/base', ls: 0.4 }))
      const rule = F('rule', { dir: 'H', w: 700, h: 1, fill: 'surface/border' })
      g.appendChild(rule)
      continue
    }

    const row = F('row/' + s.id, {
      dir: 'H', gap: 16, pad: 16, r: 12, align: 'MIN',
      fill: 'surface/card', stroke: 'surface/border', strokeW: 1,
      w: BOARD_W - 128 - 48,
    })
    list.appendChild(row)

    /* 순번 */
    const num = F('no', { dir: 'H', w: 32, h: 32, r: 8, fill: s.isNew ? 'primary/base' : 'surface/raised', align: 'CENTER', mainAlign: 'CENTER' })
    row.appendChild(num)
    num.appendChild(await T(String(s.no), { font: P('Bold'), size: 13, color: s.isNew ? 'white' : 'text/sub' }))

    /* 헤더 재현 + 메타 */
    const mid = F('mid', { dir: 'V', gap: 6, w: 520 })
    row.appendChild(mid)
    const titleRow = F('titleRow', { dir: 'H', gap: 8, align: 'CENTER' })
    mid.appendChild(titleRow)
    titleRow.appendChild(await T(s.title, { font: KIMM, size: 20, ls: 1, lh: 130 }))
    if (s.isNew) titleRow.appendChild(await tag('NEW', '#ECEFF9', '#404E81'))
    mid.appendChild(await T(s.desc, { font: P('Regular'), size: 12, color: 'text/caption', lh: 150, w: 520 }))
    mid.appendChild(await T(s.id, { font: P('Medium'), size: 10, color: 'text/sub' }))

    /* 조건 · 캡션 */
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

    /* 포스터 미니 */
    const mini = F('mini', { dir: 'H', gap: 6 })
    row.appendChild(mini)
    for (let i = 0; i < 3; i++) mini.appendChild(poster(40, 60, 4))
  }
}

/* 리뉴얼 논의용 메모 */
{
  const c = await card(boardA, '리뉴얼 전에 정리해둘 것', null, BOARD_W - 128)
  const l = F('l', { dir: 'V', gap: 8 })
  c.appendChild(l)
  for (const line of [
    '1. 섹션이 24개다. 실제 노출은 "3편 미만 숨김" 게이트에 걸려 그날그날 다르다 — 평균 몇 개가 뜨는지부터 재야 순서 논의가 성립한다.',
    '2. 아키타입 A(가로 스크롤 행) 하나가 24개 중 20개를 먹는다. 시의성(지금 출발하면 볼 수 있는)과 지식형(누벨바그)이 같은 크기·같은 리듬으로 놓인다 — 급한 것과 안 급한 것이 구분되지 않는다.',
    '3. 최근 추가분(NEW 4종: 러닝타임 2 · 개봉주년 · 상황감정 테마 9)이 전부 run2 중반에 들어갔다 — 스크롤 깊이상 거의 안 보이는 자리다.',
    '4. 캡션 사양이 섹션마다 다르다: 기본(감독·장르·연도) / 시의성 2줄(시간·극장) / 순위 / 러닝타임 / 주년 / 제작연도. 한 화면에서 섞이면 읽는 규칙이 안 잡힌다.',
    '5. 포스터 배지는 막바지 상영에만 있다. 매진 임박은 배지 없이 하단 텍스트로만 잔여석을 말한다 — 시급성 표현이 두 갈래.',
    '6. A/B 전환이 섹션 종류가 아니라 그날 편수(≤2편)로 갈린다. 같은 섹션이 어제는 가로 행, 오늘은 카드로 뜬다 — 사용자가 배치를 기억할 수 없다.',
  ]) {
    l.appendChild(await T(line, { font: P('Regular'), size: 12, color: 'text/sub', lh: 165, w: BOARD_W - 128 - 48 }))
  }
}

/* ══════════════════════════════════════════════════════════
   BOARD B — 포스터 오버레이 칩
   ══════════════════════════════════════════════════════════ */

const boardB = F(NAME_B, { dir: 'V', gap: 32, pad: 64, fill: 'surface/bg' })
page.appendChild(boardB)
boardB.x = ORIGIN_X + BOARD_W + 160
boardB.y = ORIGIN_Y

await boardHead(boardB,
  '포스터 오버레이 칩 (ASIS)',
  [
    '포스터 위에 얹히는 칩을 전부 한자리에 모았다. 지금은 5개 파일에 흩어져 있고 공통 컴포넌트가 없다.',
    '수치는 각 파일의 인라인 style에서 그대로 옮긴 것이다.',
  ].join('\n'))

/**
 * 칩 목록
 *  pos   'TR' | 'TL' | 'BR' | 'FULL' | 'TR-OUT'
 */
const CHIPS = [
  { name: 'D-day · 오늘', text: '오늘', pos: 'TR', bg: '#9B3331', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    shadow: true, src: 'CurationSectionRow.tsx:275', note: '--color-error · daysLeft 0. 카피 "오늘이 마지막"은 의도적 유지' },
  { name: 'D-day · D-1', text: 'D-1', pos: 'TR', bg: '#B9800E', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    shadow: true, src: 'CurationSectionRow.tsx:275', note: '--color-warning · daysLeft 1' },
  { name: 'D-day · D-5', text: 'D-5', pos: 'TR', bg: '#78716C', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    shadow: true, src: 'CurationSectionRow.tsx:282', note: '⚠ #78716C 하드코딩 — 토큰 없음' },
  { name: 'GV 유형', text: 'GV', pos: 'TL', bg: '#3E1782', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    ls: 0.3, src: 'GvEventSection.tsx:186', note: '--color-gv 단일 · 타입 구분은 텍스트가 담당' },
  { name: 'GV 일시', text: '8/16 19:30', pos: 'BR', bg: '#000000', bgA: 0.5, fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    src: 'GvEventSection.tsx:192', note: 'backdrop-filter blur(4px) — 피그마 재현 불가, 색만' },
  { name: '영화제 상태', text: '진행 중', pos: 'BR', bg: '#4A7C59', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    src: 'InstagramRecsSection.tsx:248', note: '--color-success · 영화제 카드에만, 영화 카드엔 칩 없음' },
  { name: '매진', text: '매진', pos: 'BR', bg: '#9B3331', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    src: 'TheaterSheet.tsx:1622', note: '--color-error · 시트 포스터 스트립' },
  { name: '오버플로 +N', text: '+3', pos: 'FULL', bg: '#0F0C09', bgA: 0.62, fg: '#FFFFFF', size: 15, weight: 'SemiBold',
    src: 'PosterThumb.tsx:113', note: '포스터 전면 스크림 · 칩이 아니라 덮개' },
  { name: '선택 체크', text: '', pos: 'CHECK', bg: '#404E81', fg: '#FFFFFF', size: 10, weight: 'SemiBold',
    src: 'PosterThumb.tsx:144', note: '20×20 원 · 2px 흰 테두리 · 우상단 -6/-6 (포스터 밖으로 나감)' },
  { name: '랭킹 NEW', text: 'NEW', pos: 'OUT', bg: '#B9800E', fg: '#FFFFFF', size: 10, weight: 'Bold',
    ls: 0.2, src: 'FilmRankingSection.tsx:34', note: '⚠ padding 4 균등 (다른 칩은 4/8) · 포스터 위가 아니라 옆' },
]

{
  const c = await card(boardB, '칩 전수', '포스터는 90×135 · --radius-poster(6) 기준으로 통일해 그렸다', 900)
  const grid = F('grid', { dir: 'H', gap: 20, wrap: true, w: 852 })
  c.appendChild(grid)

  for (const ch of CHIPS) {
    const col = F('col/' + ch.name, { dir: 'V', gap: 10, w: 156 })
    grid.appendChild(col)

    const pw = poster(90, 135, 6)
    col.appendChild(pw)

    if (ch.pos === 'FULL') {
      const scrim = F('scrim', { dir: 'H', w: 90, h: 135, r: 6, fill: raw(ch.bg, ch.bgA), align: 'CENTER', mainAlign: 'CENTER' })
      pw.appendChild(scrim)
      scrim.x = 0; scrim.y = 0
      scrim.appendChild(await T(ch.text, { font: P(ch.weight), size: ch.size, rawFill: raw(ch.fg) }))
    } else if (ch.pos === 'CHECK') {
      const dot = F('check', { dir: 'H', w: 20, h: 20, r: 10, fill: raw(ch.bg), align: 'CENTER', mainAlign: 'CENTER',
        stroke: raw('#FFFFFF'), strokeW: 2 })
      pw.appendChild(dot)
      dot.x = 90 - 20 + 6
      dot.y = -6
      dot.appendChild(await T('✓', { font: P('Bold'), size: 11, rawFill: raw('#FFFFFF') }))
      /* 선택 상태의 inset 흰 테두리 + primary 링도 함께 */
      pw.strokes = [raw('#404E81')]
      pw.strokeWeight = 2
      pw.strokeAlign = 'OUTSIDE'
    } else if (ch.pos === 'OUT') {
      const chip = F('chip', { dir: 'H', pad: 4, r: 4, fill: raw(ch.bg), align: 'CENTER', mainAlign: 'CENTER' })
      pw.appendChild(chip)
      chip.appendChild(await T(ch.text, { font: P(ch.weight), size: ch.size, rawFill: raw(ch.fg), ls: ch.ls }))
      chip.x = 90 + 8
      chip.y = 6
    } else {
      const chip = F('chip', { dir: 'H', pad: [4, 8, 4, 8], r: 4, fill: raw(ch.bg, ch.bgA), align: 'CENTER' })
      pw.appendChild(chip)
      chip.appendChild(await T(ch.text, { font: P(ch.weight), size: ch.size, rawFill: raw(ch.fg), ls: ch.ls }))
      if (ch.shadow) {
        chip.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.35 }, offset: { x: 0, y: 1 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' }]
      }
      if (ch.pos === 'TR') { chip.x = 90 - chip.width - 6; chip.y = 6 }
      if (ch.pos === 'TL') { chip.x = 6; chip.y = 6 }
      if (ch.pos === 'BR') { chip.x = 90 - chip.width - 6; chip.y = 135 - chip.height - 6 }
    }

    const meta = F('meta', { dir: 'V', gap: 3, w: 156 })
    col.appendChild(meta)
    meta.appendChild(await T(ch.name, { font: P('Bold'), size: 12 }))
    meta.appendChild(await T(ch.src, { font: P('Medium'), size: 9, color: 'text/caption', w: 156 }))
    meta.appendChild(await T(ch.note, { font: P('Regular'), size: 10, color: 'text/sub', lh: 150, w: 156 }))
  }
}

/* 공통 정책 vs 실제 */
{
  const c = await card(boardB, '정책 vs 실제', 'AGENTS.md의 "포스터 오버레이 칩 정책"과 코드가 어긋난 지점', 900)

  const tbl = F('tbl', { dir: 'V', gap: 0, w: 852, stroke: 'surface/border', r: 8, clip: true })
  c.appendChild(tbl)
  async function tr(a, b, d, head) {
    const r = F('tr', { dir: 'H', gap: 0, w: 852, fill: head ? 'surface/raised' : 'surface/card' })
    tbl.appendChild(r)
    const cells = [[a, 200], [b, 260], [d, 392]]
    for (const cell of cells) {
      const cf = F('td', { dir: 'V', pad: [10, 12, 10, 12], w: cell[1] })
      r.appendChild(cf)
      cf.appendChild(await T(cell[0], { font: head ? P('Bold') : P('Regular'), size: 11, color: head ? 'text/primary' : 'text/sub', lh: 150, w: cell[1] - 24 }))
    }
    return r
  }
  await tr('항목', '정책 (AGENTS.md)', '실제 코드', true)
  await tr('fontSize', '11px', '전부 --text-badge = 10px. 갤러리 샘플(inline-patterns.tsx)만 11 하드코딩 — 셋이 서로 다르다')
  await tr('fontWeight', '600', 'D-day·GV·매진·영화제 600 / 랭킹 NEW만 700')
  await tr('padding', '4px 8px', '랭킹 NEW만 4px 균등')
  await tr('radius', '--radius-badge (4px)', '일치')
  await tr('lineHeight', '1', '일치')
  await tr('offset', '6px', '일치 (선택 체크만 -6, 의도적으로 포스터 밖)')
  await tr('위치', '(정책 없음)', '우상단(D-day) / 좌상단(GV 유형) / 우하단(GV 일시·매진·영화제) — 규칙 없이 파일마다 다름')
  await tr('색', '시맨틱 토큰', 'D-5의 #78716C만 하드코딩 — neutral 램프에 대응값 없음')
  await tr('그림자', '(정책 없음)', 'D-day만 0 1px 4px rgba(0,0,0,.35). 나머지는 그림자 없음')
  await tr('컴포넌트', '—', '없음. 5개 파일에 인라인 style로 각각 재작성돼 있다')
}

/* ── 마무리 ─────────────────────────────────────────────── */
figma.currentPage = page
figma.viewport.scrollAndZoomIntoView([boardA, boardB])
figma.notify('보드 2개 생성' + (report.length ? ' · 확인 ' + [...new Set(report)].length : ''))
if (report.length) console.log([...new Set(report)].join('\n'))
