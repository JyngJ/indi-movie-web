// AS-IS 버튼 표본 — 영화볼지도 2026-07-27 (commit 1669ce9, 디자인 시스템 감사 직전)
// Figma Scripter 플러그인에서 실행. 현재 페이지에 프레임 하나를 생성한다.
//
// 출처: 해당 커밋의 실제 코드 값 그대로.
//   - src/components/primitives/Button.tsx        (md: h-11 px-4, --radius-md=6px, --text-base 미정의)
//   - src/components/domain/onboarding/onboarding.module.css  (.cta .nextBtn .ctaGhost .ctaSub)
//   - src/components/domain/survey/survey.module.css          (.primaryBtn .ghostBtn)
//   - src/components/map/SettingsPanel.tsx        (제출 버튼 h48 r12 15/700, 카테고리 pill 7x14 r999 13/500)
//   - src/components/primitives/Chip.tsx          (--comp-chip-*: h26 px14 r9999 13/500)
//   - src/components/domain/filterBar/FilterChip.tsx (h36 pl14 pr14 r999 13/500)
//   - src/styles/tokens.css (#4A6380 primary, #F8F6F2 page, #F0EDE6 raised, #DDD9CF border, #857F76 caption)

const PAPER = hex('#F8F6F2')
const INK = hex('#1A1714')
const BODY = hex('#4A4540')
const CAPTION = hex('#857F76')
const BORDER = hex('#DDD9CF')
const RAISED = hex('#F0EDE6')
const CARD = hex('#FFFFFF')
const PRIMARY = hex('#4A6380')
const ALERT = hex('#B94A48')

// ── 폰트: 있으면 쓰고 없으면 대체 ─────────────────────────────
async function pickFont(candidates) {
  for (const f of candidates) {
    try { await figma.loadFontAsync(f); return f } catch (_) {}
  }
  const fallback = { family: 'Inter', style: 'Regular' }
  await figma.loadFontAsync(fallback)
  return fallback
}
const F = {
  body400: await pickFont([{ family: 'Pretendard', style: 'Regular' }, { family: 'Inter', style: 'Regular' }]),
  body500: await pickFont([{ family: 'Pretendard', style: 'Medium' }, { family: 'Inter', style: 'Medium' }]),
  body600: await pickFont([{ family: 'Pretendard', style: 'SemiBold' }, { family: 'Inter', style: 'Semi Bold' }]),
  body700: await pickFont([{ family: 'Pretendard', style: 'Bold' }, { family: 'Inter', style: 'Bold' }]),
  display: await pickFont([{ family: 'KIMM', style: 'Bold' }, { family: 'Pretendard', style: 'Bold' }, { family: 'Inter', style: 'Bold' }]),
  mono: await pickFont([{ family: 'JetBrains Mono', style: 'Regular' }, { family: 'Roboto Mono', style: 'Regular' }, { family: 'Inter', style: 'Regular' }]),
}
const weightFont = (w, display) => display ? F.display : (w >= 700 ? F.body700 : w >= 600 ? F.body600 : w >= 500 ? F.body500 : F.body400)

