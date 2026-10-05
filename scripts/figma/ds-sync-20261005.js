// 코드↔피그마 차이 해소 (Scripter용) — 2026-10-05
//
// 10/5 덤프 대조 결과. 단계마다 독립 try/catch — 하나가 죽어도 나머지는 반영된다.
//   1) 변수 추가     — 스크림 7 · black · 브랜드 5 · spacing/5 (코드에만 있던 토큰)
//   2) 이펙트 추가   — 2.0/shadow/panel-left
//   3) IconButton   — 이름이 밀린 배리언트 6개 복구 + 채움 변수 재바인딩
//   4) PosterChip   — Attached 축 추가(코너 태그), scrim 채움을 surface/scrim-strong에 바인딩
//   5) 신규 세트     — 2.0/FavoriteToggle · 2.0/ShowtimeCellSkeleton (섹션 12)
//
// 하지 않는 것
//   - PosterChip Tone=primary·neutral 삭제: 코드에 아직 남아 있다. 코드에서 먼저 지운 뒤 정리.
//   - spacing/10: 코드에서 "신규 사용 금지·수렴 예정" 토큰이라 피그마에 들이지 않는다.
//   - PanelScrollBody · Tabs scrollable: 모양이 아니라 스크롤 동작이라 그릴 것이 없다.
//
// 값 출처: src/styles/tokens.css · src/components/primitives/*.tsx
// 재실행 안전: 변수·스타일은 있으면 값만 갱신, 배리언트는 있으면 건너뜀, 섹션 12는 지우고 다시 만든다.

const PAGE = 'Design System fixed'
const SECTION = '12 · 코드 동기 (2026-10-05)'
const COL_COLOR = '영화볼지도 색상 - 2.0'
const COL_SEM = '영화볼지도 시멘틱 - 2.0'
const COL_SPACE = '영화볼지도 스페이싱 - 2.0'

const log = []
const ok = m => { log.push('완료: ' + m); console.log('완료:', m) }
const fail = (m, e) => { log.push('실패: ' + m + ' — ' + (e && e.message)); console.log('실패:', m, '—', e && e.message) }

const P = s => ({ family: 'Pretendard', style: s })
const rgb = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const rgba = (h, a = 1) => ({ ...rgb(h), a })
const solid = (h, a) => ({ type: 'SOLID', color: rgb(h), opacity: a == null ? 1 : a })

/** "Variant=ghost, State=on" → {Variant:'ghost', State:'on'} */
function parseProps(name) {
  const out = {}
  for (const part of (name || '').split(',')) {
    const [k, v] = part.split('=').map(s => (s || '').trim())
    if (k && v !== undefined) out[k] = v
  }
  return out
}
const propsToName = p => Object.entries(p).map(([k, v]) => `${k}=${v}`).join(', ')

