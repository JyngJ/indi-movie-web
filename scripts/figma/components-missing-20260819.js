// 피그마에 없는 컴포넌트 12종 생성 (Scripter용) — 2026-08-19
//
// 코드에는 있는데 피그마 컴포넌트 세트가 없어 문서의 "피그마 세트 미연결" 항목으로 잡히던 것들:
//   Badge · BottomSheet · BubbleTail · Card · CardContainer · Input
//   MovieCardSkeleton · ScrollNavButton · SearchBar · Skeleton · TheaterCardSkeleton · Toast
//
// 값은 src/styles/tokens.css 실측을 그대로 쓴다. 배리언트는 코드 props와 같은 축으로 만든다.
// idempotent — 같은 이름의 기존 세트를 지우고 다시 만든다.

const PAGE = 'Design System fixed'
const SECTION = '10 · 신규 컴포넌트'

/* ── 토큰 (tokens.css 실측) ────────────────────────────────── */
const C = {
  bg: '#FAF9F8', card: '#FFFFFF', raised: '#EAE5E1', border: '#EAE5E1',
  ink: '#0C0A08', body: '#58524B', sub: '#726B65', caption: '#8D8781', placeholder: '#A7A19A',
  inverse: '#FFFFFF',
  primary: '#404E81', primary100: '#ECEFF9', primary900: '#1F2747',
  success: '#4A7C59', successTint: '#E4F1E8', successDeep: '#2B5036',
  warning: '#B9800E', warningTint: '#FDF1D8', warningDeep: '#885907',
  error: '#9B3331', errorTint: '#F5E1E0',
  neutral800: '#2B2622', neutral300: '#C6BFB9',
}
const R = { badge: 4, poster: 2, button: 8, control: 12, popover: 16, sheet: 20, pill: 9999 }

const P = s => ({ family: 'Pretendard', style: s })
const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const fill = h => [{ type: 'SOLID', color: hex(h) }]

for (const st of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(st))

/* ── 헬퍼 ─────────────────────────────────────────────────── */
function frame(name, opts = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = opts.dir || 'HORIZONTAL'
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.itemSpacing = opts.gap ?? 0
  f.paddingTop = opts.pt ?? opts.py ?? 0
  f.paddingBottom = opts.pb ?? opts.py ?? 0
  f.paddingLeft = opts.pl ?? opts.px ?? 0
  f.paddingRight = opts.pr ?? opts.px ?? 0
  f.primaryAxisAlignItems = opts.main || 'CENTER'
  f.counterAxisAlignItems = opts.cross || 'CENTER'
  f.cornerRadius = opts.radius ?? 0
  f.fills = opts.bg ? fill(opts.bg) : []
  if (opts.border) {
    f.strokes = fill(opts.border)
    f.strokeWeight = 1
  }
  if (opts.w) { f.resize(opts.w, f.height || 1); f.counterAxisSizingMode = opts.dir === 'VERTICAL' ? 'FIXED' : f.counterAxisSizingMode; f.primaryAxisSizingMode = opts.dir === 'VERTICAL' ? f.primaryAxisSizingMode : 'FIXED' }
  return f
}

function text(chars, { size = 14, weight = 'Medium', color = C.ink, lh } = {}) {
  const t = figma.createText()
  t.fontName = P(weight)
  t.characters = chars
  t.fontSize = size
  t.fills = fill(color)
  if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }
  return t
}

function box(w, h, { bg = C.raised, radius = R.badge } = {}) {
  const r = figma.createRectangle()
  r.resize(w, h)
  r.fills = fill(bg)
  r.cornerRadius = radius
  return r
}

/** 프레임 배열 → 컴포넌트 세트. 이름이 하나뿐이면 단일 컴포넌트로 둔다. */
function toSet(name, nodes) {
  const comps = nodes.map(n => figma.createComponentFromNode(n))
  if (comps.length === 1) {
    comps[0].name = name
    return comps[0]
  }
  const set = figma.combineAsVariants(comps, figma.currentPage)
  set.name = name
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 24
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.counterAxisAlignItems = 'CENTER'
  return set
}

