// FeedbackSurvey 2.0 TOBE 제안 (2026-08-09) — "Design System - work"에 섹션 생성
// 재방문 설문 모달 재디자인: step1(선택) / step2(주관식) / thanks 3프레임.
// 문법: 카드 440·r-popover(16)·pad 24 / 제목 display-h2(KIMM 20) / sub body14 text-sub
//       선택지 = surface-soft r-control(12) h48, 선택 시 primary/100 틴트 + primary/700 1px + 체크
//       푸터 = 온보딩 문법([text 건너뛰기] [primary 제출 flex]) / 단계 도트 2개
// Scripter에서 Run. 코드 이식은 이 제안 확정 후.

const HEX = {
  'neutral/100': '#FAF9F8', 'neutral/150': '#F3F0ED', 'neutral/200': '#EAE5E1', 'neutral/300': '#C6BFB9',
  'neutral/500': '#8D8781', 'neutral/600': '#726B65', 'neutral/700': '#58524B', 'neutral/900': '#0C0A08',
  'white': '#FFFFFF', 'primary/700': '#404E81', 'primary/900': '#1F2747', 'primary/100': '#ECEFF9',
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const allVars = await figma.variables.getLocalVariablesAsync('COLOR')
const varByName = new Map()
for (const v of allVars) if (!varByName.has(v.name)) varByName.set(v.name, v)
function paint(name) {
  const solid = { type: 'SOLID', color: rgb(HEX[name] || '#FF00FF') }
  const v = varByName.get(name)
  return v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid
}
for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)
let kimmOK = true
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch { kimmOK = false }

function F(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL'
  if (o.gap != null) f.itemSpacing = o.gap
  if (o.pad) { const [t, r, b, l] = o.pad; f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l }
  f.fills = o.fill ? [paint(o.fill)] : []
  if (o.r != null) f.cornerRadius = o.r
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeW || 1 }
  if (o.align) f.counterAxisAlignItems = o.align
  if (o.mainAlign) f.primaryAxisAlignItems = o.mainAlign
  if (o.w != null && o.h != null) f.resize(o.w, o.h)
  else if (o.w != null) f.resize(o.w, f.height)
  else if (o.h != null) f.resize(f.width, o.h)
  if (f.layoutMode === 'HORIZONTAL') {
    f.primaryAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
  } else {
    f.primaryAxisSizingMode = o.h != null ? 'FIXED' : 'AUTO'
    f.counterAxisSizingMode = o.w != null ? 'FIXED' : 'AUTO'
  }
  f.clipsContent = false
  return f
}
function T(chars, o = {}) {
  const t = figma.createText()
  if (o.kimm && kimmOK) t.fontName = { family: 'KIMM_Bold', style: 'B' }
  else t.fontName = { family: 'Pretendard', style: o.weight || 'Regular' }
  t.fontSize = o.size || 14
  t.characters = chars
  t.fills = [paint(o.color || 'neutral/900')]
  if (o.ls) t.letterSpacing = { unit: 'PERCENT', value: o.ls }
  if (o.lh) t.lineHeight = { unit: 'PERCENT', value: o.lh }
  return t
}

const CARD_W = 440, PAD = 24, INNER = CARD_W - PAD * 2

function dots(activeIdx) {
  // 온보딩 .dots 문법 그대로 — gap 1, 도트당 20×28 히트 래퍼, 도트 7 / 활성 20 pill
  const row = F('dots', { dir: 'H', gap: 1, pad: [0, 0, 0, 0], align: 'CENTER' })
  for (let i = 0; i < 2; i++) {
    const wrap = F('dotBtn', { dir: 'H', pad: [0, 3, 0, 3], align: 'CENTER', mainAlign: 'CENTER', h: 28 })
    const d = figma.createRectangle()
    d.resize(i === activeIdx ? 20 : 7, 7)
    d.cornerRadius = 999
    d.fills = [paint(i === activeIdx ? 'primary/700' : 'neutral/200')]
    wrap.appendChild(d)
    row.appendChild(wrap)
  }
  return row
}

// 닫기 × — 코드의 IconButton ghost 32 대응, 카드 우상단 absolute
function closeBtn(card) {
  const b = F('close ×', { dir: 'H', align: 'CENTER', mainAlign: 'CENTER', w: 32, h: 32, r: 8 })
  for (const rot of [45, -45]) {
    const l = figma.createRectangle()
    l.resize(14, 1.75)
    l.cornerRadius = 1
    l.fills = [paint('neutral/500')]
    b.appendChild(l)
    l.layoutPositioning = 'ABSOLUTE'
    l.x = (32 - 14) / 2; l.y = (32 - 1.75) / 2
    l.rotation = rot
  }
  card.appendChild(b)
  b.layoutPositioning = 'ABSOLUTE'
  b.x = CARD_W - 14 - 32
  b.y = 14
}