function findSet(page, name) {
  const stack = [...page.children]
  while (stack.length) {
    const n = stack.pop()
    if ((n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === name) return n
    if ('children' in n) stack.push(...n.children)
  }
  return null
}

/* ══ 0. 준비 ════════════════════════════════════════════════ */
for (const st of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(st))
const page = figma.root.children.find(p => p.name === PAGE)
if (!page) throw new Error(`페이지 "${PAGE}" 없음`)
await page.loadAsync()
figma.currentPage = page

const collections = await figma.variables.getLocalVariableCollectionsAsync()
const allVars = await figma.variables.getLocalVariablesAsync()
const colByName = n => collections.find(c => c.name === n)
const varIn = (col, name) => allVars.find(v => v.variableCollectionId === col.id && v.name === name)
/** 2.0 컬렉션에서만 찾는다 — 1.0 컬렉션은 지웠지만 이름 충돌 사고가 있었다(_pin-common.md §1). */
function v2(name) {
  for (const cn of [COL_SEM, COL_COLOR, COL_SPACE]) {
    const c = colByName(cn)
    const v = c && varIn(c, name)
    if (v) return v
  }
  return null
}
/** 채움을 변수에 묶는다. 변수 알파와 별개로 paint opacity는 1로 둔다. */
function boundFill(varName) {
  const v = v2(varName)
  if (!v) throw new Error(`변수 ${varName} 없음`)
  return figma.variables.setBoundVariableForPaint(solid('#000000'), 'color', v)
}

/* ══ 1. 변수 ════════════════════════════════════════════════ */
const NEW_VARS = [
  // [컬렉션, 이름, 값(hex), 알파, 코드 토큰, scopes]
  [COL_COLOR, 'black', '#000000', 1, '--color-black', ['FRAME_FILL', 'SHAPE_FILL']],
  [COL_COLOR, 'brand/kakao', '#FEE500', 1, '--color-brand-kakao', ['FRAME_FILL', 'SHAPE_FILL']],
  [COL_COLOR, 'brand/kakao-hover', '#F2DA00', 1, '--color-brand-kakao-hover', ['FRAME_FILL', 'SHAPE_FILL']],
  [COL_COLOR, 'brand/kakao-text', '#000000', 0.85, '--color-brand-kakao-text', ['TEXT_FILL', 'SHAPE_FILL']],
  [COL_COLOR, 'brand/linkedin', '#0A66C2', 1, '--color-brand-linkedin', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL']],
  [COL_COLOR, 'brand/github', '#24292E', 1, '--color-brand-github', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL']],
  // 사진·포스터 위 — 먹색(15,12,9) 스크림 3단 + 그 위 흰 글자·면 4단
  [COL_SEM, 'surface/scrim-soft', '#0F0C09', 0.45, '--color-scrim-soft', ['FRAME_FILL', 'SHAPE_FILL']],
  [COL_SEM, 'surface/scrim-strong', '#0F0C09', 0.72, '--color-scrim-strong', ['FRAME_FILL', 'SHAPE_FILL']],
  [COL_SEM, 'surface/scrim-lightbox', '#0F0C09', 0.92, '--color-scrim-lightbox', ['FRAME_FILL', 'SHAPE_FILL']],
  [COL_SEM, 'text/on-scrim', '#FFFFFF', 0.9, '--color-on-scrim', ['TEXT_FILL', 'SHAPE_FILL']],
  [COL_SEM, 'text/on-scrim-sub', '#FFFFFF', 0.6, '--color-on-scrim-sub', ['TEXT_FILL', 'SHAPE_FILL']],
  [COL_SEM, 'text/on-scrim-faint', '#FFFFFF', 0.15, '--color-on-scrim-faint', ['TEXT_FILL', 'SHAPE_FILL']],
  [COL_SEM, 'surface/on-scrim-surface', '#FFFFFF', 0.12, '--color-on-scrim-surface', ['FRAME_FILL', 'SHAPE_FILL']],
]

for (const [colName, name, hex, a, css, scopes] of NEW_VARS) {
  try {
    const col = colByName(colName)
    if (!col) throw new Error(`컬렉션 ${colName} 없음`)
    let v = varIn(col, name)
    const created = !v
    if (!v) { v = figma.variables.createVariable(name, col, 'COLOR'); allVars.push(v) }
    v.setValueForMode(col.modes[0].modeId, rgba(hex, a))
    v.scopes = scopes
    v.setVariableCodeSyntax('WEB', `var(${css})`)
    ok(`변수 ${name} ${created ? '생성' : '값 갱신'}`)
  } catch (e) { fail(`변수 ${name}`, e) }
}

try {
  const col = colByName(COL_SPACE)
  let v = varIn(col, 'spacing/5')
  const created = !v
  if (!v) { v = figma.variables.createVariable('spacing/5', col, 'FLOAT'); allVars.push(v) }
  v.setValueForMode(col.modes[0].modeId, 20)
  v.scopes = ['WIDTH_HEIGHT', 'GAP']
  v.setVariableCodeSyntax('WEB', 'var(--spacing-5)')
  ok(`변수 spacing/5 ${created ? '생성' : '값 갱신'}`)
} catch (e) { fail('변수 spacing/5', e) }

/* ══ 2. 이펙트 스타일 ══════════════════════════════════════ */
// --shadow-panel-left: -1px 0 2px rgba(20,15,10,0.10), -2px 0 8px rgba(20,15,10,0.04)
try {
  const styles = await figma.getLocalEffectStylesAsync()
  let s = styles.find(x => x.name === '2.0/shadow/panel-left')
  const created = !s
  if (!s) { s = figma.createEffectStyle(); s.name = '2.0/shadow/panel-left' }
  const base = '#140F0A'   // shadow/base
  s.effects = [
    { type: 'DROP_SHADOW', color: rgba(base, 0.10), offset: { x: -1, y: 0 }, radius: 2, spread: 0, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: rgba(base, 0.04), offset: { x: -2, y: 0 }, radius: 8, spread: 0, visible: true, blendMode: 'NORMAL' },
  ]
  s.description = '레일 위에 떠 있는 본문 카드의 왼쪽 경계 — var(--shadow-panel-left)'
  ok(`이펙트 2.0/shadow/panel-left ${created ? '생성' : '값 갱신'}`)
} catch (e) { fail('이펙트 panel-left', e) }

/* ══ 3. IconButton ══════════════════════════════════════════ */
// 밀린 이름: "Variant=2.0, Size=IconButton, State=overlay, Shape=32, 속성 5=default, 속성 6=square"
// 원래 뜻:   "Variant=overlay, Size=32, State=default, Shape=square"
try {
  const set = findSet(page, '2.0/IconButton')
  if (!set || set.type !== 'COMPONENT_SET') throw new Error('세트를 찾지 못했다')
  let fixed = 0
  for (const c of set.children) {
    const p = parseProps(c.name)
    if (p.Variant !== '2.0') continue
    c.name = propsToName({ Variant: p.State, Size: p.Shape, State: p['속성 5'], Shape: p['속성 6'] })
    fixed++
  }
  ok(`IconButton 배리언트 이름 ${fixed}개 복구`)

  // 채움 재바인딩 — ghost hover가 지워진 1.0 변수(#DDD9CF)에 묶여 있었고, overlay는 값만 박혀 있었다.
  // 코드: ghost hover=surface/raised · pressed=neutral/300 / overlay 6→10→14% = surface/overlay*
  const FILL = {
    ghost: { default: null, hover: 'surface/raised', pressed: 'neutral/300' },
    overlay: { default: 'surface/overlay', hover: 'surface/overlay-hover', pressed: 'surface/overlay-pressed' },
  }
  let bound = 0
  for (const c of set.children) {
    const p = parseProps(c.name)
    const varName = FILL[p.Variant] && FILL[p.Variant][p.State]
    if (varName === undefined) continue
    c.fills = varName ? [boundFill(varName)] : []
    bound++
  }
  const axes = Object.keys(set.componentPropertyDefinitions)
  ok(`IconButton 채움 ${bound}개 바인딩 · 축 ${axes.join(' / ')}`)
} catch (e) { fail('IconButton', e) }

/* ══ 4. PosterChip — Attached 축 ════════════════════════════ */
// 코너 태그: offset 0 · 바깥 모서리 radius/poster(2) · 안쪽 대각 모서리만 radius/badge(4) · 그림자 없음.
// 좌상단 한 자리만 쓴다 → TL=2, TR=0, BR=4, BL=0
const ATTACHED = [
  ['scrim', '30주년'],          // 개봉 주년 · D-2 이상 막바지 — 기본
  ['error', '오늘이 마지막'],    // 막바지 오늘
  ['warning', 'D-1 종영'],      // 막바지 D-1
]
try {
  const set = findSet(page, '2.0/PosterChip')
  if (!set || set.type !== 'COMPONENT_SET') throw new Error('세트를 찾지 못했다')

  // scrim 톤 채움을 변수로 — 값(#0F0C09 @0.72)은 그대로
  for (const c of set.children) {
    if (parseProps(c.name).Tone === 'scrim') c.fills = [boundFill('surface/scrim-strong')]
  }

  const hasAxis = set.children.some(c => parseProps(c.name).Attached)
  if (!hasAxis) {
    for (const c of set.children) c.name = propsToName({ ...parseProps(c.name), Attached: 'false' })
  }
  let added = 0
  for (const [tone, label] of ATTACHED) {
    const want = propsToName({ Tone: tone, Size: 'default', Attached: 'true' })
    if (set.children.some(c => c.name === want)) continue
    const base = set.children.find(c => {
      const p = parseProps(c.name)
      return p.Tone === tone && p.Size === 'default' && p.Attached === 'false'
    })
    if (!base) throw new Error(`Tone=${tone} 기본 배리언트 없음`)
    const clone = base.clone()
    set.appendChild(clone)
    clone.name = want
    clone.effects = []
    clone.topLeftRadius = 2
    clone.topRightRadius = 0
    clone.bottomRightRadius = 4
    clone.bottomLeftRadius = 0
    const t = clone.findOne(n => n.type === 'TEXT')
    if (t) { await figma.loadFontAsync(t.fontName); t.characters = label }
    added++
  }
  ok(`PosterChip Attached 축 ${hasAxis ? '이미 있음' : '추가'} · 코너 태그 배리언트 ${added}개`)
} catch (e) { fail('PosterChip', e) }

/* ══ 5. 신규 세트 — 섹션 12 ════════════════════════════════ */
function frame(name, o = {}) {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = o.dir || 'HORIZONTAL'
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.itemSpacing = o.gap ?? 0
  f.paddingTop = f.paddingBottom = o.py ?? 0
  f.paddingLeft = f.paddingRight = o.px ?? 0
  f.primaryAxisAlignItems = o.main || 'CENTER'
  f.counterAxisAlignItems = o.cross || 'CENTER'
  f.cornerRadius = o.radius ?? 0
  f.fills = o.fills || []
  return f
}
async function text(chars, { size = 14, weight = 'Medium', varName = 'text/primary', style } = {}) {
  const t = figma.createText()
  t.fontName = P(weight)
  t.characters = chars
  t.fontSize = size
  t.fills = [boundFill(varName)]
  if (style) await t.setTextStyleIdAsync(style.id)
  return t
}
function toSet(name, nodes, parent) {
  const comps = nodes.map(n => figma.createComponentFromNode(n))
  if (comps.length === 1) { comps[0].name = name; parent.appendChild(comps[0]); return comps[0] }
  const set = figma.combineAsVariants(comps, parent)
  set.name = name
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 24
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.counterAxisAlignItems = 'CENTER'
  return set
}

let root
try {
  for (const n of ['2.0/FavoriteToggle', '2.0/ShowtimeCellSkeleton']) {
    const old = findSet(page, n)
    if (old) old.remove()
  }
  const oldSec = page.children.find(n => n.type === 'SECTION' && n.name === SECTION)
  if (oldSec) oldSec.remove()
  const section = figma.createSection()
  section.name = SECTION
  page.appendChild(section)
  const others = page.children.filter(n => n.type === 'SECTION' && n !== section)
  section.x = 0
  section.y = others.length ? Math.max(...others.map(s => s.y + s.height)) + 200 : 0
  root = frame('items', { dir: 'VERTICAL', gap: 64, px: 64, py: 64, cross: 'MIN', fills: [boundFill('surface/bg')] })
  section.appendChild(root)
  root.x = 0
  root.y = 0
  ok('섹션 12 준비')
} catch (e) { fail('섹션 12', e) }

const textStyles = await figma.getLocalTextStylesAsync()
const tsBody = textStyles.find(s => s.name === '2.0/body')
const tsStrong = textStyles.find(s => s.name === '2.0/body-strong')

/* FavoriteToggle — 상세 화면 관심 토글. Button tertiary md(44 · 좌우 32 · gap 8 · radius/button) 위에
   하트 16 + 문구. 두 상태 중 긴 문구로 폭을 고정한다(코드의 reserve 스팬).
   on 면 = error-tint, on hover = error-mid 18% 섞기(#EBC7C5, 코드 color-mix), 하트 on = error-mid */
try {
  if (!root) throw new Error('섹션 없음')
  const fav = findSet(page, '2.0/FavoriteButton')
  const heartSrc = fav && fav.children.find(c => c.name.includes('State=on'))
  const heartFrame = heartSrc && heartSrc.findOne(n => n.name === 'icon')
  if (!heartFrame) throw new Error('FavoriteButton 하트를 찾지 못했다')

  const STATES = [
    ['off', 'surface/raised', 'text/primary', '관심 등록'],
    ['off-hover', 'neutral/300', 'text/primary', '관심 등록'],
    ['on', 'status/error-tint', 'status/error-mid', '관심 영화'],
    ['on-hover', null, 'status/error-mid', '관심 영화'],
  ]
  const nodes = []
  for (const [state, bg, heartVar, label] of STATES) {
    const f = frame(`State=${state}`, {
      gap: 8, px: 32, radius: 8,
      fills: bg ? [boundFill(bg)] : [solid('#EBC7C5')],
    })
    f.primaryAxisSizingMode = 'AUTO'
    f.counterAxisSizingMode = 'FIXED'
    f.resize(f.width, 44)
    const h = heartFrame.clone()
    h.fills = []
    h.rescale(16 / 22)
    for (const v of h.findAll(n => n.type === 'VECTOR')) {
      v.fills = [boundFill(heartVar)]
      v.strokes = []
    }
    f.appendChild(h)
    f.appendChild(await text(label, { size: 14, weight: 'Medium', style: tsBody }))
    nodes.push(f)
  }
  const wrap = frame('2.0/FavoriteToggle', { dir: 'VERTICAL', gap: 16, cross: 'MIN' })
  wrap.appendChild(await text('2.0/FavoriteToggle', { size: 14, weight: 'Bold', style: tsStrong }))
  wrap.appendChild(await text('상세 화면 관심 토글 — 두 상태 중 긴 문구로 폭을 고정한다. 문구는 관심 영화 · 관심 극장 · 관심 감독', { size: 12, weight: 'Regular', varName: 'text/sub' }))
  root.appendChild(wrap)
  nodes.forEach(n => wrap.appendChild(n))
  const w = Math.max(...nodes.map(n => n.width))
  for (const n of nodes) { n.primaryAxisSizingMode = 'FIXED'; n.resize(w, 44) }
  toSet('2.0/FavoriteToggle', nodes, wrap)
  ok(`2.0/FavoriteToggle 생성 (폭 ${Math.round(w)})`)
} catch (e) { fail('FavoriteToggle', e) }

/* ShowtimeCellSkeleton — 회차 셀 자리표시. 104 × 102 · radius 16(--comp-showtime-radius) · neutral/200
   높이 102는 실제 셀 실측(#354). 피그마 2.0/ShowtimeCell은 95라 7px 차이가 남아 있다. */
try {
  if (!root) throw new Error('섹션 없음')
  const f = figma.createFrame()
  f.name = '2.0/ShowtimeCellSkeleton'
  f.resize(104, 102)
  f.cornerRadius = 16
  f.fills = [boundFill('neutral/200')]
  const wrap = frame('2.0/ShowtimeCellSkeleton', { dir: 'VERTICAL', gap: 16, cross: 'MIN' })
  wrap.appendChild(await text('2.0/ShowtimeCellSkeleton', { size: 14, weight: 'Bold', style: tsStrong }))
  wrap.appendChild(await text('회차 셀 자리표시 — 104 × 102 · r16 · neutral/200. 실제 셀 높이 실측값', { size: 12, weight: 'Regular', varName: 'text/sub' }))
  root.appendChild(wrap)
  wrap.appendChild(f)
  toSet('2.0/ShowtimeCellSkeleton', [f], wrap)
  ok('2.0/ShowtimeCellSkeleton 생성')
} catch (e) { fail('ShowtimeCellSkeleton', e) }

/* 변경 메모 — 섹션 안에 남긴다 */
try {
  if (!root) throw new Error('섹션 없음')
  const note = frame('메모', { dir: 'VERTICAL', gap: 8, cross: 'MIN' })
  note.appendChild(await text('2026-10-05 코드 동기', { size: 14, weight: 'Bold', style: tsStrong }))
  for (const line of [
    '변수 — surface/scrim-soft·strong·lightbox · text/on-scrim·sub·faint · surface/on-scrim-surface · black · brand/kakao·hover·text · brand/linkedin · brand/github · spacing/5',
    '이펙트 — 2.0/shadow/panel-left',
    'IconButton — 이름이 밀린 overlay·square 32/52 배리언트 6개 복구, ghost hover를 surface/raised로 재바인딩',
    'PosterChip — Attached 축(코너 태그 · 좌상단 전용), scrim 채움을 surface/scrim-strong에 바인딩',
    '남은 것 — PosterChip Tone=primary·neutral은 코드에서 지운 뒤 정리',
  ]) note.appendChild(await text(line, { size: 12, weight: 'Regular', varName: 'text/body' }))
  root.appendChild(note)
  const section = page.children.find(n => n.type === 'SECTION' && n.name === SECTION)
  section.resizeWithoutConstraints(root.width + 128, root.height + 128)
} catch (e) { fail('메모·섹션 크기', e) }

figma.notify(`코드 동기 2026-10-05 — 실패 ${log.filter(l => l.startsWith('실패')).length}건`)
console.log('\n요약:')
for (const l of log) console.log(' ·', l)
console.log('\n다음: dump-state-8766.js 다시 실행 → npm run ds:build → /design-system/drift 확인')
