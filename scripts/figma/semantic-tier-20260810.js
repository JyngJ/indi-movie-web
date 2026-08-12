// 토큰 2계층(시멘틱) 신설 + 레거시 컬렉션 정리 (2026-08-10)
//
//  지금까지 피그마엔 원시값 계층(영화볼지도 색상 - 2.0)만 있고 역할 계층이 없었다.
//  역할 이름(surface/card, text/caption, primary/base …)은 1.0 시절 Primitives·Semantic
//  컬렉션에만 남아 있어서, 이름으로 찾으면 구 색이 잡히는 사고가 반복됐다
//  (지도 핀 칩이 구 블루 #4A6380으로 나간 건이 그 예).
//
//  구조 — 디자인 토큰 3계층
//   1 Primitive : 영화볼지도 색상 - 2.0        순수한 값. 의미 없음        neutral/900
//   2 Semantic  : 영화볼지도 시멘틱 - 2.0 (신설) 역할에 이름              text/primary → neutral/900
//   3 Component : 코드 --comp-*                컴포넌트 전용             --comp-date-cell-pt
//
//  하는 일
//   1. 시멘틱 컬렉션 생성 — 코드 tokens.css의 역할 토큰과 이름을 1:1로 맞춘다
//   2. 레거시 변수에 물려 있는 fill/stroke를 같은 이름의 시멘틱 변수로 재바인딩
//   3. 레거시 컬렉션(Primitives · Semantic) 삭제
//   4. "00 · 읽는 법" 섹션에 3계층 설명 프레임 추가
// Scripter에서 Run.

const done = [], failed = []
async function step(label, fn) {
  try { const r = await fn(); done.push(label + (r ? ` — ${r}` : '')) }
  catch (e) { failed.push(`${label}: ${String((e && e.message) || e)}`) }
}
const rgb = (hex) => { const c = parseInt(hex.slice(1), 16); return { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }
const rgba = (hex, a) => ({ ...rgb(hex), a })

for (const page of figma.root.children) await page.loadAsync()

/* ── 컬렉션 정리 ──────────────────────────────────────────── */
const collections = await figma.variables.getLocalVariableCollectionsAsync()
const primitiveCol = collections.find(c => c.name.includes('색상') && c.name.includes('2.0'))
if (!primitiveCol) { figma.notify('2.0 색상 컬렉션을 못 찾음'); throw new Error('no primitive collection') }

const primitives = new Map()   // name -> Variable
for (const id of primitiveCol.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  if (v) primitives.set(v.name, v)
}

/* ── 1. 시멘틱 컬렉션 ─────────────────────────────────────── */
const SEM_NAME = '영화볼지도 시멘틱 - 2.0'
let semCol = collections.find(c => c.name === SEM_NAME)
let semMode = null

/** [시멘틱 이름, 원시 이름 | {hex, a}, 설명] — 코드 tokens.css와 1:1 */
const SEMANTIC = [
  ['surface/bg', 'neutral/100', '페이지 바탕 — 미색 종이'],
  ['surface/card', 'white', '카드·시트·시간표 셀 — 새 종이 한 장'],
  ['surface/raised', 'neutral/200', '눌린 면·비활성 칩'],
  ['surface/border', 'neutral/200', '보더·구분선'],
  ['surface/overlay', { hex: '#000000', a: 0.06 }, '표면 위 옅은 오버레이 (닫기 버튼·배지)'],
  ['surface/overlay-hover', { hex: '#000000', a: 0.10 }, 'IconButton overlay hover'],
  ['surface/overlay-pressed', { hex: '#000000', a: 0.14 }, 'IconButton overlay pressed'],
  ['surface/scrim', { hex: '#000000', a: 0.55 }, '모달 뒤 배경 딤'],

  ['text/primary', 'neutral/900', '제목·본문 강조'],
  ['text/body', 'neutral/700', '긴 본문'],
  ['text/sub', 'neutral/600', '보조 설명'],
  ['text/caption', 'neutral/500', '캡션·메타'],
  ['text/placeholder', 'neutral/400', '입력 placeholder·비활성'],
  ['text/inverse', 'white', '어두운 면 위 텍스트'],
  ['text/on-accent', 'white', '액센트 면 위 텍스트 — 테마와 무관하게 흰색 고정'],

  ['primary/base', 'primary/700', '버튼·CTA·활성'],
  ['primary/hover', 'primary/800', 'hover·pressed'],
  ['primary/subtle', 'primary/100', '활성 칩 틴트 배경'],
  ['primary/on-subtle', 'primary/900', '틴트 위 텍스트'],

  ['status/warning', 'warning/700', '잔여석 적음'],
  ['status/warning-tint', 'warning/100', ''],
  ['status/warning-deep', 'warning/900', ''],
  ['status/success', 'success/700', '상영중'],
  ['status/success-tint', 'success/100', ''],
  ['status/success-deep', 'success/900', ''],
  ['status/error', 'error/900', '매진 — 텍스트·칩 겸직'],
  ['status/error-tint', 'error/100', ''],
  ['status/error-mid', 'error/700', '아이콘·보더·일요일'],
  ['status/error-hover', { hex: '#872C2A' }, 'Button danger hover — 원시값 없음'],
  ['status/error-pressed', { hex: '#722523' }, 'Button danger pressed — 원시값 없음'],
  ['status/gv', 'gv/900', 'GV 핀·배지'],
  ['status/gv-tint', 'gv/100', ''],

  ['brand/cgv', { hex: '#E30613' }, '멀티플렉스 핀 전용 — 원시값 없음'],
  ['brand/mega', { hex: '#6C1E9F' }, ''],
  ['brand/lotte', { hex: '#ED1C24' }, ''],
]

await step('시멘틱 컬렉션', async () => {
  if (!semCol) {
    semCol = figma.variables.createVariableCollection(SEM_NAME)
    semCol.renameMode(semCol.modes[0].modeId, 'Light')
  }
  semMode = semCol.modes[0].modeId
  const existing = new Map()
  for (const id of semCol.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v) existing.set(v.name, v)
  }
  let made = 0
  for (const [name, src, desc] of SEMANTIC) {
    let v = existing.get(name)
    if (!v) { v = figma.variables.createVariable(name, semCol, 'COLOR'); made++ }
    v.description = desc || ''
    v.scopes = ['ALL_SCOPES']
    if (typeof src === 'string') {
      const prim = primitives.get(src)
      if (!prim) { failed.push(`원시값 없음: ${src} (${name})`); continue }
      v.setValueForMode(semMode, { type: 'VARIABLE_ALIAS', id: prim.id })
    } else {
      v.setValueForMode(semMode, src.a != null ? rgba(src.hex, src.a) : { ...rgb(src.hex), a: 1 })
    }
    existing.set(name, v)
  }
  return `${SEMANTIC.length}개 중 ${made}개 신설`
})

