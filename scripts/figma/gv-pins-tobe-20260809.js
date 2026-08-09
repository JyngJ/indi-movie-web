// GV 핀 개선안 (2026-08-09) — 현행(「지도 핀 — 역싱크」) 기반 TOBE 시안
//  방향: 2.0 문법 수렴
//   · 타입: 10 / 11(오버레이 칩 정책) / 12 만 — 현행 7~9.5px 난립 제거
//   · radius: 카드 8 · 배지 4 · 칩 pill — 현행 2/3/6/9/12 난립 제거
//   · 카드 문법 = 포스터 핀과 통일: surface-card · 보더 1.5 neutral/200 · shadow.md
//   · GV 정체성 = 좌측 액센트 3px + gv 배지 (전면 solid 슬래브 축소)
//   · 접힘·영화제 칩: 3줄 → 단일 행 pill h24 (오버레이 칩 정책 11/600 준수, 꼬리 점 제거)
//   · selected: 앱 공통 primary 링 (gv 아님)
//  코드 반영 전 시안 — 확정 후 GvPinSlots.tsx 이식
// Scripter에서 Run.

const HEX = {
  'primary/700': '#404E81', 'gv/900': '#3E1782',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/500': '#857F76',
  'neutral/600': '#635D55', 'neutral/900': '#1A1714', 'white': '#FFFFFF',
  'success/700': '#4A7C59', 'warning': '#B9800E', 'error/900': '#9B3331',
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

const shadow = (hex, a, x, y, blur, spread = 0) => ({ type: 'DROP_SHADOW', color: rgba(hex, a), offset: { x, y }, radius: blur, spread, visible: true, blendMode: 'NORMAL' })
const SHADOW_MD = [shadow('#140F0A', 0.10, 0, 2, 4), shadow('#140F0A', 0.06, 0, 8, 20)]
const SHADOW_PIN = [shadow('#000000', 0.18, 0, 2, 6)]

function text(parent, chars, font, size, fill, opts = {}) {
  const t = figma.createText()
  t.fontName = font
  t.fontSize = size
  t.characters = chars
  t.fills = [fill]
  if (opts.ls) t.letterSpacing = { unit: 'PIXELS', value: opts.ls }
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

const GV = () => paint(['gv', 'gv/900'], HEX['gv/900'])
const CARD = () => paint(['surface/card', 'white'], '#FFFFFF')
const BORDER = () => paint(['neutral/200', 'border'], HEX['neutral/200'])
const CAPTION = () => paint(['neutral/500', 'text/caption'], HEX['neutral/500'])
const PRIMARY = () => paint(['neutral/900', 'text/primary'], HEX['neutral/900'])
const ONACC = () => paint(['on-accent', 'white'], '#FFFFFF')

/** GV 배지 — 10/700 · pad 2×6 · r4(badge) · h16 */
function gvBadge(parent, label = 'GV') {
  const b = frame('badge', 20, 16, { fill: GV(), radius: 4 })
  const t = text(b, label, P('Bold'), 10, ONACC(), { ls: 0.3 })
  parent.appendChild(b)
  b.resize(t.width + 12, 16)
  t.x = 6; t.y = 8 - t.height / 2
  return b
}

/* ══ 1. 콜아웃 TOBE — 148×64 · 좌측 액센트 3 · 폰트 10/12 ══ */
function calloutTobe({ selected = false, extra = 0 } = {}) {
  const W = 148, H = 64
  const f = frame(`GvCallout TOBE${selected ? ' · selected' : ''}${extra ? ' · +N' : ''}`, W, H, {
    fill: CARD(),
    radius: 8,
    stroke: selected ? paint(['primary/base', 'primary/700'], HEX['primary/700']) : BORDER(),
    strokeW: selected ? 2 : 1.5,
    effects: selected ? [shadow('#4A6380', 0.28, 0, 0, 0, 3), ...SHADOW_MD] : SHADOW_MD,
    clip: true,
  })
  const accent = frame('accent', 3, H, { fill: GV() })
  f.appendChild(accent); accent.x = 0; accent.y = 0
  const padL = 11  // 3(액센트) + 8
  const badge = gvBadge(f)
  badge.x = padL; badge.y = 8
  text(f, '19:30 상영 후', P('Medium'), 10, CAPTION(), { x: padL + badge.width + 6, y: 11 })
  text(f, '괴인', P('Bold'), 12, PRIMARY(), { x: padL, y: 30 })
  text(f, '이정홍 감독', P('Regular'), 10, CAPTION(), { x: padL, y: 47 })
  if (extra > 0) {
    const b = frame('extra', 24, 16, { fill: GV(), radius: 999 })
    const t = text(b, `+${extra}`, P('SemiBold'), 10, ONACC())
    f.appendChild(b)
    b.resize(t.width + 12, 16)
    b.x = W - 8 - b.width; b.y = 8
    t.x = 6; t.y = 8 - t.height / 2
  }
  return f
}

/** 스템+점 (현행 유지) */
function withStem(slot, name) {
  const W = slot.width, H = slot.height + 28 + 8
  const f = frame(name, W, H)
  f.appendChild(slot); slot.x = 0; slot.y = 0
  const stem = frame('stem', 1.5, 28, { fill: GV() })
  stem.opacity = 0.75
  f.appendChild(stem)
  stem.x = W / 2 - 0.75; stem.y = slot.height
  const dot = figma.createEllipse()
  dot.resize(8, 8)
  dot.fills = [GV()]
  dot.strokes = [paint(['neutral/100', 'surface/bg'], HEX['neutral/100'])]
  dot.strokeWeight = 2
  dot.effects = [shadow('#000000', 0.2, 0, 1, 4)]
  f.appendChild(dot)
  dot.x = W / 2 - 4; dot.y = slot.height + 28
  return f
}

/* ══ 2. 접힘 칩 TOBE — h24 pill · 11/600(오버레이 칩 정책) · 꼬리 점 제거 ══ */
function chipTobe(label, { selected = false } = {}) {
  const f = frame(`GvChip TOBE · ${label}${selected ? ' · selected' : ''}`, 60, 24, {
    fill: GV(),
    radius: 999,
    effects: selected
      ? [shadow('#FFFFFF', 1, 0, 0, 0, 2), shadow(HEX['primary/700'], 1, 0, 0, 0, 4)]
      : SHADOW_PIN,
  })
  const t = text(f, label, P('SemiBold'), 11, ONACC(), { x: 10, y: 12 })
  t.y = 12 - t.height / 2
  f.resize(t.width + 20, 24)
  return f
}

/* ══ 3. DS 카드 TOBE — 130×52 · 좌측 액센트 제거(배지 단일 액센트) · 상태 점+텍스트 10 ══ */
function dsCardTobe() {
  const W = 130, H = 52
  const f = frame('GvDsCard TOBE', W, H, {
    fill: CARD(), stroke: BORDER(), strokeW: 1.5, radius: 8, effects: SHADOW_MD, clip: true,
  })
  const poster = frame('poster', 24, 36, { fill: { type: 'SOLID', color: rgb('#35455E') }, radius: 4 })
  f.appendChild(poster); poster.x = 8; poster.y = 8
  const pl = text(poster, 'GV', P('Bold'), 10, { type: 'SOLID', color: rgba('#FFFFFF', 0.8) })
  pl.x = 12 - pl.width / 2; pl.y = 18 - pl.height / 2
  const cx0 = 8 + 24 + 8
  const badge = gvBadge(f)
  badge.x = cx0; badge.y = 8
  text(f, '19:30', P('Medium'), 10, CAPTION(), { x: cx0 + badge.width + 5, y: 11 })
  text(f, '괴인', P('Bold'), 12, PRIMARY(), { x: cx0, y: 29 })
  const dot = figma.createEllipse()
  dot.resize(6, 6)
  dot.fills = [paint(['success/700'], HEX['success/700'])]
  f.appendChild(dot)
  const st = text(f, '여유', P('SemiBold'), 10, paint(['success/700'], HEX['success/700']))
  st.x = W - 8 - st.width; st.y = 31
  dot.x = st.x - 10; dot.y = 34
  return f
}

/* ══ 4. 확장 스택 TOBE — 헤더 gv 배지 + 행 폰트 10/12 정리 ══ */
function stackRowTobe(parent, y, movie, guest, time, status, statusHex, hue, last = false) {
  const row = frame('row', 130, 50, { fill: CARD() })
  parent.appendChild(row); row.x = 0; row.y = y
  if (!last) {
    const bb = frame('rowBorder', 130, 1, { fill: BORDER() })
    row.appendChild(bb); bb.x = 0; bb.y = 49
  }
  const poster = frame('poster', 22, 32, { fill: { type: 'SOLID', color: rgb(hue) }, radius: 4 })
  row.appendChild(poster); poster.x = 8; poster.y = 9
  text(row, movie, P('SemiBold'), 12, PRIMARY(), { x: 37, y: 9 })
  text(row, guest, P('Regular'), 10, CAPTION(), { x: 37, y: 27 })
  const tt = text(row, time, P('SemiBold'), 12, PRIMARY())
  tt.x = 122 - tt.width; tt.y = 9
  const dot = figma.createEllipse()
  dot.resize(6, 6)
  dot.fills = [{ type: 'SOLID', color: rgb(statusHex) }]
  row.appendChild(dot)
  const st = text(row, status, P('SemiBold'), 10, { type: 'SOLID', color: rgb(statusHex) })
  st.x = 122 - st.width; st.y = 28
  dot.x = st.x - 10; dot.y = 31
  return row
}

function stackTobe() {
  const W = 130, rows = 3, H = 32 + rows * 50
  const f = frame('GvStack TOBE', W, H, {
    fill: CARD(), stroke: BORDER(), strokeW: 1.5, radius: 8,
    effects: [shadow('#000000', 0.15, 0, 4, 16)], clip: true,
  })
  const hdr = frame('header', W, 32, { fill: { type: 'SOLID', color: rgb(HEX['gv/900']), opacity: 0.08 } })
  f.appendChild(hdr); hdr.x = 0; hdr.y = 0
  const hb = frame('hdrBorder', W, 1, { fill: BORDER() })
  f.appendChild(hb); hb.x = 0; hb.y = 31
  const badge = gvBadge(f)
  badge.x = 8; badge.y = 8
  text(f, '3개', P('Bold'), 12, PRIMARY(), { x: 8 + badge.width + 6, y: 9 })
  const arr = text(f, '▲', P('Regular'), 10, CAPTION())
  arr.x = W - 8 - arr.width; arr.y = 11
  stackRowTobe(f, 32, '괴인', '이정홍 감독', '19:30', '여유', HEX['success/700'], '#35455E')
  stackRowTobe(f, 82, '너와 나', '조현철 감독', '16:00', '임박', HEX['warning'], '#5A3E2E')
  stackRowTobe(f, 132, '세기말의 사랑', '임선애 감독', '20:10', '매진', HEX['error/900'], '#3E5A2E', true)
  return f
}

/* ══ 배치 ══ */
const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('GV 핀 — 개선안'))
const section = figma.createSection()
section.name = 'GV 핀 — 개선안 (2026-08-09)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const asis = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('지도 핀 — 역싱크'))
  if (asis) { section.x = asis.x; section.y = asis.y + asis.height + 120 }
  else {
    const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
    section.x = maxX + 200; section.y = 0
  }
}
function place(node, x, y) { section.appendChild(node); node.x = x; node.y = y; return node }
function rowLabel(chars, y) {
  const t = text(section, chars, P('SemiBold'), 12, { type: 'SOLID', color: rgb('#726B65') })
  t.x = 40; t.y = y
  return t
}

