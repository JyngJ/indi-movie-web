// 지도 핀 역싱크 (2026-08-09) — MapPin·GV 핀 전 상태를 코드 실측값으로 피그마에 생성
//  소스: src/components/domain/MapPin.tsx · GvPinSlots.tsx · GvMarkerIcon.tsx
//  구성:
//   Row1 MapPin — indie/cgv/mega/lotte 점(22px) + selected(오라44+링) + dimmed + 라벨(KIMM 13/800 흰 외곽선)
//   Row2 GV 콜아웃 핀(zoom18, 148×62) default/selected + 스템28 + 점8 (GvMarkerIcon 합성)
//   Row3 GV 접힘 칩(h22) · 영화제 칩(h42, radius/control)
//   Row4 GV DS 카드(130×52) + 오버플로우 칩(130×24)
//   Row5 GV 확장 스택(헤더32 + 행50×3)
//  주의: GvPin.tsx(레거시 콜아웃 148×66, 포스터 30×44)는 지도 미사용이라 제외
// Scripter에서 Run.

const HEX = {
  'primary/700': '#404E81', 'gv/900': '#3E1782',
  'cgv': '#E30613', 'mega': '#6C1E9F', 'lotte': '#ED1C24',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/500': '#857F76',
  'neutral/600': '#635D55', 'neutral/900': '#1A1714',
  'white': '#FFFFFF',
  'success/700': '#4A7C59', 'warning': '#B9800E', 'error/800': '#9B3331',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const rgba = (hex, a) => ({ ...rgb(hex), a })

const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
/** 첫 번째로 존재하는 변수명에 바인딩, 없으면 hex 솔리드 */
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
let KIMM = { family: 'KIMM_Bold', style: 'B' }
try { await figma.loadFontAsync(KIMM) } catch {
  const fonts = await figma.listAvailableFontsAsync()
  const c = fonts.find(f => /KIMM/i.test(f.fontName.family))
  KIMM = c ? c.fontName : P('Bold')
  await figma.loadFontAsync(KIMM)
}

const shadow = (hex, a, x, y, blur, spread = 0) => ({ type: 'DROP_SHADOW', color: rgba(hex, a), offset: { x, y }, radius: blur, spread, visible: true, blendMode: 'NORMAL' })

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

/* ══ Row 1 — MapPin (극장 점 핀) ══ */
const PIN = {
  indie: { dot: ['primary/base', 'primary/700'], hex: HEX['primary/700'], aura: rgba('#4A6380', 0.25) },
  cgv: { dot: ['cgv'], hex: HEX['cgv'], aura: rgba('#E30613', 0.25) },
  mega: { dot: ['mega'], hex: HEX['mega'], aura: rgba('#6C1E9F', 0.25) },
  lotte: { dot: ['lotte'], hex: HEX['lotte'], aura: rgba('#ED1C24', 0.25) },
}

function mapPin(kind, { selected = false, dimmed = false, label } = {}) {
  const spec = PIN[kind]
  const W = 80, labelH = label ? 18 : 0
  const f = frame(`MapPin · ${kind}${selected ? ' · selected' : ''}${dimmed ? ' · dimmed' : ''}`, W, labelH + 2 + 22 + (selected ? 11 : 0))
  const cx = W / 2
  const dotY = labelH + 2
  if (selected) {
    const aura = figma.createEllipse()
    aura.resize(44, 44)
    aura.fills = [{ type: 'SOLID', color: { r: spec.aura.r, g: spec.aura.g, b: spec.aura.b }, opacity: spec.aura.a }]
    f.appendChild(aura)
    aura.x = cx - 22; aura.y = dotY + 22 - 33  // dot 하단 정렬: bottom -((44-22)/2)
  }
  if (label) {
    const t = text(f, label, KIMM, 13, { type: 'SOLID', color: rgb('#111111') })
    // 코드: 8방향 흰 text-shadow 외곽선 — 피그마는 흰 스트로크 외측 + 그림자로 대응
    t.strokes = [{ type: 'SOLID', color: rgb('#FFFFFF') }]
    t.strokeWeight = 1.5
    t.strokeAlign = 'OUTSIDE'
    t.effects = [shadow('#000000', 0.25, 0, 2, 6)]
    t.x = cx - t.width / 2; t.y = 0
  }
  const dot = figma.createEllipse()
  dot.resize(22, 22)
  dot.fills = [dimmed ? { type: 'SOLID', color: rgb('#6B7280') } : paint(spec.dot, spec.hex)]
  dot.strokes = [selected ? { type: 'SOLID', color: rgb('#FFFFFF') } : paint(['neutral/100', 'surface/bg'], HEX['neutral/100'])]
  dot.strokeWeight = selected ? 2.5 : 2
  dot.effects = selected
    ? [shadow('#000000', 0.28, 0, 2, 8), shadow(HEX['primary/700'], 1, 0, 0, 0, 2.5)]
    : [shadow('#000000', 0.18, 0, 2, 6)]
  f.appendChild(dot)
  dot.x = cx - 11; dot.y = dotY
  return f
}

/* ══ GV 공통 조각 ══ */
function typeBadge(parent, label, fontSize, radius, padX, padY) {
  const w = label.length * fontSize * 0.9 + padX * 2
  const b = frame('badge', Math.ceil(w), Math.ceil(fontSize + padY * 2 + 2), { fill: paint(['gv', 'gv/900'], HEX['gv/900']), radius })
  const t = text(b, label, P('Bold'), fontSize, paint(['on-accent', 'white'], '#FFFFFF'), { ls: 0.3 })
  parent.appendChild(b)
  b.resize(t.width + padX * 2, t.height + padY * 2)
  t.x = padX; t.y = padY
  return b
}

/** GvCalloutBubble 148×62 (zoom 18) — GV 배지·시간·제목·게스트 */
function gvCallout({ selected = false, extra = 0 } = {}) {
  const W = 148, H = 62
  const f = frame(`GvCallout · zoom18${selected ? ' · selected' : ''}${extra ? ' · +N' : ''}`, W, H, {
    fill: paint(['surface/card', 'white'], '#FFFFFF'),
    radius: 9,
    stroke: selected ? paint(['primary/base', 'primary/700'], HEX['primary/700']) : paint(['neutral/200', 'border'], HEX['neutral/200']),
    strokeW: selected ? 2 : 1,
    effects: selected
      ? [shadow('#4A6380', 0.28, 0, 0, 0, 3), shadow('#140F0A', 0.15, 0, 2, 8)]
      : [shadow('#140F0A', 0.10, 0, 1, 6)],
    clip: true,
  })
  const padY = 10, padL = 10  // vPad = max(5, (62-42)/2) = 10
  const badge = typeBadge(f, 'GV', 7.5, 3, 3, 1)
  badge.x = padL; badge.y = padY
  text(f, '19:30 상영 후', P('Regular'), 8.5, paint(['neutral/500', 'text/caption'], HEX['neutral/500']), { x: padL + badge.width + 4, y: padY + 1 })
  text(f, '괴인', KIMM, 11, paint(['neutral/900', 'text/primary'], HEX['neutral/900']), { x: padL, y: padY + badge.height + 3 })
  text(f, '이정홍 감독', P('Regular'), 9, paint(['neutral/500', 'text/caption'], HEX['neutral/500']), { x: padL, y: H - padY - 9 })
  if (extra > 0) {
    const b = frame('extra', 24, 14, { fill: paint(['gv', 'gv/900'], HEX['gv/900']), radius: 8 })
    const t = text(b, `+${extra}`, P('Bold'), 9, paint(['on-accent', 'white'], '#FFFFFF'))
    f.appendChild(b)
    b.resize(t.width + 10, 14)
    b.x = W - 6 - b.width; b.y = 6
    t.x = 5; t.y = 2
  }
  return f
}

/** GvMarkerIcon 합성 — 슬롯 + 스템 28 + 점 8 */
function withMarkerStem(slot, name) {
  const W = slot.width, H = slot.height + 28 + 8
  const f = frame(name, W, H)
  f.appendChild(slot)
  slot.x = 0; slot.y = 0
  const stem = frame('stem', 1.5, 28, { fill: paint(['gv', 'gv/900'], HEX['gv/900']) })
  stem.opacity = 0.75
  f.appendChild(stem)
  stem.x = W / 2 - 0.75; stem.y = slot.height
  const dot = figma.createEllipse()
  dot.resize(8, 8)
  dot.fills = [paint(['gv', 'gv/900'], HEX['gv/900'])]
  dot.strokes = [paint(['neutral/100', 'surface/bg'], HEX['neutral/100'])]
  dot.strokeWeight = 2
  dot.effects = [shadow('#000000', 0.2, 0, 1, 4)]
  f.appendChild(dot)
  dot.x = W / 2 - 4; dot.y = slot.height + 28
  return f
}

/* ══ Row 3 — 접힘 칩 ══ */
function gvCollapsedChip(selected = false) {
  const f = frame(`GvChip · 접힘${selected ? ' · selected' : ''}`, 90, 22, {
    fill: paint(['gv', 'gv/900'], HEX['gv/900']),
    radius: 12,
    effects: selected
      ? [shadow('#FFFFFF', 1, 0, 0, 0, 2), shadow(HEX['primary/700'], 1, 0, 0, 0, 4)]
      : [shadow('#000000', 0.18, 0, 1, 4)],
  })
  const t = text(f, '이벤트 3개', P('Bold'), 11, paint(['on-accent', 'white'], '#FFFFFF'), { x: 5, y: 5 })
  const dotT = text(f, '·', P('Regular'), 10, { type: 'SOLID', color: rgb('#FFFFFF') }, { y: 6 })
  dotT.opacity = 0.7
  dotT.x = 5 + t.width + 5
  f.resize(5 + t.width + 5 + dotT.width + 8, 22)
  return f
}

function gvFestivalChip() {
  const W = 150, H = 42
  const f = frame('GvChip · 영화제', W, H, {
    fill: paint(['gv', 'gv/900'], HEX['gv/900']),
    radius: 12, // radius/control
    effects: [shadow('#000000', 0.18, 0, 2, 6)],
  })
  const t1 = text(f, '인디다큐페스티발', P('Bold'), 11, paint(['on-accent', 'white'], '#FFFFFF'))
  t1.x = W / 2 - t1.width / 2; t1.y = 6
  const div = frame('divider', W - 20, 1, { fill: { type: 'SOLID', color: rgb('#FFFFFF') } })
  div.opacity = 0.45
  f.appendChild(div)
  div.x = 10; div.y = 21
  const t2 = text(f, '이벤트 5개', P('SemiBold'), 11, { type: 'SOLID', color: rgb('#FFFFFF') })
  t2.opacity = 0.9
  t2.x = W / 2 - t2.width / 2; t2.y = 25
  return f
}

/* ══ Row 4 — DS 카드 + 오버플로우 ══ */
function gvDsCard() {
  const W = 130, H = 52
  const f = frame('GvDsCard · zoom14', W, H, {
    fill: paint(['surface/card', 'white'], '#FFFFFF'),
    stroke: paint(['neutral/200', 'border'], HEX['neutral/200']),
    radius: 8,
    effects: [shadow('#000000', 0.10, 0, 2, 8)],
    clip: true,
  })
  const accent = frame('accent', 3, H, { fill: paint(['gv', 'gv/900'], HEX['gv/900']) })
  f.appendChild(accent); accent.x = 0; accent.y = 0
  const poster = frame('poster', 24, 34, { fill: { type: 'SOLID', color: rgb('#35455E') }, radius: 3 })
  f.appendChild(poster); poster.x = 9; poster.y = 9
  const pl = text(poster, 'GV', P('Bold'), 9.5, { type: 'SOLID', color: rgba('#FFFFFF', 0.8) })
  pl.x = 12 - pl.width / 2; pl.y = 17 - pl.height / 2
  const cx0 = 9 + 24 + 6 + 4
  const badge = typeBadge(f, 'GV', 7, 2, 3, 1)
  badge.x = cx0; badge.y = 8
  text(f, '19:30', P('Regular'), 9, paint(['neutral/500', 'text/caption'], HEX['neutral/500']), { x: cx0 + badge.width + 3, y: 8.5 })
  text(f, '괴인', P('Bold'), 11.5, paint(['neutral/900', 'text/primary'], HEX['neutral/900']), { x: cx0, y: 20 })
  text(f, '이정홍 감독', P('Regular'), 9, paint(['neutral/500', 'text/caption'], HEX['neutral/500']), { x: cx0, y: 35 })
  const st = text(f, '● 여유', P('SemiBold'), 9, paint(['success/700'], HEX['success/700']))
  st.x = W - 8 - st.width; st.y = H / 2 - st.height / 2
  return f
}

function gvOverflowChip() {
  const f = frame('GvOverflow', 130, 24, {
    fill: paint(['surface/card', 'white'], '#FFFFFF'),
    stroke: paint(['neutral/200', 'border'], HEX['neutral/200']),
    radius: 6,
    effects: [shadow('#000000', 0.08, 0, 1, 4)],
  })
  const t = text(f, '+ 2개 더보기 ›', P('SemiBold'), 10, paint(['neutral/600', 'text/sub'], HEX['neutral/600']))
  t.x = 65 - t.width / 2; t.y = 12 - t.height / 2
  return f
}

/* ══ Row 5 — 확장 스택 ══ */
function gvStackRow(parent, y, movie, guest, time, status, statusHex, hue) {
  const row = frame('row', 130, 50, { fill: paint(['surface/card', 'white'], '#FFFFFF') })
  parent.appendChild(row); row.x = 0; row.y = y
  const bb = frame('rowBorder', 130, 1, { fill: paint(['neutral/200', 'border'], HEX['neutral/200']) })
  row.appendChild(bb); bb.x = 0; bb.y = 49
  const poster = frame('poster', 22, 32, { fill: { type: 'SOLID', color: rgb(hue) }, radius: 3 })
  row.appendChild(poster); poster.x = 8; poster.y = 9
  const pl = text(poster, 'GV', P('Bold'), 9, { type: 'SOLID', color: rgba('#FFFFFF', 0.8) })
  pl.x = 11 - pl.width / 2; pl.y = 16 - pl.height / 2
  text(row, movie, P('SemiBold'), 11.5, paint(['neutral/900', 'text/primary'], HEX['neutral/900']), { x: 37, y: 10 })
  text(row, guest, P('Regular'), 9, paint(['neutral/500', 'text/caption'], HEX['neutral/500']), { x: 37, y: 27 })
  const tt = text(row, time, P('SemiBold'), 11, paint(['neutral/900', 'text/primary'], HEX['neutral/900']))
  tt.x = 122 - tt.width; tt.y = 10
  const st = text(row, `● ${status}`, P('SemiBold'), 8.5, { type: 'SOLID', color: rgb(statusHex) })
  st.x = 122 - st.width; st.y = 27
  return row
}

function gvExpandedStack() {
  const W = 130, rows = 3, H = 32 + rows * 50
  const f = frame('GvStack · 확장 (zoom≤13)', W, H, {
    fill: paint(['surface/card', 'white'], '#FFFFFF'),
    stroke: paint(['neutral/200', 'border'], HEX['neutral/200']),
    radius: 8,
    effects: [shadow('#000000', 0.15, 0, 4, 16)],
    clip: true,
  })
  const hdr = frame('header', W, 32, { fill: { type: 'SOLID', color: rgb(HEX['gv/900']), opacity: 0.078 } })  // accent+14(hex alpha)
  f.appendChild(hdr); hdr.x = 0; hdr.y = 0
  const hb = frame('hdrBorder', W, 1, { fill: paint(['neutral/200', 'border'], HEX['neutral/200']) })
  f.appendChild(hb); hb.x = 0; hb.y = 31
  const gvT = text(f, 'GV', P('Bold'), 8, paint(['gv', 'gv/900'], HEX['gv/900']), { x: 8, y: 12, ls: 0.3 })
  text(f, 'GV 3개', P('Bold'), 12, paint(['neutral/900', 'text/primary'], HEX['neutral/900']), { x: 8 + gvT.width + 5, y: 9 })
  const arr = text(f, '▲', P('Regular'), 10, paint(['neutral/500', 'text/caption'], HEX['neutral/500']))
  arr.x = W - 8 - arr.width; arr.y = 10
  gvStackRow(f, 32, '괴인', '이정홍 감독', '19:30', '여유', HEX['success/700'], '#35455E')
  gvStackRow(f, 82, '너와 나', '조현철 감독', '16:00', '매진 임박', HEX['warning'], '#5A3E2E')
  gvStackRow(f, 132, '세기말의 사랑', '임선애 감독', '20:10', '매진', HEX['error/800'], '#3E5A2E')
  return f
}

/* ══ 배치 ══ */
const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('지도 핀 — 역싱크'))
const section = figma.createSection()
section.name = '지도 핀 — 역싱크 (2026-08-09)'
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

