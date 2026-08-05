// Logo 시스템 구축 (Scripter용)
// 1. logo 섹션의 락업 → 2.0/logo/tile 컴포넌트
// 2. 글자만 추출 → 2.0/logo/wordmark (Color=인디고/잉크/크림 variants)
// 3. 클리어스페이스·최소크기 스펙 주석
// 4. TOBE PC 레일의 로고 자리표시 → tile 인스턴스 연결

const SECTION_ID = '64:492'
const DS = 'Design System', WORK = 'Design System - work'

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' })

const dsPage = figma.root.children.find(p => p.name === DS)
const workPage = figma.root.children.find(p => p.name === WORK)
await dsPage.loadAsync(); await workPage.loadAsync()
await figma.setCurrentPageAsync(dsPage)

const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('logo 섹션 못 찾음')

// 변수
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of cc.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); VAR[v.name] = v }
const paintOf = n => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[n])]

const log = []
// ── 1. 락업 발견: 섹션에서 가장 큰 비컴포넌트 노드 ──
const existingTile = section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/logo/tile')
let tileComp = existingTile
if (!tileComp) {
  const candidates = section.children.filter(n => n.type !== 'COMPONENT' && n.type !== 'COMPONENT_SET' && n.type !== 'TEXT')
  if (!candidates.length) throw new Error('로고 원본 노드 못 찾음 — 섹션에 락업이 있는지 확인')
  const src = candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
  const w = src.width, h = src.height
  const clone = src.clone()
  section.appendChild(clone)
  if ('layoutSizingHorizontal' in clone) { try { clone.layoutSizingHorizontal = 'FIXED' } catch (e) {} }
  if ('resize' in clone) clone.resize(w, h)
  // 프레임이 아니면 래핑
  let wrap = clone
  if (clone.type !== 'FRAME') {
    wrap = figma.createFrame()
    wrap.resize(w, h); wrap.fills = []
    section.appendChild(wrap)
    wrap.appendChild(clone)
    clone.x = 0; clone.y = 0
  }
  tileComp = figma.createComponentFromNode(wrap)
  tileComp.name = '2.0/logo/tile'
  tileComp.description = '앱 아이콘형 락업 — 타일 primary/700 + 손글씨 화이트. 최소 32px, 클리어스페이스 = 타일의 25%'
  tileComp.x = 60; tileComp.y = 700
  log.push(`tile 컴포넌트화 (${Math.round(w)}x${Math.round(h)})`)
}

// ── 2. 워드마크: tile에서 배경 제거 → 글자만, 색 3종 ──
if (!section.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/logo/wordmark')) {
  const mkWordmark = (colorVar, variantName) => {
    const c = tileComp.clone() // COMPONENT clone → COMPONENT
    section.appendChild(c)
    c.name = `Color=${variantName}`
    // 배경(타일 사각형: 가장 큰 RECTANGLE 또는 fills 있는 프레임 배경) 제거
    const bg = c.findAll(n => n.type === 'RECTANGLE').sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
    if (bg) bg.remove()
    if (c.fills && c.fills.length) c.fills = []
    // 남은 벡터 = 글자 → 착색
    for (const v of c.findAll(n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION' || n.type === 'STAR' || n.type === 'POLYGON')) {
      if (v.fills !== figma.mixed && v.fills.length) v.fills = paintOf(colorVar)
      if (v.strokes && v.strokes.length) v.strokes = paintOf(colorVar)
    }
    return c
  }
  const comps = [
    mkWordmark('primary/700', '인디고'),
    mkWordmark('neutral/900', '잉크'),
    mkWordmark('primary/100', '크림'),
  ]
  const set = figma.combineAsVariants(comps, section)
  set.name = '2.0/logo/wordmark'
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 40
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 32
  set.x = 60; set.y = 700 + tileComp.height + 60
  set.description = '글자만 워드마크. 인디고=종이 위 기본, 잉크=단색 인쇄, 크림=짙은 배경 위. 크림 variant는 다크 프레임 위에서 확인할 것'
  log.push('wordmark 3색 variants')
}

// ── 3. 스펙 주석 ──
{
  const old = section.findOne(n => n.type === 'TEXT' && n.name === 'logo-spec')
  if (old) old.remove()
  const t = figma.createText()
  t.name = 'logo-spec'
  t.fontName = { family: 'Pretendard', style: 'Regular' }
  t.characters = '규칙\n· 클리어스페이스: 타일/글자 높이의 25% 이상 확보\n· 최소 크기: 타일 32px, 워드마크 높이 16px\n· 타일 배경은 primary/700 고정 — 다른 색 타일 금지\n· 손글씨는 로고 전용 — UI 텍스트에 사용 금지'
  t.fontSize = 12
  t.lineHeight = { unit: 'PERCENT', value: 160 }
  t.fills = [{ type: 'SOLID', color: { r: 0.35, g: 0.33, b: 0.31 } }]
  section.appendChild(t)
  t.x = tileComp.x + tileComp.width + 60; t.y = tileComp.y
  log.push('스펙 주석')
}

// ── 4. PC 레일 로고 연결 (Color TOBE) ──
{
  const tobeSec = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
  const pc = tobeSec && tobeSec.findOne(n => n.type === 'FRAME' && n.name.includes('PC docked'))
  const rail = pc && pc.findOne(n => n.name === 'rail')
  if (rail) {
    // 자리표시: rail 안 첫 번째 진한 사각/프레임 (40px급, 인스턴스 아님)
    const ph = rail.children.find(n => n.type !== 'INSTANCE' && n.type !== 'TEXT' && n.width <= 48 && n.height <= 48 && (!n.children || n.children.length === 0))
    if (ph) {
      const inst = tileComp.createInstance()
      const p = ph.parent, i = p.children.indexOf(ph)
      p.insertChild(i, inst)
      inst.resize(40, 40)
      ph.remove()
      log.push('PC 레일 로고 인스턴스 연결 (40px)')
    } else log.push('⚠ 레일 자리표시 못 찾음 — 수동 연결 필요')
  }
}

console.log(log.join('\n'))