// ── 표본 정의 ──────────────────────────────────────────────
// h: 고정 높이(없으면 hug) / px,py: 패딩 / r: radius / fs: fontSize / fw: weight / display: KIMM 여부
// bg/fg/border: 색 / shadow: 그림자 / src: 출처 / note: 캡션 강조(틀린 점)
const ROWS = [
  {
    title: '주요 CTA — 같은 역할, 규격 5가지',
    sub: 'radius 6 · 12 · 13 · 14  /  font 15 · 15.5 · 16.5 · (미정의)  /  높이 44 · 48 · 52 · 56',
    label: '시작하기',
    items: [
      { src: 'primitives/Button.tsx · md', h: 44, px: 16, r: 6, fs: 14, fw: 500, bg: PRIMARY, fg: CARD,
        note: 'fontSize var(--text-base) → 토큰 미정의, 상속값으로 렌더. 제품 화면에선 미사용(/admin 전용)' , alert: true },
      { src: 'onboarding.module.css · .cta', h: 56, px: 24, r: 14, fs: 16.5, fw: 700, display: true, bg: PRIMARY, fg: CARD, shadow: true,
        note: 'KIMM 16.5px · radius 14 · 그림자 28%' },
      { src: 'onboarding.module.css · .nextBtn', h: 52, px: 22, r: 13, fs: 15.5, fw: 700, display: true, bg: PRIMARY, fg: CARD, shadow: true,
        note: 'KIMM 15.5px · radius 13 · 그림자 26%' },
      { src: 'survey.module.css · .primaryBtn', px: 22, py: 12, r: 12, fs: 15, fw: 600, bg: PRIMARY, fg: CARD,
        note: 'Pretendard 15px/600 · radius 12' },
      { src: 'map/SettingsPanel.tsx · 제출', h: 48, px: 16, r: 12, fs: 15, fw: 700, display: true, bg: PRIMARY, fg: CARD,
        note: 'KIMM 15px · radius 12 · 높이 48' },
    ],
  },
  {
    title: '보조 버튼 — 같은 역할, 규격 3가지',
    sub: 'font 13.5 · 14 · 15  /  weight 400 · 600  /  높이 44 · 52 · hug',
    label: '나중에 할게요',
    items: [
      { src: 'onboarding.module.css · .ctaGhost', h: 52, px: 12, r: 0, fs: 14, fw: 600, bg: null, fg: CAPTION,
        note: '14px/600 · 높이 52' },
      { src: 'onboarding.module.css · .ctaSub', h: 44, px: 12, r: 0, fs: 13.5, fw: 600, bg: null, fg: CAPTION,
        note: '13.5px/600 · 높이 44' },
      { src: 'survey.module.css · .ghostBtn', px: 18, py: 12, r: 12, fs: 15, fw: 400, bg: null, fg: CAPTION,
        note: '15px/400 · radius 12' },
    ],
  },
  {
    title: '필 칩 — 같은 역할, 규격 3가지',
    sub: '높이 26 · 36 · hug  /  배경 raised · card · page  /  radius 9999 · 999 · 999',
    label: '서울',
    items: [
      { src: 'primitives/Chip.tsx', h: 26, px: 14, r: 9999, fs: 13, fw: 500, bg: RAISED, fg: BODY, border: BORDER,
        note: '높이 26 · 배경 raised · 제품 화면에서 사용처 0', alert: true },
      { src: 'filterBar/FilterChip.tsx', h: 36, px: 14, r: 999, fs: 13, fw: 500, bg: CARD, fg: BODY, border: BORDER,
        note: '높이 36 · 배경 card' },
      { src: 'map/SettingsPanel.tsx · 카테고리', px: 14, py: 7, r: 999, fs: 13, fw: 500, bg: PAPER, fg: BODY, border: BORDER,
        note: 'padding 7×14 · 배경 page' },
    ],
  },
]

