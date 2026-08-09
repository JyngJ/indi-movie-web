// 데스크톱 영화 상세 패널 역싱크 (2026-08-09) — 코드 실측값
//  소스: src/components/domain/desktopDetailPanel/{PanelShell,MoviePanel}.tsx · MapCtaButton.tsx
//  구성: 도크 440px · embedded(surface-card, r0)
//   헤더 52 (제목 KIMM 14/700 + 닫기 32) → 히어로(포스터 90×135 r0 · h2 20 KIMM · 장르 pill h22 · 메타 13)
//   → 탭 42 (영화 정보 / 상영 영화관·active 밑줄 2) → 상영 영화관 탭:
//   CTA(2.0/Button Secondary md FILL) · 지역 카운트 캡션 12 · 극장 카드(r12: 헤더 12×16 +
//   거리 칩 h24 pill + 영화관 보기 sm · 날짜 그룹: 라벨 10/600 + 시간 셀 r8 raised)
//  버튼·아이콘버튼은 2.0 컴포넌트 인스턴스 우선, 없으면 로컬 드로잉 폴백 (report 경고)
// Scripter에서 Run.

const report = []
const HEX = {
  'primary/700': '#404E81', 'primary/900': '#232C49', 'primary/100': '#ECEFF9',
  'neutral/100': '#FAF9F8', 'neutral/200': '#EAE5E1', 'neutral/500': '#857F76',
  'neutral/600': '#635D55', 'neutral/700': '#4A4540', 'neutral/800': '#2B2622', 'neutral/900': '#1A1714',
  'white': '#FFFFFF',
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
let KIMM = { family: 'KIMM_Bold', style: 'B' }
try { await figma.loadFontAsync(KIMM) } catch {
  const fonts = await figma.listAvailableFontsAsync()
  const c = fonts.find(f => /KIMM/i.test(f.fontName.family))
  KIMM = c ? c.fontName : P('Bold')
  await figma.loadFontAsync(KIMM)
}

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
  f.clipsContent = opts.clip ?? false
  return f
}
const CARD = () => paint(['surface/card', 'white'], '#FFFFFF')
const BORDER = () => paint(['neutral/200', 'border'], HEX['neutral/200'])
const CAPTION = () => paint(['neutral/500', 'text/caption'], HEX['neutral/500'])
const SUB = () => paint(['neutral/600', 'text/sub'], HEX['neutral/600'])
const BODY = () => paint(['neutral/700', 'text/body'], HEX['neutral/700'])
const TPRIMARY = () => paint(['neutral/900', 'text/primary'], HEX['neutral/900'])
const ACCENT = () => paint(['primary/base', 'primary/700'], HEX['primary/700'])
const RAISED = () => paint(['surface/raised', 'neutral/200'], HEX['neutral/200'])

function findVariant(setName, variantName) {
  for (const page of figma.root.children) {
    const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === setName)
    if (set) {
      const v = set.children.find(c => c.name === variantName)
      if (v) return v
    }
  }
  return null
}
/** 2.0/Button 인스턴스 — 없으면 드로잉 폴백 */
function button(parent, label, { size = 'sm', w } = {}) {
  const variant = findVariant('2.0/Button', `Variant=Secondary, Size=${size}, Icon=none, State=default`)
  if (variant) {
    const inst = variant.createInstance()
    parent.appendChild(inst)
    const t = inst.findOne(n => n.type === 'TEXT')
    if (t) { try { t.characters = label } catch { /* 무시 */ } }
    if (w) inst.resize(w, inst.height)
    return inst
  }
  report.push('2.0/Button 미발견 — 드로잉 폴백: ' + label)
  const h = size === 'sm' ? 32 : 44
  const f = frame('Button/' + label, 10, h, { fill: paint(['primary/subtle-l', 'primary/100'], HEX['primary/100']), radius: 8 })
  parent.appendChild(f)
  const t = text(f, label, P('Medium'), 14, paint(['primary/900'], HEX['primary/900']))
  f.resize(w ?? t.width + 32, h)
  t.x = f.width / 2 - t.width / 2; t.y = h / 2 - t.height / 2
  return f
}

/* ══ 패널 ══ */
const W = 440, GUTTER = 24
const panel = frame('DesktopMoviePanel · 상영 영화관 탭', W, 700, { fill: CARD(), clip: true })

