// 팝업·오버레이 7종 코드 → 피그마 이식 (2026-08-07, feature/design-refactor 기준)
// 섹션 "Popups & Overlays TOBE (code sync 2026-08-07)" 생성:
//  1. AddRequestModal (추가 요청 — PC 480 r20 / Mobile 바텀시트)
//  2. FeedbackSurvey (재방문 설문 1단계 — 카드 440 r20)  ※ 2.0 재디자인 대상 ASIS
//  3. LocationPermissionModal (위치 권한 — PC 380 r24)
//  4. RegionDropdown (지역 선택 팝오버 220)
//  5. RegionHintBubble (지역 힌트 말풍선 276)
//  6. 회차 선택 CTA (Mobile 하단 바 / PC BookingCard 320)
//  7. 검색 드롭다운 (PC pill 인풋 + 팝오버 r16)
// 수치 전부 코드 실측. Scripter에서 Run.

/* ── 공통 헬퍼 (detail-screens와 동일) ─────────────────────────── */
const HEX = {
  'neutral/50': '#FAF9F8', 'neutral/100': '#EAE5E1', 'neutral/200': '#EAE5E1',
  'neutral/300': '#C6BFB9', 'neutral/400': '#A7A19A', 'neutral/500': '#8D8781',
  'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/800': '#2B2622',
  'neutral/900': '#0C0A08', 'white': '#FFFFFF',
  'primary/700': '#404E81', 'primary/100': '#ECEFF9', 'primary/900': '#1F2747',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const report = []
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
const FONTS = [
  { family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' },
  { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' },
]
for (const f of FONTS) await figma.loadFontAsync(f)

const compCache = new Map()
function comp(name, variantName) {
  const key = name + '|' + (variantName || '')
  if (compCache.has(key)) return compCache.get(key)
  let found = null
  for (const page of figma.root.children) {
    found = page.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === name)
    if (found) break
  }
  if (found && found.type === 'COMPONENT_SET') {
    const v = variantName ? found.children.find(c => c.name === variantName) : null
    found = v || found.defaultVariant
  }
  compCache.set(key, found)
  if (!found) report.push(`컴포넌트 없음: ${name} → 폴백`)
  return found
}
function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : o.dir === 'V' ? 'VERTICAL' : 'NONE'
  if (o.gap != null) f.itemSpacing = o.gap
  if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
  f.fills = o.fill ? [paint(o.fill)] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.rTop != null) { f.topLeftRadius = o.rTop; f.topRightRadius = o.rTop }
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW || 1 }
  if (o.align) f.counterAxisAlignItems = o.align
  if (o.mainAlign) f.primaryAxisAlignItems = o.mainAlign
  if (o.w != null && o.h != null) f.resize(o.w, o.h)
  else if (o.w != null) f.resize(o.w, f.height)
  else if (o.h != null) f.resize(f.width, o.h)
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else if (f.layoutMode === 'VERTICAL') {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  f.clipsContent = o.clip ?? false
  return f
}
function T(chars, o = {}) {
  const t = figma.createText()
  t.fontName = { family: 'Pretendard', style: o.weight || 'Regular' }
  t.fontSize = o.size || 14
  t.characters = chars
  t.fills = [paint(o.color || 'neutral/900')]
  if (o.lh) t.lineHeight = { value: o.lh, unit: 'PERCENT' }
  return t
}
function inst(name, targetW, targetH, variantName) {
  const c = comp(name, variantName)
  if (!c) { const r = figma.createRectangle(); r.resize(targetW || 24, targetH || 24); r.fills = [paint('neutral/300')]; r.cornerRadius = 4; return r }
  const i = c.createInstance()
  if (targetW && Math.abs(i.width - targetW) > 1) i.rescale(targetW / i.width)
  return i
}
function grabber() {   // 모바일 바텀시트 드래그 핸들
  const row = F('grabber', { dir: 'H', pad: [12, 0, 4, 0], mainAlign: 'CENTER', align: 'CENTER' })
  const bar = figma.createRectangle(); bar.resize(36, 4); bar.cornerRadius = 9999; bar.fills = [paint('neutral/200')]
  row.appendChild(bar)
  return row
}
function primaryBtn(label, o = {}) {
  const b = F('btn-primary', { dir: 'H', gap: 8, pad: [0, 16, 0, 16], fill: 'primary/700', r: 8, align: 'CENTER', mainAlign: 'CENTER', h: o.h || 44 })
  b.appendChild(T(label, { size: o.size || 14, weight: 'SemiBold', color: 'white' }))
  return b
}
function ghostBtn(label, o = {}) {
  const b = F('btn-ghost', { dir: 'H', pad: [0, 16, 0, 16], fill: 'white', r: 8, stroke: 'neutral/200', align: 'CENTER', mainAlign: 'CENTER', h: o.h || 44 })
  b.appendChild(T(label, { size: o.size || 14, weight: 'Medium', color: 'neutral/700' }))
  return b
}

