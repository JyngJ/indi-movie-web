// 지도 포스터 시트(핀) 단계별 역싱크 (2026-08-09) — 코드 실측값
//  소스: src/components/map/PosterGrid.tsx · src/components/domain/PosterThumb.tsx · src/lib/map/posterLogic.ts
//  단계(줌 용량): ≤13 → MapPin 점(별도 섹션) · 14 → 1장 · 15 → 3장 · 16+ → 6장(3×2)
//  초과 시 마지막 슬롯에 어두운 오버레이 — 용량1은 "N편", 그 외 "+N"
//  카드: surface-card · r8 · 보더 1.5 neutral/200 · pad 8 · gap 4 · shadow.md · 꼬리 10×10 rotate45(top -6)
//  selected: 카드 primary 면 + 보더 rgba(0,0,0,.14) + shadow.lg / 포스터 하이라이트: primary 링 2 + 흰 inset 1.5
//  일정 모드(단건): 포스터 44×66 + 점선 구분 + "상영 일정" pill + 요일별 행(모노 시간)
//  포스터: 44×66(모바일 기본) r4 · placeholder = neutral/800 + 흰 제목
// Scripter에서 Run.

const HEX = {
  'primary/700': '#404E81', 'primary/500': '#6D7CB0', 'primary/100': '#ECEFF9',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/500': '#857F76',
  'neutral/800': '#2B2622', 'neutral/900': '#1A1714',
  'error/900': '#9B3331', 'white': '#FFFFFF',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const rgba = (hex, a) => ({ ...rgb(hex), a })

const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(names, hex) {
  const list = Array.isArray(names) ? names : [names]
  const solid = { type: 'SOLID', color: rgb(hex ?? HEX[list[0]] ?? '#FF00FF') }
  for (const n of list) {
    const v = varByName.get(n)
    if (v) return figma.variables.setBoundVariableForPaint(solid, 'color', v)
  }
  return solid
}
const P = (style) => ({ family: 'Pretendard', style })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))
let MONO = { family: 'SF Mono', style: 'Semibold' }
try { await figma.loadFontAsync(MONO) } catch {
  try { MONO = { family: 'SF Mono', style: 'Medium' }; await figma.loadFontAsync(MONO) } catch {
    MONO = P('SemiBold'); await figma.loadFontAsync(MONO)
  }
}

const shadow = (hex, a, x, y, blur, spread = 0) => ({ type: 'DROP_SHADOW', color: rgba(hex, a), offset: { x, y }, radius: blur, spread, visible: true, blendMode: 'NORMAL' })
const SHADOW_MD = [shadow('#140F0A', 0.10, 0, 2, 4), shadow('#140F0A', 0.06, 0, 8, 20)]
const SHADOW_LG = [shadow('#140F0A', 0.10, 0, 4, 8), shadow('#140F0A', 0.08, 0, 16, 40)]

function text(parent, chars, font, size, fill, opts = {}) {
  const t = figma.createText()
  t.fontName = font
  t.fontSize = size
  t.characters = chars
  t.fills = [fill]
  if (opts.ls) t.letterSpacing = { unit: 'PIXELS', value: opts.ls }
  if (opts.lh) t.lineHeight = { unit: 'PERCENT', value: opts.lh * 100 }
  parent.appendChild(t)
  if (opts.x != null) t.x = opts.x
  if (opts.y != null) t.y = opts.y
  return t
}
function frame(name, w, h, opts = {}) {
  const f = figma.createFrame()
  f.name = name
  f.resize(w, h)
  f.fills = opts.fill ? [opts.fill] : []
  if (opts.radius != null) f.cornerRadius = opts.radius
  if (opts.stroke) { f.strokes = [opts.stroke]; f.strokeWeight = opts.strokeW ?? 1 }
  if (opts.effects) f.effects = opts.effects
  f.clipsContent = opts.clip ?? false
  return f
}