function cardBase(name) {
  const c = F(name, { dir: 'V', gap: 0, pad: [PAD, PAD, PAD, PAD], fill: 'white', r: 16, w: CARD_W })
  c.clipsContent = true
  return c
}

function head(card, titleText, subText, stepIdx) {
  if (stepIdx != null) card.appendChild(dots(stepIdx))
  const title = T(titleText, { kimm: true, weight: 'Bold', size: 20, lh: 130, ls: kimmOK ? 5 : 0 })
  card.appendChild(title)
  title.layoutSizingHorizontal = 'FILL'
  const sp1 = F('sp', { dir: 'V', h: 8 }); card.appendChild(sp1)
  const sub = T(subText, { size: 14, weight: 'Medium', color: 'neutral/600', lh: 150 })
  card.appendChild(sub)
  sub.layoutSizingHorizontal = 'FILL'
  const sp2 = F('sp', { dir: 'V', h: 20 }); card.appendChild(sp2)
  if (stepIdx != null) {
    // 도트 아래 간격
    card.insertChild(1, F('sp', { dir: 'V', h: 12 }))
  }
}

function choice(label, on) {
  const row = F(`choice${on ? ' · on' : ''}`, { dir: 'H', gap: 10, pad: [0, 16, 0, 16], align: 'CENTER', w: INNER, h: 48, fill: on ? 'primary/100' : 'neutral/150', r: 12 })
  if (on) { row.strokes = [paint('primary/700')]; row.strokeWeight = 1 }
  // 체크 원
  const c = figma.createEllipse()
  c.resize(18, 18)
  c.fills = on ? [paint('primary/700')] : []
  if (!on) { c.strokes = [paint('neutral/300')]; c.strokeWeight = 1.5 }
  row.appendChild(c)
  const t = T(label, { size: 14, weight: on ? 'SemiBold' : 'Medium', color: on ? 'primary/900' : 'neutral/700' })
  row.appendChild(t)
  return row
}

function btn(label, kind, w) {
  const b = F(`btn · ${kind}`, { dir: 'H', gap: 8, pad: [0, 24, 0, 24], align: 'CENTER', mainAlign: 'CENTER', h: 44 })
  if (kind === 'primary') b.fills = [paint('primary/700')]
  else if (kind === 'secondary') b.fills = [paint('neutral/150')]
  else b.fills = []
  b.cornerRadius = 8
  if (w) { b.resize(w, 44); b.primaryAxisSizingMode = 'FIXED' }
  b.appendChild(T(label, { size: 14, weight: 'Medium', color: kind === 'primary' ? 'white' : kind === 'secondary' ? 'primary/900' : 'neutral/600' }))
  return b
}

/* ── step 0: 분기 ── */
function step0() {
  const card = cardBase('FeedbackSurvey TOBE · step0')
  head(card, '다시 찾아주셨네요 👋', '영화볼지도, 잘 쓰고 계세요?', 0)
  const col = F('ctas', { dir: 'V', gap: 8, pad: [0, 0, 0, 0], w: INNER })
  col.appendChild(btn('👍  네, 좋아요', 'primary', INNER))
  col.appendChild(btn('👎  아쉬운 점이 있어요', 'secondary', INNER))
  card.appendChild(col)
  return card
}

/* ── step 1a: 좋았던 점 ── */
function step1() {
  const card = cardBase('FeedbackSurvey TOBE · step1 good')
  head(card, '어떤 점이 좋았나요?', '여러 개 선택할 수 있어요', 1)
  const list = F('choices', { dir: 'V', gap: 8, pad: [0, 0, 0, 0], w: INNER })
  ;[['지도로 한눈에 보여서 편해요', true], ['여러 극장을 비교하기 좋아요', false], ['상영작 탭 큐레이션·추천이 좋아요', true], ['놓칠 뻔한 상영을 발견했어요', false], ['기타', false]].forEach(([l, on]) => list.appendChild(choice(l, on)))
  card.appendChild(list)
  card.appendChild(F('sp', { dir: 'V', h: 20 }))
  const next = btn('제출', 'primary', INNER)
  card.appendChild(next)
  return card
}

/* ── step 1b: 아쉬운 점 ── */
function step1bad() {
  const card = cardBase('FeedbackSurvey TOBE · step1 bad')
  head(card, '어떤 점이 아쉬웠나요?', '여러 개 선택할 수 있어요', 1)
  const list = F('choices', { dir: 'V', gap: 8, pad: [0, 0, 0, 0], w: INNER })
  ;[['원하는 지역에 극장 정보가 부족해요', true], ['상영 정보가 부정확하거나 늦어요', false], ['지도가 무겁거나 느려요', false], ['필터·검색이 헷갈려요', true], ['찾는 영화가 없어요', false], ['기타', false]].forEach(([l, on]) => list.appendChild(choice(l, on)))
  card.appendChild(list)
  card.appendChild(F('sp', { dir: 'V', h: 20 }))
  card.appendChild(btn('제출', 'primary', INNER))
  return card
}