/* 헤더 52 */
const hdr = frame('header', W, 52, { fill: CARD() })
panel.appendChild(hdr); hdr.x = 0; hdr.y = 0
text(hdr, '꽁치의 맛', KIMM, 14, TPRIMARY(), { x: 16, y: 18 })
const closeT = text(hdr, '✕', P('Regular'), 14, TPRIMARY())
closeT.x = W - 8 - 32 + 9; closeT.y = 18
const hb = frame('hdrBorder', W, 1, { fill: BORDER() })
panel.appendChild(hb); hb.x = 0; hb.y = 51

/* 히어로 — pad 24 gutter 20 · 포스터 90×135 r0 */
let y = 52
const hero = frame('hero', W, 24 + 135 + 20, { fill: CARD() })
panel.appendChild(hero); hero.x = 0; hero.y = y
const poster = frame('poster', 90, 135, { fill: paint(['neutral/800'], HEX['neutral/800']), clip: true })
hero.appendChild(poster); poster.x = GUTTER; poster.y = 24
const pt = text(poster, '꽁치의 맛', P('Bold'), 12, { type: 'SOLID', color: rgba('#FFFFFF', 0.9) }, { lh: 1.3 })
pt.textAlignHorizontal = 'CENTER'
pt.resize(82, pt.height)
pt.x = 4; pt.y = 67 - pt.height / 2
const hx = GUTTER + 90 + 20
text(hero, '꽁치의 맛', KIMM, 20, TPRIMARY(), { x: hx, y: 28 })
text(hero, '秋刀魚の味', P('Regular'), 12, CAPTION(), { x: hx, y: 56 })
const chip = frame('genreChip', 10, 22, { fill: paint(['primary/subtle-l', 'primary/100'], HEX['primary/100']), radius: 999, stroke: { type: 'SOLID', color: rgba(HEX['primary/700'], 0.4) } })
hero.appendChild(chip)
const ct = text(chip, '드라마', P('Medium'), 10, ACCENT())
chip.resize(ct.width + 16, 22)
ct.x = 8; ct.y = 11 - ct.height / 2
chip.x = hx; chip.y = 80
text(hero, '🇯🇵 일본 · 1962 · 112분', P('Medium'), 13, SUB(), { x: hx, y: 114 })
y += hero.height

/* 탭 42 */
const tabs = frame('tabs', W, 42, { fill: CARD() })
panel.appendChild(tabs); tabs.x = 0; tabs.y = y
const t1 = text(tabs, '영화 정보', P('Regular'), 13, CAPTION())
t1.x = W / 4 - t1.width / 2; t1.y = 14
const t2 = text(tabs, '상영 영화관', P('SemiBold'), 13, ACCENT())
t2.x = W * 3 / 4 - t2.width / 2; t2.y = 14
const tb = frame('tabBorder', W, 1, { fill: BORDER() })
panel.appendChild(tb); tb.x = 0; tb.y = y + 41
const ul = frame('activeUnderline', W / 2, 2, { fill: ACCENT() })
panel.appendChild(ul); ul.x = W / 2; ul.y = y + 40
y += 42

/* 탭 내용 — pad 20 gutter 32 */
y += 20
const cta = button(panel, '지도에서 필터로 보기', { size: 'md', w: W - GUTTER * 2 })
cta.x = GUTTER; cta.y = y
y += cta.height + 8

/* 지역 카운트 캡션 — b는 primary */
const cap = frame('countCaption', W - GUTTER * 2, 18)
panel.appendChild(cap); cap.x = GUTTER; cap.y = y
let cx = 0
for (const seg of [
  ['서울', true], [' 지역 ', false], ['1', true], ['개 영화관 상영중, 전국 ', false], ['1', true], ['개 영화관 상영중', false],
]) {
  const t = text(cap, seg[0], seg[1] ? P('Bold') : P('Regular'), 12, seg[1] ? ACCENT() : CAPTION(), { x: cx, y: 0 })
  cx += t.width
}
y += 18 + 12