const PW = 44, PH = 66  // 모바일 기본 포스터

/** PosterThumb placeholder — neutral/800 + 흰 제목, r4, 얇은 inset 보더 */
function poster(parent, title, { overlay, highlighted = false } = {}) {
  const p = frame('poster', PW, PH, { fill: paint(['neutral/800'], HEX['neutral/800']), radius: 4, clip: true })
  parent.appendChild(p)
  if (title) {
    const t = text(p, title, P('Bold'), 11, { type: 'SOLID', color: rgba('#FFFFFF', 0.9) }, { lh: 1.3 })
    t.textAlignHorizontal = 'CENTER'
    t.resize(PW - 8, t.height)
    t.x = 4; t.y = PH / 2 - t.height / 2
  }
  if (overlay != null) {
    const ov = frame('overflow', PW, PH, { fill: { type: 'SOLID', color: rgb('#0F0C09'), opacity: 0.62 }, radius: 4 })
    p.appendChild(ov); ov.x = 0; ov.y = 0
    const t = text(ov, overlay, P('SemiBold'), 15, { type: 'SOLID', color: rgb('#FFFFFF') })
    t.x = PW / 2 - t.width / 2; t.y = PH / 2 - t.height / 2
  }
  // 얇은 포스터 보더 (inset 1px)
  p.strokes = [{ type: 'SOLID', color: rgb('#000000'), opacity: 0.12 }]
  p.strokeWeight = 1
  p.strokeAlign = 'INSIDE'
  if (highlighted) {
    p.effects = [shadow(HEX['primary/700'], 1, 0, 0, 0, 2), { type: 'INNER_SHADOW', color: rgba('#FFFFFF', 0.85), offset: { x: 0, y: 0 }, radius: 0, spread: 1.5, visible: true, blendMode: 'NORMAL' }]
  }
  return p
}

/** 카드 + 꼬리(up) 래퍼 */
function posterCard(name, contentW, contentH, { selected = false } = {}) {
  const W = contentW + 16, H = contentH + 16
  const wrap = frame(name, W, H + 6)  // 꼬리 여유
  const tail = figma.createRectangle()
  tail.resize(10, 10)
  tail.fills = [selected ? paint(['primary/base', 'primary/700'], HEX['primary/700']) : paint(['surface/card', 'white'], '#FFFFFF')]
  tail.strokes = [selected ? { type: 'SOLID', color: rgba('#000000', 0.14) } : paint(['neutral/200', 'border'], HEX['neutral/200'])]
  tail.strokeWeight = 1.5
  tail.topRightRadius = 2
  wrap.appendChild(tail)
  tail.rotation = 45  // 위 꼬리 — 카드 상단 중앙, top -6
  tail.x = W / 2; tail.y = 6 - 10 + 7  // rotate45 중심 보정
  const card = frame('card', W, H, {
    fill: selected ? paint(['primary/base', 'primary/700'], HEX['primary/700']) : paint(['surface/card', 'white'], '#FFFFFF'),
    radius: 8,
    stroke: selected ? { type: 'SOLID', color: rgba('#000000', 0.14) } : paint(['neutral/200', 'border'], HEX['neutral/200']),
    strokeW: 1.5,
    effects: selected ? SHADOW_LG : SHADOW_MD,
  })
  wrap.appendChild(card)
  card.x = 0; card.y = 6
  return { wrap, card }
}

/** "N편 일치" / "N회" 칩 — 카드 우상단 -8,-8 */
function matchChip(wrap, card, label) {
  const c = frame('chip', 10, 18, { fill: paint(['primary/base', 'primary/700'], HEX['primary/700']), radius: 999, stroke: paint(['neutral/100', 'surface/bg'], HEX['neutral/100']), strokeW: 1.5, effects: [shadow('#000000', 0.3, 0, 1, 4)] })
  const t = text(c, label, P('Bold'), 10, paint(['on-accent', 'white'], '#FFFFFF'))
  wrap.appendChild(c)
  c.resize(t.width + 16, t.height + 8)
  t.x = 8; t.y = 4
  c.x = card.x + card.width - c.width + 8
  c.y = card.y - 8
  return c
}

