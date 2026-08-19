// 예매 랭킹 표시 + 포스터 오버레이 칩 리뉴얼 제안 (2026-08-13)
//
//  레퍼런스: 넷플릭스 "이번 주 TOP 20" — 거대 숫자가 포스터를 파고들고, 포스터 좌상단에
//  파란 라벨 칩. 다만 그쪽은 검정 배경이라 흰 아웃라인 숫자가 살고, 우리는 미색 종이
//  배경이라 그대로 옮기면 숫자가 안 읽힌다. 배경 전제가 다르니 문법만 가져온다.
//
//  칩 보드 오른쪽에 제안 보드를 새로 놓는다. 재실행하면 지우고 다시 그린다.
// Scripter에서 Run.

const report = []
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }

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
  'text/primary': '#0C0A08', 'text/sub': '#726B65', 'text/caption': '#857F76', 'text/body': '#4A4540',
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
  if (o.strokeHex) {
    t.strokes = [raw(o.strokeHex)]
    t.strokeWeight = o.strokeW == null ? 2 : o.strokeW
    t.strokeAlign = 'OUTSIDE'
  }
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
  if (o.stroke) { f.strokes = [typeof o.stroke === 'string' ? paint(o.stroke) : o.stroke]; f.strokeWeight = o.strokeW == null ? 1 : o.strokeW; f.strokeAlign = o.strokeAlign || 'INSIDE' }
  f.clipsContent = o.clip == null ? false : o.clip
  return f
}
/** 세로 그라데이션 채움 (투명 → 색) */
function gradV(hex, aTop, aBottom) {
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { ...rgb(hex), a: aTop } },
      { position: 1, color: { ...rgb(hex), a: aBottom } },
    ],
  }
}
function poster(w, h, r) {
  const p = F('poster', { dir: 'NONE', w: w, h: h, r: r == null ? 6 : r, fill: 'neutral/200' })
  p.clipsContent = false
  return p
}

/* ── 페이지 · 자리 ─────────────────────────────────────────── */
const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('페이지 "Design System - work" 없음'); throw new Error('page missing') }
await page.loadAsync()

const NAME = '예매 랭킹 · 포스터 칩 리뉴얼 제안 (2026-08-13)'
for (const n of [...page.children]) if (n.name === NAME) n.remove()

const chipBoard = page.children.find(n => n.name === '포스터 오버레이 칩 ASIS (2026-08-13)')
const ORIGIN_X = chipBoard ? chipBoard.x + chipBoard.width + 160 : 2600
const ORIGIN_Y = chipBoard ? chipBoard.y : 11563

/* ── 공통 ─────────────────────────────────────────────────── */
const BOARD_W = 1240
const board = F(NAME, { dir: 'V', gap: 32, pad: 64, fill: 'surface/bg' })
page.appendChild(board)
board.x = ORIGIN_X
board.y = ORIGIN_Y