/* ── 1. AddRequestModal ────────────────────────────────────────── */
function addRequestModal(desktop) {
  const w = desktop ? 480 : 402
  const card = F(`AddRequestModal · ${desktop ? 'PC' : 'Mobile'}`, {
    dir: 'V', gap: 0, pad: [0, 0, 24, 0], fill: 'white', w, clip: true,
    ...(desktop ? { r: 20 } : { rTop: 22 }),
  })
  if (!desktop) card.appendChild(grabber())
  const body = F('body', { dir: 'V', gap: 0, pad: [desktop ? 24 : 8, 16, 0, 16], w })
  card.appendChild(body)
  body.appendChild(T('추가 요청하기', { size: 18, weight: 'Bold' }))
  const sub = T('찾으시는 영화·영화관·감독이 아직 없나요? 추가 요청하면 반영해둘게요!', { size: 13, color: 'neutral/500' })
  body.appendChild(sub); sub.layoutSizingHorizontal = 'FILL'

  const kinds = F('kinds', { dir: 'H', gap: 8, pad: [16, 0, 20, 0], w: w - 32 })
  body.appendChild(kinds)
  const kindDefs = [['영화', true], ['영화관', false], ['감독', false], ['기타', false]]
  for (const [label, sel] of kindDefs) {
    const k = F('kind', { dir: 'V', gap: 8, pad: [12, 4, 12, 4], r: 12, align: 'CENTER',
      fill: sel ? 'primary/100' : 'neutral/50', stroke: sel ? 'primary/700' : 'neutral/200', strokeW: sel ? 1.5 : 1 })
    k.appendChild(inst('2.0/icon/film', 20, 20))
    k.appendChild(T(label, { size: 12, weight: 'SemiBold', color: sel ? 'primary/900' : 'neutral/700' }))
    kinds.appendChild(k)
    k.layoutSizingHorizontal = 'FILL'
  }

  body.appendChild(T('영화 이름', { size: 13, weight: 'SemiBold', color: 'neutral/700' }))
  const input = F('input', { dir: 'H', pad: [0, 12, 0, 12], fill: 'white', r: 12, stroke: 'neutral/200', align: 'CENTER', w: w - 32, h: 44 })
  input.appendChild(T('예: 패터슨', { size: 14, color: 'neutral/400' }))
  body.appendChild(input)

  const noteLabel = F('label-row', { dir: 'H', gap: 4, pad: [16, 0, 8, 0] })
  noteLabel.appendChild(T('추가 정보', { size: 13, weight: 'SemiBold', color: 'neutral/700' }))
  noteLabel.appendChild(T('(선택)', { size: 13, color: 'neutral/500' }))
  body.appendChild(noteLabel)
  const ta = F('textarea', { dir: 'V', pad: [12, 12, 12, 12], fill: 'white', r: 12, stroke: 'neutral/200', w: w - 32, h: 84 })
  ta.appendChild(T('감독, 개봉년도, 원제 등 참고할 정보가 있다면 적어주세요', { size: 14, color: 'neutral/400' }))
  body.appendChild(ta)

  const actions = F('actions', { dir: 'H', gap: 12, pad: [16, 0, 0, 0], w: w - 32 })
  body.appendChild(actions)
  const cancel = ghostBtn('닫기'); actions.appendChild(cancel); cancel.layoutSizingHorizontal = 'FILL'
  const submit = primaryBtn('요청 보내기'); actions.appendChild(submit); submit.layoutSizingHorizontal = 'FILL'
  return card
}