rowLabel('콜아웃 TOBE — 148×64 · r8 · 좌측 gv 액센트 3px · 배지 10/700 r4 · 제목 12 · 부가 10', 40)
place(withStem(calloutTobe(), 'GvMarker TOBE'), 40, 64)
place(withStem(calloutTobe({ selected: true }), 'GvMarker TOBE selected'), 220, 64)
place(calloutTobe({ extra: 2 }), 400, 64)

rowLabel('접힘 칩 TOBE — h24 pill · 11/600 · 꼬리 점 제거 · 영화제 3줄→단일 행', 200)
place(chipTobe('GV 3개'), 40, 224)
place(chipTobe('GV 3개', { selected: true }), 140, 224)
place(chipTobe('인디다큐페스티발 · 5'), 240, 224)

rowLabel('DS 카드 TOBE — 좌측 액센트 바 제거(배지 단일 액센트) · 상태 점 6 + 텍스트 10', 290)
place(dsCardTobe(), 40, 314)

rowLabel('확장 스택 TOBE — 헤더 = GV 배지 + 개수 12 · 행 제목·시간 12 / 부가 10 · 상태 점+텍스트', 400)
place(withStem(stackTobe(), 'GvMarker TOBE 스택'), 40, 424)

const note = text(section, [
  'GV 핀 개선안 — 현행 대비 변경점',
  '· 타입 스케일 수렴: 7~9.5px 전부 제거 — 10(부가·상태) / 11(칩, 오버레이 칩 정책) / 12(제목·시간)만',
  '· radius 수렴: 카드 8 · 배지 4 · 칩 pill (현행 2/3/6/9/12 난립 제거)',
  '· 카드 문법 = 포스터 핀과 통일: surface-card · 보더 1.5 neutral/200 · shadow.md',
  '· GV 정체성: 콜아웃 좌측 액센트 3px + gv 배지 — solid 슬래브는 접힘 칩만 유지',
  '· 접힘 칩: h22→24 · "이벤트 N개 ·"→"GV N개" (꼬리 점 제거) / 영화제: 3줄 42h → 단일 행 pill',
  '· DS 카드: 좌측 액센트 바 삭제 (배지와 이중 액센트) · 상태 "● 8.5px" → 점 6px + 텍스트 10',
  '· 스택 헤더: "GV(8px)+GV 3개" → GV 배지 + "3개" / 상태 라벨 축약: 매진 임박→임박',
  '· selected·스템·점·줌 스케일 로직은 현행 유지',
  '확정 시 GvPinSlots.tsx·GvMarkerIcon.tsx 이식 + 콜아웃 줌 축소(15~17)는 동일 비율 적용',
].join('\n'), P('Regular'), 12, { type: 'SOLID', color: rgb('#726B65') })
note.x = 40; note.y = 640

section.resizeWithoutConstraints(600, 880)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('GV 핀 개선안 생성')