/* ── 2. 레거시 바인딩 → 시멘틱 재바인딩 ──────────────────── */
const legacyCols = collections.filter(c => c !== primitiveCol && c !== semCol && !c.name.includes('2.0'))
const legacyVarName = new Map()   // legacy variable id -> name
for (const col of legacyCols) {
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v) legacyVarName.set(v.id, v.name)
  }
}
/** 레거시 이름 → 시멘틱 이름 (이름이 같으면 그대로) */
const RENAME = {
  'surface/border': 'surface/border',
  'border': 'surface/border',
  'text/on-accent': 'text/on-accent',
  'on-accent': 'text/on-accent',
  'semantic/error': 'status/error',
  'semantic/gv': 'status/gv',
  'primary/on-subtle': 'primary/on-subtle',
  'multiplex/cgv': 'brand/cgv',
  'multiplex/mega': 'brand/mega',
  'multiplex/lotte': 'brand/lotte',
  'accent/error': 'status/error',
  'accent/gv': 'status/gv',
}

await step('레거시 바인딩 재연결', async () => {
  const semByName = new Map()
  for (const id of semCol.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v) semByName.set(v.name, v)
  }
  let rebound = 0, missed = new Set()
  for (const page of figma.root.children) {
    for (const n of page.findAll(x => 'fills' in x || 'strokes' in x)) {
      for (const field of ['fills', 'strokes']) {
        const paints = n[field]
        if (!paints || paints === figma.mixed || !paints.length) continue
        let changed = false
        const next = paints.map(p => {
          const bound = p.boundVariables && p.boundVariables.color
          if (!bound) return p
          const legacyName = legacyVarName.get(bound.id)
          if (!legacyName) return p                      // 레거시가 아니면 그대로
          const target = semByName.get(RENAME[legacyName] ?? legacyName) ?? semByName.get(legacyName)
          if (!target) { missed.add(legacyName); return p }
          changed = true
          rebound++
          return figma.variables.setBoundVariableForPaint(p, 'color', target)
        })
        if (changed) n[field] = next
      }
    }
  }
  if (missed.size) failed.push('대응 시멘틱 없음: ' + [...missed].join(', '))
  return `${rebound}곳`
})