/* ── 2. FeedbackSurvey (1단계 ASIS — 2.0 재디자인 대상) ─────────── */
function feedbackSurvey() {
  const w = 440
  const card = F('FeedbackSurvey · step1 (ASIS)', { dir: 'V', gap: 0, pad: [28, 22, 22, 22], fill: 'white', r: 20, w, clip: true })
  card.appendChild(T('1 / 2', { size: 12, weight: 'Bold', color: 'primary/700' }))
  const title = F('t', { dir: 'V', gap: 6, pad: [6, 0, 16, 0] })
  title.appendChild(T('다시 찾아주셨네요 👋', { size: 20, weight: 'Bold' }))
  title.appendChild(T('어떤 점이 좋았나요? (여러 개 선택할 수 있어요)', { size: 14, color: 'neutral/500' }))
  card.appendChild(title)
  const choices = F('choices', { dir: 'V', gap: 8, pad: [0, 0, 16, 0], w: w - 44 })
  card.appendChild(choices)
  const CH = [['지도로 한눈에 보여서 편해요', false], ['여러 극장을 비교하기 좋아요', false], ['상영작 탭 큐레이션·추천이 좋아요', true], ['놓칠 뻔한 상영을 발견했어요', false], ['기타', false]]
  for (const [label, on] of CH) {
    const c = F('choice', { dir: 'H', gap: 8, pad: [15, 16, 15, 16], r: 12, align: 'CENTER',
      fill: on ? 'primary/100' : 'neutral/50', stroke: on ? 'primary/700' : 'neutral/200', w: w - 44 })
    c.appendChild(T(label, { size: 15, weight: on ? 'SemiBold' : 'Regular' }))
    choices.appendChild(c)
  }
  const next = primaryBtn('다음', { h: 48 })
  card.appendChild(next); next.layoutSizingHorizontal = 'FILL'
  return card
}

/* ── 3. LocationPermissionModal (PC) ───────────────────────────── */
function locationModal() {
  const w = 380
  const card = F('LocationPermissionModal · PC', { dir: 'V', gap: 0, pad: [0, 0, 32, 0], fill: 'white', r: 24, w, clip: true })
  const logoRow = F('logo', { dir: 'H', pad: [20, 24, 16, 24], mainAlign: 'CENTER', w })
  logoRow.appendChild(inst('2.0/logo/wordmark', 120, 30))
  card.appendChild(logoRow)
  const div = figma.createRectangle(); div.resize(w, 1); div.fills = [paint('neutral/200')]
  card.appendChild(div)
  const body = F('body', { dir: 'V', gap: 12, pad: [28, 16, 24, 16], align: 'CENTER', w })
  card.appendChild(body)
  const t1 = T('내 주변 영화관부터 보여드릴게요', { size: 20, weight: 'Bold', lh: 135 }); t1.textAlignHorizontal = 'CENTER'
  body.appendChild(t1)
  const t2 = T('가까운 영화관과 오늘의 상영 정보를 바로 보려면\n위치 접근을 허용해주세요.', { size: 14, color: 'neutral/500', lh: 165 }); t2.textAlignHorizontal = 'CENTER'
  body.appendChild(t2)
  const actions = F('actions', { dir: 'V', gap: 8, pad: [16, 16, 0, 16], w })
  card.appendChild(actions)
  const allow = primaryBtn('위치 허용하기', { h: 48 }); actions.appendChild(allow); allow.layoutSizingHorizontal = 'FILL'
  const skip = F('skip', { dir: 'H', pad: [10, 0, 0, 0], mainAlign: 'CENTER' })
  skip.appendChild(T('괜찮아요', { size: 14, weight: 'Medium', color: 'neutral/500' }))
  actions.appendChild(skip); skip.layoutSizingHorizontal = 'FILL'
  return card
}