/* ── 컴포넌트 정의 ────────────────────────────────────────── */
const DEFS = [
  ['2.0/Badge', () => {
    const tones = [['default', C.raised, C.body], ['success', C.successTint, C.successDeep],
                   ['warning', C.warningTint, C.warningDeep], ['error', C.errorTint, C.error]]
    return tones.map(([v, bg, fg]) => {
      const f = frame(`Variant=${v}`, { px: 8, py: 4, radius: R.badge, bg })
      f.appendChild(text(v === 'default' ? '기본' : v === 'success' ? '상영중' : v === 'warning' ? '잔여 4석' : '매진',
        { size: 10, weight: 'Bold', color: fg, lh: 100 }))
      return f
    })
  }],

  ['2.0/Card', () => {
    const pads = [['sm', 12], ['md', 16], ['lg', 24]]
    return pads.map(([v, pad]) => {
      const f = frame(`Padding=${v}`, { dir: 'VERTICAL', gap: 4, px: pad, py: pad, radius: R.control, bg: C.card, border: C.border, cross: 'MIN' })
      f.appendChild(text('씨네큐브 광화문', { size: 16, weight: 'Bold', color: C.ink }))
      f.appendChild(text('오늘 6회 상영 · 서울 종로구', { size: 12, weight: 'Regular', color: C.caption }))
      return f
    })
  }],

  ['2.0/CardContainer', () => {
    const outer = frame('CardContainer', { dir: 'VERTICAL', gap: 0, radius: R.control, bg: C.card, border: C.border, cross: 'MIN', w: 320 })
    const head = frame('header', { dir: 'VERTICAL', gap: 4, px: 16, py: 12, cross: 'MIN' })
    head.appendChild(text('이번 주 GV', { size: 20, weight: 'Bold', color: C.ink }))
    head.appendChild(text('감독과의 대화가 열리는 상영', { size: 12, weight: 'Regular', color: C.caption }))
    const list = frame('list', { dir: 'VERTICAL', gap: 16, px: 16, py: 12, cross: 'MIN' })
    for (let i = 0; i < 2; i++) {
      const row = frame(`row-${i}`, { gap: 8, cross: 'CENTER' })
      row.appendChild(box(54, 81, { bg: C.neutral300, radius: R.poster }))
      const meta = frame('meta', { dir: 'VERTICAL', gap: 4, cross: 'MIN' })
      meta.appendChild(text(i === 0 ? '기억의 빛' : '중경삼림', { size: 14, weight: 'Bold', color: C.body }))
      meta.appendChild(text(i === 0 ? '봉준호' : '왕가위', { size: 12, weight: 'Regular', color: C.caption }))
      row.appendChild(meta)
      list.appendChild(row)
    }
    outer.appendChild(head)
    outer.appendChild(list)
    return [outer]
  }],

  ['2.0/Input', () => {
    const states = [['default', C.border, C.placeholder, null], ['filled', C.border, C.ink, null],
                    ['error', C.error, C.ink, '이메일 형식이 아닙니다'], ['disabled', C.border, C.placeholder, null]]
    return states.map(([v, bd, fg, err]) => {
      const wrap = frame(`State=${v}`, { dir: 'VERTICAL', gap: 4, cross: 'MIN' })
      wrap.appendChild(text('영화 제목', { size: 14, weight: 'Medium', color: C.ink }))
      const field = frame('field', { px: 12, py: 12, radius: R.button, bg: v === 'disabled' ? C.raised : C.card, border: bd, w: 260, main: 'MIN' })
      field.appendChild(text(v === 'default' ? '제목을 입력하세요' : '기억의 빛', { size: 16, weight: 'Regular', color: fg }))
      wrap.appendChild(field)
      if (err) wrap.appendChild(text(err, { size: 12, weight: 'Regular', color: C.error }))
      return wrap
    })
  }],

  ['2.0/SearchBar', () => {
    const states = [['default', '영화, 영화관, 감독을 검색하세요', C.placeholder], ['filled', '봉준호', C.ink]]
    return states.map(([v, label, fg]) => {
      const f = frame(`State=${v}`, { gap: 8, px: 18, radius: R.control, bg: C.card, border: C.border, w: 320, main: 'MIN' })
      f.resize(320, 44)
      f.counterAxisSizingMode = 'FIXED'
      f.appendChild(box(16, 16, { bg: C.caption, radius: 8 }))
      f.appendChild(text(label, { size: 16, weight: 'Regular', color: fg }))
      return f
    })
  }],

  ['2.0/Toast', () => {
    const f = frame('Toast', { px: 16, py: 10, radius: R.pill, bg: C.neutral800 })
    f.appendChild(text('관심 영화에 담았어요', { size: 12, weight: 'Medium', color: C.inverse }))
    return [f]
  }],

  ['2.0/BottomSheet', () => {
    const f = frame('BottomSheet', { dir: 'VERTICAL', gap: 12, px: 24, pt: 8, pb: 20, bg: C.raised, w: 360, cross: 'CENTER' })
    f.topLeftRadius = f.topRightRadius = R.sheet
    f.appendChild(box(36, 4, { bg: C.border, radius: 2 }))
    const body = frame('body', { dir: 'VERTICAL', gap: 4, cross: 'MIN' })
    body.appendChild(text('씨네큐브 광화문', { size: 20, weight: 'Bold', color: C.ink }))
    body.appendChild(text('오늘 6회 상영', { size: 12, weight: 'Regular', color: C.caption }))
    f.appendChild(body)
    return [f]
  }],

  ['2.0/BubbleTail', () => {
    // 꼬리는 11×11 정사각 rotate45 — 붙는 면과 같은 색을 받는다
    return ['up', 'left', 'right'].map(dir => {
      const wrap = frame(`Dir=${dir}`, { dir: 'VERTICAL', gap: 0, cross: 'CENTER' })
      const bubble = frame('bubble', { px: 16, py: 12, radius: R.popover, bg: C.primary })
      bubble.appendChild(text('서울 상영작', { size: 12, weight: 'Medium', color: C.inverse }))
      const tail = figma.createRectangle()
      tail.resize(11, 11)
      tail.fills = fill(C.primary)
      tail.rotation = 45
      wrap.appendChild(bubble)
      wrap.appendChild(tail)
      return wrap
    })
  }],

  ['2.0/ScrollNavButton', () => ['left', 'right'].map(dir => {
    const f = frame(`Direction=${dir}`, { radius: R.pill, bg: C.bg, border: C.border })
    f.resize(32, 32)
    f.primaryAxisSizingMode = f.counterAxisSizingMode = 'FIXED'
    f.appendChild(text(dir === 'left' ? '‹' : '›', { size: 16, weight: 'Bold', color: C.ink }))
    return f
  })],

  ['2.0/Skeleton', () => {
    const f = frame('Skeleton', { dir: 'VERTICAL', gap: 8, cross: 'MIN' })
    f.appendChild(box(160, 16, { radius: R.poster }))
    f.appendChild(box(96, 16, { radius: R.poster }))
    f.appendChild(box(44, 44, { radius: R.pill }))
    return [f]
  }],

  ['2.0/MovieCardSkeleton', () => {
    const f = frame('MovieCardSkeleton', { dir: 'VERTICAL', gap: 8, cross: 'MIN' })
    f.appendChild(box(108, 162, { radius: R.poster }))
    f.appendChild(box(81, 18, { radius: R.poster }))
    f.appendChild(box(54, 14, { radius: R.poster }))
    return [f]
  }],

  ['2.0/TheaterCardSkeleton', () => {
    const f = frame('TheaterCardSkeleton', { dir: 'VERTICAL', gap: 12, px: 16, py: 16, radius: R.control, bg: C.card, border: C.border, cross: 'MIN', w: 320 })
    f.appendChild(box(176, 16, { radius: R.poster }))
    f.appendChild(box(112, 12, { radius: R.poster }))
    const chips = frame('chips', { gap: 8 })
    for (let i = 0; i < 3; i++) chips.appendChild(box(68, 32, { radius: R.badge }))
    f.appendChild(chips)
    return [f]
  }],
]