rowLabel('MapPin — 극장 점 핀 (dot 22 · 오라 44 · 라벨 KIMM 13/800 흰 외곽선 1.5)', 40)
place(mapPin('indie', { label: '인디스페이스' }), 40, 64)
place(mapPin('indie', { selected: true, label: '인디스페이스' }), 140, 64)
place(mapPin('cgv'), 240, 64)
place(mapPin('mega'), 320, 64)
place(mapPin('lotte'), 400, 64)
place(mapPin('indie', { dimmed: true }), 480, 64)

rowLabel('GV 콜아웃 핀 — zoom18 148×62 · r9 · 스템 1.5×28 op.75 · 점 8 (GvMarkerIcon)', 180)
place(withMarkerStem(gvCallout(), 'GvMarker · 콜아웃'), 40, 204)
place(withMarkerStem(gvCallout({ selected: true }), 'GvMarker · 콜아웃 selected'), 220, 204)
place(gvCallout({ extra: 2 }), 400, 204)

rowLabel('접힘 칩 (zoom≤13) — h22 r12 gv솔리드 · 영화제 h42 r12(control) 3줄', 330)
place(gvCollapsedChip(), 40, 354)
place(gvCollapsedChip(true), 160, 354)
place(gvFestivalChip(), 280, 344)