/* ── 4. RegionDropdown ─────────────────────────────────────────── */
function regionDropdown() {
  const w = 220
  const dd = F('RegionDropdown', { dir: 'V', gap: 0, pad: [4, 0, 4, 0], fill: 'white', r: 16, stroke: 'neutral/200', w, clip: true })
  const sect = (label, top) => {
    const s = F('sect', { dir: 'H', pad: [8, 16, 4, 16], w })
    if (top) { s.strokes = [paint('neutral/200')]; s.strokeWeight = 1; s.strokeAlign = 'INSIDE'; s.strokeBottomWeight = 0; s.strokeLeftWeight = 0; s.strokeRightWeight = 0 }
    s.appendChild(T(label, { size: 10, weight: 'Bold', color: 'neutral/500' }))
    return s
  }
  dd.appendChild(sect('광역시', false))
  for (const [label, on] of [['서울', true], ['부산', false], ['대구', false]]) {
    const row = F('row', { dir: 'H', gap: 8, pad: [10, 16, 10, 16], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w })
    row.appendChild(T(label, { size: 14, weight: on ? 'SemiBold' : 'Regular', color: on ? 'primary/700' : 'neutral/700' }))
    if (on) row.appendChild(inst('2.0/icon/check', 16, 16))
    dd.appendChild(row)
  }
  dd.appendChild(sect('도·특별자치도', true))
  for (const label of ['경기', '강원']) {
    const row = F('row', { dir: 'H', gap: 8, pad: [10, 16, 10, 16], align: 'CENTER', w })
    row.appendChild(T(label, { size: 14, color: 'neutral/700' }))
    dd.appendChild(row)
  }
  return dd
}

/* ── 5. RegionHintBubble ───────────────────────────────────────── */
function hintBubble() {
  const w = 276
  const b = F('RegionHintBubble', { dir: 'H', gap: 12, pad: [12, 12, 12, 16], fill: 'primary/700', r: 12, align: 'MIN', w })
  b.appendChild(inst('2.0/icon/map-pin', 15, 15))
  const t = T('지역을 설정해서 내 주변 영화관의\n상영 정보를 조회하세요', { size: 12, weight: 'Medium', color: 'white', lh: 155 })
  b.appendChild(t); t.layoutSizingHorizontal = 'FILL'
  const x = F('x', { dir: 'H', pad: [0, 0, 0, 0], align: 'CENTER', mainAlign: 'CENTER', w: 18, h: 18, r: 9999 })
  x.fills = [{ ...paint('white'), opacity: 0.2 }]
  x.appendChild(inst('2.0/icon/x', 8, 8))
  b.appendChild(x)
  return b
}

/* ── 6. 회차 선택 CTA ──────────────────────────────────────────── */
function bookingBarMobile() {
  const w = 402
  const bar = F('BookingCTA · Mobile bar', { dir: 'V', gap: 12, pad: [12, 16, 16, 16], fill: 'white', w })
  bar.strokes = [paint('neutral/200')]; bar.strokeWeight = 1; bar.strokeAlign = 'INSIDE'
  bar.strokeBottomWeight = 0; bar.strokeLeftWeight = 0; bar.strokeRightWeight = 0
  const info = F('info', { dir: 'H', gap: 12, pad: [0, 0, 0, 0], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: w - 32 })
  bar.appendChild(info)
  const left = F('l', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  const time = F('t', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], align: 'CENTER' })
  time.appendChild(T('20:10', { size: 16, weight: 'Bold' }))
  time.appendChild(T('→ 21:51', { size: 12, color: 'neutral/500' }))
  left.appendChild(time)
  left.appendChild(T('아트나인 · 어떻게 해야 했을까?', { size: 12, color: 'neutral/600' }))
  info.appendChild(left)
  info.appendChild(inst('2.0/icon/x', 16, 16))
  const cta = primaryBtn('예매하러 가기', { h: 48 })
  bar.appendChild(cta); cta.layoutSizingHorizontal = 'FILL'
  return bar
}
function bookingCardPC() {
  const w = 320
  const card = F('BookingCTA · PC card', { dir: 'V', gap: 12, pad: [16, 16, 16, 16], fill: 'white', r: 16, stroke: 'neutral/200', w, clip: true })
  const head = F('h', { dir: 'H', pad: [0, 0, 0, 0], align: 'CENTER', mainAlign: 'SPACE_BETWEEN', w: w - 32 })
  head.appendChild(T('회차 선택됨', { size: 10, weight: 'Bold', color: 'neutral/500' }))
  head.appendChild(inst('2.0/icon/x', 16, 16))
  card.appendChild(head)
  const tt = F('t', { dir: 'V', gap: 4, pad: [0, 0, 0, 0] })
  tt.appendChild(T('어떻게 해야 했을까?', { size: 14, weight: 'Bold' }))
  tt.appendChild(T('아트나인', { size: 12, weight: 'Bold', color: 'primary/700' }))
  card.appendChild(tt)
  const time = F('time', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], align: 'CENTER' })
  time.appendChild(T('20:10', { size: 24, weight: 'Bold' }))
  time.appendChild(T('→ 21:51 · 82/120석', { size: 12, color: 'neutral/500' }))
  card.appendChild(time)
  const cta = primaryBtn('예매하러 가기', { h: 44 })
  card.appendChild(cta); cta.layoutSizingHorizontal = 'FILL'
  return card
}