// ── 빌더 ──────────────────────────────────────────────────
function hex(h) {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
function text(chars, font, size, color, opts = {}) {
  const t = figma.createText()
  t.fontName = font
  t.characters = chars
  t.fontSize = size
  t.fills = [{ type: 'SOLID', color }]
  if (opts.lineHeight) t.lineHeight = { value: opts.lineHeight, unit: 'PERCENT' }
  if (opts.width) { t.textAutoResize = 'HEIGHT'; t.resize(opts.width, t.height) }
  else t.textAutoResize = 'WIDTH_AND_HEIGHT'
  return t
}
function col(name, gap, padding = 0) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = 'VERTICAL'
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.itemSpacing = gap
  f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = padding
  f.fills = []
  return f
}
function row(name, gap) {
  const f = col(name, gap)
  f.layoutMode = 'HORIZONTAL'
  f.counterAxisAlignItems = 'MIN'
  return f
}
function button(label, s) {
  const b = figma.createFrame()
  b.name = label
  b.layoutMode = 'HORIZONTAL'
  b.primaryAxisAlignItems = 'CENTER'
  b.counterAxisAlignItems = 'CENTER'
  b.primaryAxisSizingMode = 'AUTO'
  b.paddingLeft = b.paddingRight = s.px ?? 0
  b.cornerRadius = s.r ?? 0
  b.fills = s.bg ? [{ type: 'SOLID', color: s.bg }] : []
  if (s.border) { b.strokes = [{ type: 'SOLID', color: s.border }]; b.strokeWeight = 1; b.strokeAlign = 'INSIDE' }
  if (s.shadow) b.effects = [{ type: 'DROP_SHADOW', color: { r: 0.29, g: 0.39, b: 0.5, a: 0.27 }, offset: { x: 0, y: 6 }, radius: 16, spread: 0, visible: true, blendMode: 'NORMAL' }]
  const t = text(label, weightFont(s.fw, s.display), s.fs, s.fg, { lineHeight: 120 })
  b.appendChild(t)
  if (s.h) { b.counterAxisSizingMode = 'FIXED'; b.resize(b.width, s.h) }
  else { b.counterAxisSizingMode = 'AUTO'; b.paddingTop = b.paddingBottom = s.py ?? 0 }
  return b
}
function spec(s) {
  const parts = []
  parts.push(s.h ? `h ${s.h}` : `py ${s.py}`)
  parts.push(`px ${s.px}`)
  parts.push(`r ${s.r}`)
  parts.push(`${s.display ? 'KIMM' : 'Pret'} ${s.fs}/${s.fw}`)
  return parts.join('  ·  ')
}
function cell(label, s) {
  const c = col(s.src, 10)
  c.counterAxisAlignItems = 'MIN'
  // 버튼은 기준선 맞추기 위해 고정 높이 슬롯 안에 하단 정렬
  const slot = figma.createFrame()
  slot.name = 'slot'
  slot.layoutMode = 'VERTICAL'
  slot.primaryAxisAlignItems = 'MAX'
  slot.primaryAxisSizingMode = 'FIXED'
  slot.counterAxisSizingMode = 'AUTO'
  slot.fills = []
  slot.appendChild(button(label, s))
  slot.resize(slot.width, 64)
  c.appendChild(slot)
  c.appendChild(text(s.src, F.mono, 11, CAPTION))
  c.appendChild(text(spec(s), F.mono, 11, INK))
  if (s.note) c.appendChild(text(s.note, F.body500, 11, s.alert ? ALERT : BODY, { width: 190 }))
  return c
}

// ── 조립 ──────────────────────────────────────────────────
const root = col('AS-IS 버튼 표본 · 2026-07-27', 40, 56)
root.fills = [{ type: 'SOLID', color: PAPER }]
root.counterAxisSizingMode = 'FIXED'
root.resize(1440, 100)

const head = col('head', 8)
head.appendChild(text('design.md 한 장으로 만든 화면들 — 같은 역할, 다른 규격', F.body700, 24, INK))
head.appendChild(text('2026-07-27 · commit 1669ce9 · 디자인 시스템 감사(#233) 직전 코드 값 그대로', F.mono, 12, CAPTION))
root.appendChild(head)

for (const r of ROWS) {
  const section = col(r.title, 16)
  const th = col('title', 4)
  th.appendChild(text(r.title, F.body600, 15, INK))
  th.appendChild(text(r.sub, F.mono, 11, CAPTION))
  section.appendChild(th)
  const line = row('items', 32)
  for (const s of r.items) line.appendChild(cell(r.label, s))
  section.appendChild(line)
  root.appendChild(section)
}

const foot = col('foot', 4)
foot.appendChild(text('그 외 같은 커밋 기준: borderRadius 리터럴 19종 · fontSize 리터럴 27종(7.5 / 8.5 / 9.5 / 10.5 / 12.5 …) · gap 리터럴 16종', F.mono, 11, CAPTION))
foot.appendChild(text('primitives/Button 은 --text-sm / --text-base / --text-md 를 참조했지만 셋 다 tokens.css 에 없었다 — 유일한 공식 버튼의 글자 크기가 상속값으로 렌더되고 있었다', F.body500, 11, ALERT, { width: 1300 }))
root.appendChild(foot)

root.primaryAxisSizingMode = 'AUTO'
root.x = figma.viewport.center.x - 720
root.y = figma.viewport.center.y - 400
figma.currentPage.appendChild(root)
figma.currentPage.selection = [root]
figma.viewport.scrollAndZoomIntoView([root])
console.log('done: AS-IS 버튼 표본 생성')