/* ══ 단계 조립 ══ */
const GAP = 4

function stageZ14Single(title) {
  const { wrap, card } = posterCard('zoom14 · 단건', PW, PH)
  poster(card, title).x = 8
  card.children[card.children.length - 1].y = 8
  return wrap
}
function stageZ14Multi() {
  const { wrap, card } = posterCard('zoom14 · 다건 (용량1 초과)', PW, PH)
  const p = poster(card, '괴인', { overlay: '12편' })
  p.x = 8; p.y = 8
  return wrap
}
function stageZ15({ selected = false, withChip = false } = {}) {
  const contentW = PW * 3 + GAP * 2
  const { wrap, card } = posterCard(`zoom15 · 3장${selected ? ' · selected' : ''}${withChip ? ' · 필터 매치' : ''}`, contentW, PH, { selected })
  const titles = ['괴인', '너와 나']
  titles.forEach((title, i) => {
    const p = poster(card, title, { highlighted: withChip && i === 0 })
    p.x = 8 + i * (PW + GAP); p.y = 8
  })
  const last = poster(card, '세기말의 사랑', { overlay: '+9' })
  last.x = 8 + 2 * (PW + GAP); last.y = 8
  if (withChip) matchChip(wrap, card, '3편 일치')
  return wrap
}
function stageZ16() {
  const contentW = PW * 3 + GAP * 2, contentH = PH * 2 + GAP
  const { wrap, card } = posterCard('zoom16 · 6장 (3×2)', contentW, contentH)
  const titles = ['괴인', '너와 나', '세기말의 사랑', '미지수', '장손']
  titles.forEach((title, i) => {
    const p = poster(card, title)
    p.x = 8 + (i % 3) * (PW + GAP); p.y = 8 + Math.floor(i / 3) * (PH + GAP)
  })
  const last = poster(card, '한국이 싫어서', { overlay: '+7' })
  last.x = 8 + 2 * (PW + GAP); last.y = 8 + PH + GAP
  return wrap
}

/** 일정 모드 — 단건 + 점선 구분 + "상영 일정" pill + 요일 행 */
function stageSchedule() {
  const rows = [
    { label: '오늘', color: paint(['primary/base', 'primary/700'], HEX['primary/700']), times: ['19:30', '21:10'] },
    { label: '토', color: paint(['primary/500'], HEX['primary/500']), times: ['14:00', '16:20', '19:00'], more: 2 },
    { label: '일', color: paint(['error', 'error/900'], HEX['error/900']), times: ['15:30'] },
  ]
  const schedW = 110
  const contentW = PW + 8 + 1 + 8 + schedW
  const { wrap, card } = posterCard('zoom14 · 일정 모드', contentW, PH)
  const p = poster(card, '괴인')
  p.x = 8; p.y = 8
  // 점선 구분선
  const div = figma.createLine()
  div.resize(PH, 0)
  div.rotation = 90
  div.strokes = [paint(['neutral/200', 'border'], HEX['neutral/200'])]
  div.strokeWeight = 1
  div.dashPattern = [3, 3]
  card.appendChild(div)
  div.x = 8 + PW + 8; div.y = 8 + PH
  const sx = 8 + PW + 8 + 1 + 8
  // "상영 일정" pill
  const pill = frame('pill', schedW, 18, { fill: paint(['primary/subtle-l', 'primary/100'], HEX['primary/100']), radius: 999 })
  const pt = text(pill, '상영 일정', P('Bold'), 10, paint(['primary/base', 'primary/700'], HEX['primary/700']))
  card.appendChild(pill)
  pill.resize(pt.width + 16, pt.height + 8)
  pt.x = 8; pt.y = 4
  pill.x = sx; pill.y = 8
  // 요일 행 (gap 4, 라벨 minWidth 29 + gap 8, 시간 SF Mono 10/600 ls .2)
  let ry = 8 + pill.height + 4
  for (const r of rows) {
    text(card, r.label, P('Bold'), 10, r.color, { x: sx, y: ry + 1 })
    let tx = sx + 29 + 8
    for (const tm of r.times) {
      const t = text(card, tm, MONO, 10, paint(['neutral/900', 'text/primary'], HEX['neutral/900']), { x: tx, y: ry + 1, ls: 0.2 })
      tx += t.width + 4
    }
    if (r.more) text(card, `+${r.more}`, P('SemiBold'), 10, paint(['neutral/500', 'text/caption'], HEX['neutral/500']), { x: tx, y: ry + 1 })
    ry += 13 + 4
  }
  matchChip(wrap, card, '3회')
  return wrap
}