/* ── 3. 레거시 컬렉션 삭제 ────────────────────────────────── */
await step('레거시 컬렉션 삭제', async () => {
  const names = []
  for (const col of legacyCols) { names.push(col.name); col.remove() }
  return names.join(', ') || '없음'
})

/* ── 4. 읽는 법 섹션에 3계층 설명 ─────────────────────────── */
await step('3계층 설명 프레임', async () => {
  const P = (s) => ({ family: 'Pretendard', style: s })
  for (const s of ['Regular', 'Medium', 'Bold']) await figma.loadFontAsync(P(s))
  const styles = await figma.getLocalTextStylesAsync()
  const pick = (n) => styles.find(s => s.name === n)
  async function T(chars, styleName, colorName, fb) {
    const t = figma.createText()
    const st = pick(styleName)
    if (st) await t.setTextStyleIdAsync(st.id)
    else { t.fontName = fb?.font ?? P('Regular'); t.fontSize = fb?.size ?? 12 }
    t.characters = chars
    const semByName = new Map()
    for (const id of semCol.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id)
      if (v) semByName.set(v.name, v)
    }
    const v = semByName.get(colorName)
    const solid = { type: 'SOLID', color: rgb(colorName === 'text/primary' ? '#0C0A08' : '#726B65') }
    t.fills = [v ? figma.variables.setBoundVariableForPaint(solid, 'color', v) : solid]
    t.textAutoResize = 'WIDTH_AND_HEIGHT'
    return t
  }
  let host = null
  for (const page of figma.root.children) {
    const sec = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('00 ·'))
    if (sec) { host = sec.children.find(c => c.type === 'FRAME') ?? sec; break }
  }
  if (!host) throw new Error('00 · 읽는 법 섹션을 못 찾음')
  const old = host.findOne ? host.findOne(n => n.name === 'token-tiers') : null
  if (old) old.remove()
  const box = figma.createFrame()
  box.name = 'token-tiers'
  box.layoutMode = 'VERTICAL'
  box.itemSpacing = 8
  box.paddingTop = 24; box.paddingBottom = 24; box.paddingLeft = 24; box.paddingRight = 24
  box.primaryAxisSizingMode = 'AUTO'
  box.counterAxisSizingMode = 'AUTO'
  box.cornerRadius = 12
  box.fills = [{ type: 'SOLID', color: rgb('#FFFFFF') }]
  box.strokes = [{ type: 'SOLID', color: rgb('#EAE5E1') }]
  box.strokeWeight = 1.5
  host.appendChild(box)
  box.appendChild(await T('토큰 3계층', '2.0/body-strong', 'text/primary', { font: P('Bold'), size: 14 }))
  box.appendChild(await T([
    '1  Primitive   영화볼지도 색상 - 2.0        순수한 값. 의미 없음        neutral/900 = #0C0A08',
    '2  Semantic    영화볼지도 시멘틱 - 2.0      역할에 이름을 붙인다        text/primary → neutral/900',
    '3  Component   코드 --comp-*               컴포넌트 전용 값            --comp-date-cell-pt',
    '',
    '컴포넌트를 만들 때는 2계층(시멘틱)을 쓴다. 원시값을 직접 물리면 나중에 색을 바꿀 때',
    '쓰인 곳을 하나씩 찾아다녀야 한다. 원시값을 직접 쓰는 건 램프 자체를 보여주는 자리뿐이다.',
    '',
    '1.0 시절 Primitives · Semantic 컬렉션은 삭제했다. 같은 이름(primary/base 등)이',
    '값만 다르게 남아 있어서, 이름으로 찾으면 구 색이 잡히는 사고가 반복됐다.',
  ].join('\n'), '2.0/note', 'text/sub', { font: P('Regular'), size: 12 }))
  return '추가'
})

figma.notify(`토큰 시멘틱 계층 — 완료 ${done.length}${failed.length ? ` · 실패 ${failed.length}` : ''}`)
console.log('완료:\n' + (done.join('\n') || '없음'))
if (failed.length) console.log('확인 필요:\n' + failed.join('\n'))