/* ── step 2: 주관식 ── */
function step2() {
  const card = cardBase('FeedbackSurvey TOBE · step2')
  head(card, '조금 더 들려주세요', '자유롭게 적어주세요. (선택 — 비워두셔도 됩니다)', 2)
  const ta = F('textarea', { dir: 'V', gap: 0, pad: [12, 16, 12, 16], w: INNER, h: 112, fill: 'neutral/150', r: 12 })
  ta.appendChild(T('예: 특정 지역 극장이 더 있으면 좋겠어요 / 필터가 헷갈려요 …', { size: 14, color: 'neutral/500', lh: 150 }))
  card.appendChild(ta)
  card.appendChild(F('sp', { dir: 'V', h: 20 }))
  const row = F('actions', { dir: 'H', gap: 8, pad: [0, 0, 0, 0], w: INNER, align: 'CENTER' })
  const skip = btn('건너뛰기', 'text')
  row.appendChild(skip)
  const submit = btn('제출', 'primary')
  row.appendChild(submit)
  submit.layoutSizingHorizontal = 'FILL'
  card.appendChild(row)
  return card
}

/* ── thanks ── */
function thanks() {
  const card = cardBase('FeedbackSurvey TOBE · thanks')
  card.counterAxisAlignItems = 'CENTER'
  card.appendChild(F('sp', { dir: 'V', h: 8 }))
  card.appendChild(T('🎬', { size: 40 }))
  card.appendChild(F('sp', { dir: 'V', h: 12 }))
  card.appendChild(T('고맙습니다!', { kimm: true, weight: 'Bold', size: 20, ls: kimmOK ? 5 : 0 }))
  card.appendChild(F('sp', { dir: 'V', h: 8 }))
  card.appendChild(T('남겨주신 의견은 다음 개선에 바로 반영할게요.', { size: 14, weight: 'Medium', color: 'neutral/600' }))
  card.appendChild(F('sp', { dir: 'V', h: 20 }))
  card.appendChild(btn('닫기', 'secondary', INNER))
  return card
}

/* ── 조립 ── */
const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const SECTION_NAME = 'FeedbackSurvey TOBE (2026-08-09)'
const prev = page.children.find(n => n.type === 'SECTION' && n.name === SECTION_NAME)
if (prev) prev.remove()
const section = figma.createSection()
section.name = SECTION_NAME
page.appendChild(section)

const cards = [step0(), step1(), step1bad(), thanks()]
for (const c of cards) closeBtn(c)
let x = 60
for (const c of cards) { section.appendChild(c); c.x = x; c.y = 100; x += CARD_W + 40 }

const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = [
  'FeedbackSurvey 2.0 TOBE 제안 v2 (2026-08-09) — ASIS는 Popups 섹션 참고',
  '· 플로우: step0 잘 쓰고 계세요?(좋아요 primary/아쉬워요 secondary) → 1a 좋은 점 | 1b 아쉬운 점(신설 6종) → thanks. 주관식 제거(2026-08-09), 도트 2단계',
  '· 카드 440 · r-popover(16) · pad 24 · 딤 rgba(20,15,10,0.42) (온보딩 스크림과 동일, 프레임엔 미표현)',
  '· 제목 display-h2(KIMM 20) — 구 17 Pretendard에서 승격. 단계 표시 = 온보딩 도트 문법(2개)',
  '· 선택지: h48 · surface-soft(150) r-control(12) · 선택 시 primary/100 + primary/700 1px + 체크 원',
  '· 푸터: step1 = primary 풀폭 다음 / step2 = [건너뛰기 text] [제출 primary flex] (온보딩 푸터 문법)',
  '· 닫기 × = 전 단계 우상단 고정 (IconButton ghost 32, top/right 14)',
  '· 도트 = 온보딩 dots 문법 동일 (7px·활성 20 pill·히트 20×28·gap 1)',
  ...(kimmOK ? [] : ['⚠ KIMM_Bold 폰트 미로드 — 제목이 Pretendard로 렌더됨']),
].join('\n')
note.fills = [{ type: 'SOLID', color: rgb('#726B65') }]
section.appendChild(note)
note.x = 60; note.y = 20
section.resizeWithoutConstraints(x + 60, 700)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('FeedbackSurvey TOBE 3프레임 생성')