/* ── 실행 ─────────────────────────────────────────────────── */
let page
try {
  page = figma.root.children.find(p => p.name === PAGE)
  if (!page) throw new Error(`페이지 "${PAGE}" 없음`)
  await page.loadAsync()
  figma.currentPage = page
  console.log('완료: 페이지 선택 —', PAGE)
} catch (e) {
  console.log('실패: 페이지 —', e.message)
  throw e
}

// 재실행 대비 — 같은 이름의 기존 세트를 먼저 지운다
try {
  const names = DEFS.map(d => d[0])
  const stack = [...page.children]
  let removed = 0
  while (stack.length) {
    const n = stack.pop()
    if ((n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && names.includes(n.name)) { n.remove(); removed++; continue }
    if ('children' in n) stack.push(...n.children)
  }
  console.log(`완료: 기존 세트 정리 ${removed}개`)
} catch (e) {
  console.log('실패: 기존 세트 정리 —', e.message)
}

// 섹션 준비 — 섹션 자식의 좌표는 페이지 절대 좌표라, 안에 루트 오토레이아웃 하나만 둔다
let root
try {
  const old = page.children.find(n => n.type === 'SECTION' && n.name === SECTION)
  if (old) old.remove()
  const section = figma.createSection()
  section.name = SECTION
  const last = page.children.filter(n => n.type === 'SECTION' && n !== section)
  const y = last.length ? Math.max(...last.map(s => s.y + s.height)) + 200 : 0
  section.x = 0
  section.y = y
  page.appendChild(section)

  root = frame('items', { dir: 'VERTICAL', gap: 64, px: 64, py: 64, bg: C.bg, cross: 'MIN' })
  section.appendChild(root)
  root.x = 0
  root.y = 0
  console.log('완료: 섹션 생성 —', SECTION)
} catch (e) {
  console.log('실패: 섹션 —', e.message)
  throw e
}

const made = []
for (const [name, build] of DEFS) {
  try {
    const wrap = frame(name, { dir: 'VERTICAL', gap: 16, cross: 'MIN' })
    wrap.appendChild(text(name, { size: 14, weight: 'Bold', color: C.ink }))
    root.appendChild(wrap)

    const nodes = build()
    nodes.forEach(n => wrap.appendChild(n))
    const node = toSet(name, nodes)
    wrap.appendChild(node)
    made.push(name)
    console.log('완료:', name)
  } catch (e) {
    console.log('실패:', name, '—', e.message)
  }
}

try {
  const section = page.children.find(n => n.type === 'SECTION' && n.name === SECTION)
  if (section) section.resizeWithoutConstraints(root.width + 128, root.height + 128)
} catch (e) {
  console.log('실패: 섹션 크기 —', e.message)
}

figma.notify(`컴포넌트 ${made.length}종 생성 — ${SECTION}`)
console.log(`\n요약: ${made.length}/${DEFS.length} 생성`)