rowLabel('DS 카드 (zoom14 다건) — 130×52 r8 좌측 액센트 3px · 오버플로우 130×24 r6', 420)
place(gvDsCard(), 40, 444)
place(gvOverflowChip(), 190, 458)

rowLabel('확장 스택 (zoom≤13 펼침) — 130w · 헤더 32(gv 8%) · 행 50 · 상태색 success/warning/error', 530)
place(withMarkerStem(gvExpandedStack(), 'GvMarker · 스택'), 40, 554)

const note = text(section, [
  '지도 핀 — 코드 실측 역싱크 (MapPin.tsx / GvPinSlots.tsx / GvMarkerIcon.tsx)',
  '· MapPin: 점 22 보더2(surface-bg) shadow.pin / selected: 흰보더 2.5 + primary 링 2.5 + 오라 44(25%)',
  '· GV 보라 #3E1782(gv/900) 단일 — 타입 구분은 배지 텍스트 (1.0 상태색 유용 폐지)',
  '· 콜아웃 줌 스케일: 15→112×48 · 16→124×54 · 17→136×58 · 18+→148×62 (여기엔 18+만)',
  '· 다건: 최대 4개 스택(3초과 2열), 초과분 마지막 슬롯 "+N개 이벤트" 오버레이',
  '· 제외: GvPin.tsx 레거시 콜아웃(148×66) — 지도 미사용',
].join('\n'), P('Regular'), 12, { type: 'SOLID', color: rgb('#726B65') })
note.x = 40; note.y = 790

section.resizeWithoutConstraints(640, 920)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('지도 핀 역싱크 완료')