/* ── 7. 검색 드롭다운 (PC) ─────────────────────────────────────── */
function searchDropdown() {
  const w = 420
  const wrap = F('SearchDropdown · PC', { dir: 'V', gap: 8, pad: [0, 0, 0, 0], w })
  const input = F('input', { dir: 'H', gap: 12, pad: [0, 12, 0, 16], fill: 'white', r: 12, stroke: 'primary/700', strokeW: 1.5, align: 'CENTER', w, h: 44 })
  input.appendChild(inst('2.0/icon/search', 16, 16))
  const q = T('ㅁㅁ', { size: 14 }); input.appendChild(q); q.layoutSizingHorizontal = 'FILL'
  input.appendChild(inst('2.0/icon/x', 14, 14))
  wrap.appendChild(input)
  const dd = F('popover', { dir: 'V', gap: 0, pad: [6, 0, 6, 0], fill: 'white', r: 16, stroke: 'neutral/200', w, clip: true })
  wrap.appendChild(dd)
  const rows = [['멜랑콜리아', '영화'], ['멜랑콜리아 OST 상영회', '영화제'], ['라스 폰 트리에', '감독']]
  for (const [label, type] of rows) {
    const row = F('row', { dir: 'H', gap: 12, pad: [8, 16, 8, 16], align: 'CENTER', w })
    row.appendChild(inst('2.0/icon/search', 14, 14))
    const l = T(label, { size: 14, color: 'neutral/700' }); row.appendChild(l); l.layoutSizingHorizontal = 'FILL'
    row.appendChild(T(type, { size: 10, color: 'neutral/500' }))
    dd.appendChild(row)
  }
  return wrap
}

/* ── 조립 ──────────────────────────────────────────────────────── */
for (const page of figma.root.children) {
  const prev = page.children.find(n => n.type === 'SECTION' && n.name === 'Popups & Overlays TOBE (code sync 2026-08-07)')
  if (prev) { prev.remove(); report.push('기존 섹션 삭제 후 재생성') }
}
const section = figma.createSection()
section.name = 'Popups & Overlays TOBE (code sync 2026-08-07)'
figma.currentPage.appendChild(section)

const frames = [
  addRequestModal(true), addRequestModal(false),
  feedbackSurvey(), locationModal(),
  regionDropdown(), hintBubble(),
  bookingBarMobile(), bookingCardPC(),
  searchDropdown(),
]
let x = 60
for (const f of frames) {
  section.appendChild(f)
  f.x = x; f.y = 80
  x += f.width + 60
}
section.resizeWithoutConstraints(x + 60, 900)
section.x = figma.viewport.center.x
section.y = figma.viewport.center.y

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  'popups 코드 싱크 (2026-08-07) — 추가요청 모달·설문(ASIS)·위치권한·지역 드롭다운·힌트 말풍선·회차 CTA·검색 팝오버',
  '설문(FeedbackSurvey)은 2.0 재디자인 대상이라 ASIS 참고용. 오버레이 딤(rgba 0,0,0,0.35~0.5)은 생략.',
  ...(report.length ? ['', '경고:', ...report] : []),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 16
figma.viewport.scrollAndZoomIntoView([section])
figma.notify(`popups: 프레임 ${frames.length}장 생성${report.length ? ` · 경고 ${report.length}` : ''}`)