/* ══ 배치 ══ */
const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('지도 포스터 핀 — 단계별'))
const section = figma.createSection()
section.name = '지도 포스터 핀 — 단계별 역싱크 (2026-08-09)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
  section.x = maxX + 200; section.y = 0
}
function place(node, x, y) { section.appendChild(node); node.x = x; node.y = y; return node }
function rowLabel(chars, y) {
  const t = text(section, chars, P('SemiBold'), 12, { type: 'SOLID', color: rgb('#726B65') })
  t.x = 40; t.y = y
  return t
}

rowLabel('zoom 14 — 용량 1: 단건 / 다건("N편" 오버레이) / 일정 모드("N회" 칩 + 요일 행)', 40)
place(stageZ14Single('괴인'), 40, 64)
place(stageZ14Multi(), 130, 64)
place(stageSchedule(), 220, 64)

rowLabel('zoom 15 — 용량 3: 2장 + "+N" / selected(primary 면 + shadow.lg) / 필터 매치("N편 일치" + 하이라이트 링)', 190)
place(stageZ15(), 40, 214)
place(stageZ15({ selected: true }), 210, 214)
place(stageZ15({ withChip: true }), 380, 214)

rowLabel('zoom 16+ — 용량 6: 3×2, 마지막 슬롯 "+N"', 340)
place(stageZ16(), 40, 364)

const note = text(section, [
  '지도 포스터 시트 — 단계별 (PosterGrid.tsx / PosterThumb.tsx / posterLogic.ts 실측)',
  '· 줌 용량: ≤13 → 0 (MapPin 점, 「지도 핀 — 역싱크」 섹션) · 14 → 1 · 15 → 3 · 16+ → 6',
  '· 초과: 용량1이면 첫 포스터에 "N편" 오버레이(전체 수), 그 외 마지막 슬롯 "+N"(rgba 15,12,9 .62)',
  '· 포스터 크기(모바일): 기본 44×66 — 줌 17→56×84 · 18→60×90 · 19→66×99 / 데스크톱 74·90·108·126 폭',
  '· 카드: r8 · pad 8 · gap 4 · 보더 1.5 neutral/200 · shadow.md · 꼬리 10×10 rotate45 top-6 (오른쪽 꼬리 변형도 있음)',
  '· selected: primary/700 면 + 보더 rgba(0,0,0,.14) + shadow.lg / 필터 매치 포스터: primary 링 2 + 흰 inset 1.5',
  '· 일정 모드: 단건+일정 있을 때 — 요일색: 오늘 primary·토 primary/500·일 error/900·평일 caption, 시간 SF Mono 10/600',
  '· 호버 툴팁(pm-tip)·전체 목록(po-list)은 CSS 모듈 — 이번 역싱크 범위 밖',
].join('\n'), P('Regular'), 12, { type: 'SOLID', color: rgb('#726B65') })
note.x = 40; note.y = 560

section.resizeWithoutConstraints(620, 760)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('포스터 핀 단계별 역싱크 완료')