async function card(title, desc, w) {
  const c = F('card/' + title, { dir: 'V', gap: 20, pad: 24, r: 16, w: w == null ? BOARD_W - 128 : w, fill: 'surface/card', stroke: 'surface/border', strokeW: 1.5 })
  board.appendChild(c)
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
async function note(host, lines, w) {
  const l = F('note', { dir: 'V', gap: 4 })
  host.appendChild(l)
  for (const s of lines) l.appendChild(await T('· ' + s, { font: P('Regular'), size: 11, color: 'text/sub', lh: 150, w: w }))
  return l
}
/** 카드 캡션 3줄 (현행 그대로) */
async function caption(host, w) {
  const info = F('info', { dir: 'V', gap: 4, w: w })
  host.appendChild(info)
  info.appendChild(await T('파과', { font: P('Bold'), size: 14, color: 'text/body', lh: 130 }))
  info.appendChild(await T('예매 1위', { font: P('SemiBold'), size: 12, color: 'text/body' }))
  return info
}

/* ── 헤더 ─────────────────────────────────────────────────── */
{
  const head = F('header', { dir: 'V', gap: 8 })
  board.appendChild(head)
  head.appendChild(await T('예매 랭킹 · 포스터 칩 — 리뉴얼 제안', { font: KIMM, size: 32, ls: 1.6 }))
  head.appendChild(await T([
    '레퍼런스는 넷플릭스 "이번 주 TOP 20" — 거대 숫자가 포스터를 파고들고 좌상단에 라벨 칩이 붙는다.',
    '다만 그쪽은 검정 배경이라 흰 아웃라인 숫자가 살아난다. 우리 배경은 미색 종이(#FAF9F8)라 같은 처리를 하면 숫자가 배경에 묻는다.',
    '문법(숫자를 크게 · 포스터와 겹치게 · 칩은 좌상단)만 가져오고 대비 확보 방식은 우리 팔레트로 다시 푼다.',
  ].join('\n'), { font: P('Regular'), size: 14, color: 'text/sub', lh: 155 }))
}

/* ── 0. 모서리 점유 현황 ────────────────────────────────────── */
{
  const c = await card('포스터 네 모서리 — 지금 누가 쓰고 있나',
    '순위를 어디에 놓을지는 빈 모서리가 결정한다. 좌하단만 비어 있다.')
  const row = F('row', { dir: 'H', gap: 32, align: 'MIN' })
  c.appendChild(row)

  const pw = poster(180, 270, 6)
  row.appendChild(pw)
  const marks = [
    ['좌상단', 6, 6, '#3E1782', 'GV 유형'],
    ['우상단', null, 6, '#9B3331', 'D-day · 거리'],
    ['우하단', null, null, '#4A7C59', 'GV 일시 · 매진 · 영화제'],
    ['좌하단', 6, null, '#404E81', '비어 있음'],
  ]
  for (const [, x, y, hex, label] of marks) {
    const chip = F('m', { dir: 'H', pad: [4, 8, 4, 8], r: 4, fill: raw(hex, label === '비어 있음' ? 0.25 : 1), align: 'CENTER' })
    pw.appendChild(chip)
    chip.appendChild(await T(label, { font: P('SemiBold'), size: 9, rawFill: raw('#FFFFFF') }))
    chip.x = x != null ? x : 180 - chip.width - 6
    chip.y = y != null ? y : 270 - chip.height - 6
  }

  await note(c, [
    '좌상단 — GvEventSection 유형 배지 (GV 카드 전용)',
    '우상단 — 막바지 상영 D-N, 거리 배지. 랭킹 섹션에서는 안 쓴다',
    '우하단 — GV 일시, 매진, 영화제 상태 배지',
    '좌하단 — 비어 있다. 순위를 놓기에 충돌이 가장 적은 자리',
    '전면 스크림(+N 오버플로)은 네 모서리를 다 덮으므로 순위와 동시 노출 금지',
  ], 520)
}

/* ── 1. 순위 표시 3안 ───────────────────────────────────────── */
{
  const c = await card('순위 표시 — 3안', '모바일 기준 포스터 120×180. 셋 다 같은 데이터("예매 N위")를 쓴다.')
  const gal = F('gal', { dir: 'H', gap: 40, align: 'MIN', wrap: true, w: BOARD_W - 128 - 48 })
  c.appendChild(gal)

  /* ---- A안: 아웃라인 거대 숫자 (넷플릭스 직역) ---- */
  {
    const col = F('A', { dir: 'V', gap: 12, w: 520 })
    gal.appendChild(col)
    const h = F('h', { dir: 'H', gap: 8, align: 'CENTER' })
    col.appendChild(h)
    h.appendChild(await tag('A안 · 아웃라인 거대 숫자', '#F5E1E0', '#9B3331'))
    h.appendChild(await T('넷플릭스 직역', { font: P('Regular'), size: 10, color: 'text/caption' }))

    const stage = F('stage', { dir: 'NONE', w: 520, h: 230, r: 12, fill: 'surface/bg', stroke: 'surface/border', clip: true })
    col.appendChild(stage)
    for (let i = 0; i < 3; i++) {
      const baseX = 16 + i * 165
      /* 숫자는 포스터 왼쪽 바깥 — 종이 배경이라 채움은 배경색, 윤곽선으로만 읽힌다 */
      const num = await T(String(i + 1), { font: KIMM, size: 104, color: 'surface/bg', strokeHex: '#2B2622', strokeW: 3, lh: 100 })
      stage.appendChild(num)
      num.x = baseX; num.y = 40
      const pw = poster(120, 180, 6)
      stage.appendChild(pw)
      pw.x = baseX + num.width - 26
      pw.y = 30
    }
    await note(col, [
      '숫자 KIMM 104 · 채움 surface/bg · 윤곽 neutral-800 3px · 포스터가 숫자 오른쪽 26px를 덮는다',
      '⚠ 행 왼쪽에 숫자 폭(약 60px)만큼 자리가 필요하다 — 포스터 시작선이 --gutter-sheet 24에서 밀린다',
      '⚠ 다른 모든 행은 포스터가 24에서 시작한다. 이 섹션만 시작선이 달라진다',
      '⚠ 종이 배경에서 윤곽선만으로는 약하다. 검정 배경이라 사는 처리다',
      '숫자 사이 간격이 자릿수에 따라 달라져(1 vs 10) 카드 폭이 들쭉날쭉해진다',
    ], 520)
  }

  /* ---- B안: 포스터 안 스크림 숫자 ---- */
  {
    const col = F('B', { dir: 'V', gap: 12, w: 520 })
    gal.appendChild(col)
    const h = F('h', { dir: 'H', gap: 8, align: 'CENTER' })
    col.appendChild(h)
    h.appendChild(await tag('B안 · 포스터 안 스크림 숫자', '#E4F1E8', '#2B5036'))
    h.appendChild(await T('추천', { font: P('Bold'), size: 10, color: 'status/success' }))

    const stage = F('stage', { dir: 'NONE', w: 520, h: 230, r: 12, fill: 'surface/bg', stroke: 'surface/border', clip: true })
    col.appendChild(stage)
    for (let i = 0; i < 3; i++) {
      const pw = poster(120, 180, 6)
      stage.appendChild(pw)
      pw.x = 16 + i * 132; pw.y = 25
      pw.clipsContent = true
      /* 하단 스크림 — 투명 → 먹 0.78 */
      const scrim = F('scrim', { dir: 'NONE', w: 120, h: 76 })
      scrim.fills = [gradV('#0F0C09', 0, 0.78)]
      pw.appendChild(scrim); scrim.x = 0; scrim.y = 104
      const num = await T(String(i + 1), { font: KIMM, size: 56, rawFill: raw('#FFFFFF'), lh: 100 })
      pw.appendChild(num)
      num.x = 8; num.y = 180 - num.height - 4
    }
    await note(col, [
      '숫자 KIMM 56 · 흰색 · 좌하단 offset 8 / 4 · 아래 76px 스크림(투명 → #0F0C09 0.78)',
      '포스터 시작선·거터를 안 건드린다 — 다른 행과 같은 리듬을 유지한다',
      '배경색과 무관하게 대비가 나온다 (스크림이 대비를 보장)',
      '이미 쓰는 오버레이 문법(+N 전면 스크림)과 같은 계열이라 새 규칙이 안 늘어난다',
      '좌하단은 비어 있는 모서리라 기존 칩과 충돌 없음',
      '⚠ 포스터 아래쪽 그림(배우 얼굴 등)이 76px 가려진다',
    ], 520)
  }

  /* ---- C안: 인디고 랭크 탭 ---- */
  {
    const col = F('C', { dir: 'V', gap: 12, w: 520 })
    gal.appendChild(col)
    const h = F('h', { dir: 'H', gap: 8, align: 'CENTER' })
    col.appendChild(h)
    h.appendChild(await tag('C안 · 인디고 랭크 탭', '#ECEFF9', '#404E81'))
    h.appendChild(await T('가장 보수적', { font: P('Regular'), size: 10, color: 'text/caption' }))

    const stage = F('stage', { dir: 'NONE', w: 520, h: 230, r: 12, fill: 'surface/bg', stroke: 'surface/border', clip: true })
    col.appendChild(stage)
    for (let i = 0; i < 3; i++) {
      const pw = poster(120, 180, 6)
      stage.appendChild(pw)
      pw.x = 16 + i * 132; pw.y = 25
      const tab = F('tab', { dir: 'H', w: 34, h: 34, fill: 'primary/base', align: 'CENTER', mainAlign: 'CENTER' })
      tab.topLeftRadius = 6; tab.topRightRadius = 0; tab.bottomLeftRadius = 0; tab.bottomRightRadius = 10
      pw.appendChild(tab); tab.x = 0; tab.y = 0
      tab.appendChild(await T(String(i + 1), { font: KIMM, size: 18, rawFill: raw('#FFFFFF'), lh: 100 }))
    }
    await note(col, [
      '좌상단 34×34 인디고 사각 · 좌상 r6(포스터 모서리 따라감) · 우하 r10 · 숫자 KIMM 18',
      '포스터를 거의 안 가린다 — 그림 손실이 가장 적다',
      '기존 칩(4/8 · r4)과 같은 배지 문법이라 이질감이 없다',
      '⚠ "잘 보이게"라는 요구엔 가장 약하다 — 지금 캡션 텍스트보다 조금 나은 정도',
      '⚠ GV 유형 배지와 같은 좌상단이라, GV 카드에 랭킹이 붙으면 충돌한다',
    ], 520)
  }
}

/* ── 2. 두 자릿수 · 행 전체 ─────────────────────────────────── */
{
  const c = await card('B안 — 두 자릿수와 행 전체 확인', '랭킹은 10위까지 나온다. 자릿수가 늘어도 카드 폭이 안 변해야 한다.')
  const stage = F('stage', { dir: 'NONE', w: BOARD_W - 128 - 48, h: 300, r: 12, fill: 'surface/bg', stroke: 'surface/border', clip: true })
  c.appendChild(stage)

  const title = await T('지금 예매 많은 영화', { font: KIMM, size: 20, ls: 1, lh: 130 })
  stage.appendChild(title); title.x = 24; title.y = 20
  const desc = await T('최근 7일, 예매하러 가장 많이 떠난 영화들이에요', { font: P('Regular'), size: 12, color: 'text/caption' })
  stage.appendChild(desc); desc.x = 24; desc.y = 48

  const TITLES = ['파과', '이처럼 사소한', '괴인', '3670', '리볼버', '핸섬가이즈', '설계자', '탈주', '행복의 나라', '빅토리']
  for (let i = 0; i < 8; i++) {
    const pw = poster(120, 180, 6)
    stage.appendChild(pw)
    pw.x = 24 + i * 130; pw.y = 78
    pw.clipsContent = true
    const scrim = F('scrim', { dir: 'NONE', w: 120, h: 76 })
    scrim.fills = [gradV('#0F0C09', 0, 0.78)]
    pw.appendChild(scrim); scrim.x = 0; scrim.y = 104
    const num = await T(String(i + 1), { font: KIMM, size: 56, rawFill: raw('#FFFFFF'), lh: 100 })
    pw.appendChild(num)
    num.x = 8; num.y = 180 - num.height - 4

    const cap = F('cap', { dir: 'V', gap: 4, w: 120 })
    stage.appendChild(cap); cap.x = 24 + i * 130; cap.y = 266
    cap.appendChild(await T(TITLES[i], { font: P('Bold'), size: 14, color: 'text/body', lh: 130 }))
  }
  await note(c, [
    '숫자가 포스터 안에 있어 자릿수가 늘어도 카드 폭이 안 변한다 (A안은 변한다)',
    '캡션에서 "예매 N위"를 뺀다 — 숫자가 포스터에 있으므로 중복이다. 감독명을 되살릴지는 결정 필요',
    '"이번 주 많이 찾아본 영화"(realtime_view_rank)도 같은 처리를 받아야 한다 — 랭킹 섹션 2개',
  ], BOARD_W - 128 - 48)
}

/* ── 3. 칩 리뉴얼 3안 ───────────────────────────────────────── */
{
  const c = await card('포스터 오버레이 칩 — 3안', '지금은 10px / 600 / padding 4·8 / r4. 레퍼런스 칩은 더 크고 둥글고 아이콘이 붙는다.')
  const gal = F('gal', { dir: 'H', gap: 32, align: 'MIN', wrap: true, w: BOARD_W - 128 - 48 })
  c.appendChild(gal)

  /** 칩 만들기 */
  async function mkChip(host, opt) {
    const chip = F('chip', {
      dir: 'H', gap: opt.gap == null ? 4 : opt.gap,
      pad: opt.pad, r: opt.r, fill: raw(opt.bg, opt.bgA), align: 'CENTER',
    })
    host.appendChild(chip)
    if (opt.dot) {
      const d = F('dot', { dir: 'NONE', w: 6, h: 6, r: 3, fill: raw('#FFFFFF') })
      chip.appendChild(d)
    }
    chip.appendChild(await T(opt.text, { font: P(opt.weight), size: opt.size, rawFill: raw('#FFFFFF'), ls: opt.ls }))
    if (opt.ring) { chip.strokes = [raw('#FFFFFF', 0.35)]; chip.strokeWeight = 1; chip.strokeAlign = 'INSIDE' }
    if (opt.shadow) chip.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.35 }, offset: { x: 0, y: 1 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' }]
    return chip
  }

  const VARIANTS = [
    {
      key: '현행', tone: ['#EAE5E1', '#4A4540'],
      opt: { text: '오늘', size: 10, weight: 'SemiBold', pad: [4, 8, 4, 8], r: 4, bg: '#9B3331', shadow: true },
      notes: [
        '10px / 600 · padding 4·8 · r4 · offset 6 · 그림자 0 1px 4px 0.35',
        'AGENTS.md 정책엔 11px로 적혀 있는데 코드는 --text-badge(10px)를 쓴다 — 문서와 코드가 다르다',
        '포스터 위에서 작다. 특히 밝은 포스터에서 존재감이 약하다',
      ],
    },
    {
      key: '1안 · 크기만 키움', tone: ['#ECEFF9', '#404E81'],
      opt: { text: '오늘', size: 12, weight: 'Bold', pad: [6, 10, 6, 10], r: 6, bg: '#9B3331', shadow: true },
      notes: [
        '12px / 700 · padding 6·10 · r6 · offset 6',
        '가장 작은 변경. 토큰만 한 단계씩 올리면 된다 (--text-meta 12 · --radius-control 계열)',
        '기존 배치·색 규칙을 그대로 두므로 다른 섹션에 미치는 영향이 없다',
        '⚠ padding 6·10은 4배수 규칙(spacing)에서 벗어난다 — 6은 허용, 10은 8 또는 12로 가야 한다',
      ],
    },
    {
      key: '2안 · 점 + 라벨', tone: ['#E4F1E8', '#2B5036'],
      opt: { text: '오늘 마지막', size: 12, weight: 'Bold', pad: [6, 12, 6, 12], r: 6, bg: '#9B3331', dot: true, shadow: true },
      notes: [
        '레퍼런스의 "▶ 시리즈"처럼 앞에 표식 + 라벨. 아이콘 대신 6px 점 (아이콘은 10px에서 뭉갠다)',
        '라벨을 길게 쓸 수 있다 — "오늘" 대신 "오늘 마지막"처럼 뜻이 온전히 전달된다',
        '⚠ 라벨이 길어지면 포스터 폭(120)의 절반을 넘는다. 두 자 이상 늘리기 전에 잘림 규칙 필요',
        '⚠ 점의 의미가 없다 — 레퍼런스의 ▶는 "재생"이라는 뜻이 있었다. 장식만 늘리는 셈',
      ],
    },
    {
      key: '3안 · 흰 테두리 대비', tone: ['#FDF1D8', '#885907'],
      opt: { text: '오늘', size: 12, weight: 'Bold', pad: [6, 10, 6, 10], r: 6, bg: '#9B3331', ring: true, shadow: true },
      notes: [
        '1안 + 안쪽 1px 흰 테두리 0.35 — 어두운 포스터에서 칩 윤곽이 살아난다',
        '지도 워터마크에서 쓴 것과 같은 해법: 배경(포스터 그림)을 통제할 수 없을 때 테두리로 윤곽을 만든다',
        '그림자는 밝은 포스터에서 뭉개지고, 테두리는 배경과 무관하게 산다',
        '⚠ 칩이 작아서 테두리가 차지하는 비중이 크다 — 12px 미만에서는 지저분해 보인다',
      ],
    },
  ]

  for (const v of VARIANTS) {
    const col = F('v/' + v.key, { dir: 'V', gap: 10, w: 264 })
    gal.appendChild(col)
    col.appendChild(await tag(v.key, v.tone[0], v.tone[1]))

    /* 밝은 포스터 · 어두운 포스터 둘 다에 얹어 본다 */
    const pair = F('pair', { dir: 'H', gap: 12 })
    col.appendChild(pair)
    for (const [label, posterHex] of [['밝은 포스터', '#E8E2DA'], ['어두운 포스터', '#2B2622']]) {
      const wrap = F('w', { dir: 'V', gap: 6, align: 'CENTER' })
      pair.appendChild(wrap)
      const pw = F('poster', { dir: 'NONE', w: 120, h: 180, r: 6, fill: raw(posterHex) })
      wrap.appendChild(pw)
      const chip = await mkChip(pw, v.opt)
      chip.x = 120 - chip.width - 6
      chip.y = 6
      wrap.appendChild(await T(label, { font: P('Regular'), size: 10, color: 'text/caption' }))
    }
    await note(col, v.notes, 264)
  }
}

/* ── 4. 결정해야 하는 것 ────────────────────────────────────── */
{
  const c = await card('결정해야 하는 것', '고르면 바로 코드로 옮긴다')
  const l = F('l', { dir: 'V', gap: 10 })
  c.appendChild(l)
  for (const line of [
    '1. 순위 A / B / C 중 하나. B안을 미는 이유는 포스터 시작선(거터 24)을 안 건드리고, 종이 배경에서도 대비가 보장되고, 좌하단이 비어 있어 기존 칩과 안 부딪히기 때문이다.',
    '2. 순위가 포스터로 올라가면 캡션의 "예매 N위"는 중복이다. 그 자리를 비울지, 감독명으로 되돌릴지, 예매 수를 넣을지.',
    '3. 랭킹 섹션은 2개다 — "지금 예매 많은 영화"와 "이번 주 많이 찾아본 영화". 둘 다 같은 처리를 할지, 예매만 강조할지.',
    '4. 칩 1 / 2 / 3안 중 하나. 2안(점+라벨)은 라벨이 길어질 때 잘림 규칙을 먼저 정해야 한다.',
    '5. 칩 padding을 6·10으로 올리면 4배수 규칙에서 벗어난다. 6·12로 갈지, 규칙에 예외를 둘지.',
    '6. AGENTS.md의 칩 정책이 11px로 적혀 있는데 코드는 10px다. 어느 쪽이 맞는지 정하고 문서를 고쳐야 한다.',
  ]) {
    l.appendChild(await T(line, { font: P('Regular'), size: 12, color: 'text/sub', lh: 165, w: BOARD_W - 128 - 48 }))
  }
}

/* ── 5. 순서 재배치 — 코드 반영 시 걸리는 것 ─────────────────── */
{
  const c = await card('순서 재배치 — 코드로 옮길 때 걸리는 것', '인벤토리 보드에서 바꿔둔 순서를 그대로 옮기면 두 군데가 어긋난다')
  const l = F('l', { dir: 'V', gap: 10 })
  c.appendChild(l)
  for (const line of [
    '1. "지금 예매 많은 영화"를 고정 상단(영화제 배너 다음)으로 올렸다. 지금은 run2[0]이라 애널리틱스 position이 실린다. 번호 체계 밖으로 나가면 재배치 전후 CTR 비교가 끊긴다 — 개인화·기념일처럼 번호 밖으로 둘지, run1 앞에 넣어 번호를 유지할지 정해야 한다.',
    '2. NEW 4종(러닝타임 2 · 개봉주년 · 테마 9)을 특별전 #1보다 앞으로 올렸다. 코드 렌더 순서는 run1 → 특별전#1 → run2라서, 저 4개는 run1 뒤에 붙여야 한다. run2에 두면 특별전 뒤로 밀린다.',
  ]) {
    l.appendChild(await T(line, { font: P('Regular'), size: 12, color: 'text/sub', lh: 165, w: BOARD_W - 128 - 48 }))
  }
}

figma.currentPage = page
figma.viewport.scrollAndZoomIntoView([board])
figma.notify('랭킹·칩 제안 보드 생성' + (report.length ? ' · 확인 ' + [...new Set(report)].length : ''))
if (report.length) console.log([...new Set(report)].join('\n'))