/* 극장 카드 — r12 · 보더 */
const card = frame('theaterCard', W - GUTTER * 2, 64 + 1 + 92, { fill: CARD(), stroke: BORDER(), radius: 12, clip: true })
panel.appendChild(card); card.x = GUTTER; card.y = y
// 헤더 12×16
text(card, '아트나인', KIMM, 14, TPRIMARY(), { x: 16, y: 12 })
text(card, '📍 서울 동작구 동작대로 89 골든시네마타워 12층', P('Regular'), 10, SUB(), { x: 16, y: 34 })
const dist = frame('distChip', 54, 24, { fill: RAISED(), stroke: BORDER(), radius: 999 })
card.appendChild(dist)
const dt = text(dist, '9.9 km', P('Medium'), 10, BODY(), { ls: 0 })
dist.resize(Math.max(54, dt.width + 16), 24)
dt.x = 8; dt.y = 12 - dt.height / 2
const viewBtn = button(card, '영화관 보기', { size: 'sm' })
viewBtn.x = card.width - 16 - viewBtn.width
viewBtn.y = 32 - viewBtn.height / 2
dist.x = viewBtn.x - 8 - dist.width; dist.y = 20
// 날짜 그룹
const gb = frame('groupBorder', card.width, 1, { fill: BORDER() })
card.appendChild(gb); gb.x = 0; gb.y = 64
text(card, '8월 9일(일)', P('SemiBold'), 10, CAPTION(), { x: 16, y: 73, ls: 0.3 })
// 시간 셀 — pad 8×12 r8 raised 보더
const cell = frame('showtimeCell', 10, 52, { fill: RAISED(), stroke: BORDER(), radius: 8 })
card.appendChild(cell); cell.x = 16; cell.y = 91
const tm = text(cell, '12:30', P('Bold'), 14, TPRIMARY(), { x: 12, y: 8 })
tm.fontName = P('Bold')
text(cell, '-14:22', P('Regular'), 10, CAPTION(), { x: 12 + tm.width + 4, y: 12 })
const seatA = text(cell, '32', P('SemiBold'), 10, ACCENT(), { x: 12, y: 30 })
text(cell, '/58석', P('Regular'), 10, SUB(), { x: 12 + seatA.width, y: 30 })
cell.resize(Math.max(96, 12 + tm.width + 4 + 40 + 12), 52)

panel.resize(W, card.y + card.height + 32)

/* ══ 배치 ══ */
const page = figma.currentPage
const prev = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('데스크톱 영화 상세 패널'))
const section = figma.createSection()
section.name = '데스크톱 영화 상세 패널 — 역싱크 (2026-08-09)'
page.appendChild(section)
if (prev) { section.x = prev.x; section.y = prev.y; prev.remove() }
else {
  const maxX = Math.max(0, ...page.children.filter(n => n !== section).map(n => n.x + n.width))
  section.x = maxX + 200; section.y = 0
}
section.appendChild(panel)
panel.x = 60; panel.y = 60

const note = text(section, [
  '데스크톱 도크 패널 440px — MoviePanel(상영 영화관 탭) 실측',
  '· PanelShell: embedded=surface-card r0 · 헤더 52(제목 KIMM 14/700 + IconButton ghost 32)',
  '· 히어로: 포스터 90×135 r0(의도) · 제목 KIMM 20(h2) · 원제 12 caption · 장르 pill h22(primary tint + 40% 보더) · 메타 13 sub',
  '· 탭 42: active 13/600 primary + 밑줄 2px / inactive 13/400 caption',
  '· CTA: 2.0/Button Secondary md fullWidth (MapCtaButton — 지도 아이콘 15 포함, 여기선 텍스트만)',
  '· 극장 카드 r12: 극장명 KIMM 14 · 주소 10 sub · 거리 칩 h24 pill raised(minW 54) · 영화관 보기 = Secondary sm',
  '· 시간 셀: r8 raised+보더 · 시간 14/700 tnum + 종료 10 caption · 잔여석 10(숫자 primary/600·매진 error·임박 warning)',
  '· 영화 정보 탭(시놉시스·감독 카드 r12·상세 정보 테이블)은 이번 프레임 밖 — 필요 시 추가',
].join('\n'), P('Regular'), 12, { type: 'SOLID', color: rgb('#726B65') })
note.x = 60 + W + 60; note.y = 60

section.resizeWithoutConstraints(60 + W + 60 + 480, panel.height + 160)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`데스크톱 상세 패널 역싱크 완료${report.length ? ` · 경고 ${report.length}` : ''}`)
if (report.length) console.log(report.join('\n'))
