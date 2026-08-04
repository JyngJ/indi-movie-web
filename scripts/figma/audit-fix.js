// 코드 대조 감사 수정 스크립트 (Scripter 플러그인용)
// fix-badge.js 다음에 실행 권장. 순서 무관하게 동작은 함.
//
// 고치는 것:
//   A. PosterOverlayChip — D-day 색 체계(D-0 error / D-1 warning / D-2+ #78716C),
//      weight 600, D-day 칩 그림자 추가, 변형 2개 추가
//   B. Chip — lineHeight 1.2, 섹션 라벨 정정
//   C. FilterChip — 신규 컴포넌트 셋 (배포 FilterChip.tsx 스펙)
//   D. Input — Focus를 border 1px + ring 1px(primary 30%)로, Error stroke 1.5→1
//   E. ShowtimeCell — 삭제 후 배포 스펙대로 재생성 (6개 상태)

// ─── 공통 ───────────────────────────────────────────────────────
const V = {
  card: 'VariableID:2:27', border: 'VariableID:2:29', raised: 'VariableID:2:28',
  textPrimary: 'VariableID:2:31', sub: 'VariableID:2:33', body: 'VariableID:2:32',
  placeholder: 'VariableID:2:35', caption: 'VariableID:2:34',
  pBase: 'VariableID:2:38', pSubtle: 'VariableID:2:40', pOn: 'VariableID:2:41',
  warn: 'VariableID:2:42', err: 'VariableID:2:44', onAccent: 'VariableID:2:37',
  radControl: 'VariableID:2:63', radBadge: 'VariableID:2:60', sp3: 'VariableID:2:50',
}
const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const bound = async (varId, fallback, opacity) => {
  const v = await figma.variables.getVariableByIdAsync(varId)
  const p = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: hex(fallback) }, 'color', v)
  return opacity != null ? { ...p, opacity } : p
}
const fonts = await figma.listAvailableFontsAsync()
const has = (fam, sty) => fonts.some(f => f.fontName.family === fam && f.fontName.style === sty)
if (!has('Pretendard', 'SemiBold')) throw new Error('Pretendard 필요 — 데스크톱 앱에서 실행할 것')
const P = style => ({ family: 'Pretendard', style })
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync(P(s))
let KIMM = { family: 'KIMM_Bold', style: 'B' }
if (!has(KIMM.family, KIMM.style)) {
  const c = fonts.find(f => /KIMM/i.test(f.fontName.family) && /B|Bold/i.test(f.fontName.style))
  KIMM = c ? c.fontName : P('Bold')
}
await figma.loadFontAsync(KIMM)
// 기존 텍스트 폰트(모를 수 있음) 로드 헬퍼
const loadNodeFonts = async node => {
  for (const t of node.findAllWithCriteria({ types: ['TEXT'] })) {
    const f = t.fontName
    if (f !== figma.mixed) { try { await figma.loadFontAsync(f) } catch (e) {} }
  }
}
const dShadow = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.35 }, offset: { x: 0, y: 1 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' }]

const page = figma.root.children[0]
await page.loadAsync()
const log = []

// ─── A. PosterOverlayChip ───────────────────────────────────────
const chipSet = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'PosterOverlayChip')
if (chipSet) {
  await loadNodeFonts(chipSet)
  for (const comp of chipSet.children) {
    for (const t of comp.findAllWithCriteria({ types: ['TEXT'] })) t.fontName = P('SemiBold') // 배포 스펙 600
  }
  const dn = chipSet.children.find(c => c.name === 'Type=D-N')
  if (dn) {
    dn.fills = [{ type: 'SOLID', color: hex('#78716C') }] // 배포 하드코딩 값 그대로
    dn.effects = dShadow
    // 파생 변형: D-1 (warning), D-Day (error)
    if (!chipSet.children.find(c => c.name === 'Type=D-1')) {
      const d1 = dn.clone()
      chipSet.appendChild(d1)
      d1.name = 'Type=D-1'
      d1.fills = [await bound(V.warn, '#D97706')]
      d1.effects = dShadow
      const t1 = d1.findAllWithCriteria({ types: ['TEXT'] })[0]
      t1.characters = 'D-1'
    }
    if (!chipSet.children.find(c => c.name === 'Type=D-Day')) {
      const d0 = dn.clone()
      chipSet.appendChild(d0)
      d0.name = 'Type=D-Day'
      d0.fills = [await bound(V.err, '#B94A48')]
      d0.effects = dShadow
      const t0 = d0.findAllWithCriteria({ types: ['TEXT'] })[0]
      t0.characters = '오늘'
    }
  }
  log.push('A. PosterOverlayChip: D-day 색 체계 + 600 + 그림자')
} else log.push('A. PosterOverlayChip 못 찾음 — 건너뜀')

// ─── B. Chip lineHeight + 라벨 ──────────────────────────────────
const chipPrimSet = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip')
if (chipPrimSet) {
  await loadNodeFonts(chipPrimSet)
  for (const t of chipPrimSet.findAllWithCriteria({ types: ['TEXT'] })) {
    t.lineHeight = { unit: 'PERCENT', value: 120 } // Chip.tsx lineHeight 1.2
  }
  log.push('B. Chip: lineHeight 1.2')
}
const chipLabel = page.findOne(n => n.type === 'TEXT' && n.characters === 'Chip / FilterChip')
if (chipLabel) {
  const f = chipLabel.fontName
  if (f !== figma.mixed) await figma.loadFontAsync(f)
  chipLabel.characters = 'Chip'
}

// ─── C. FilterChip 신규 ─────────────────────────────────────────
// FilterChip.tsx: height 36(--filter-chip-height), px14, radius pill, gap4
//   default: raised bg + border 1px, 라벨 13/500 body
//   selected: subtle bg + border 1.5px primary, "지역 · 서울" = 라벨 13/400 sub + 값 13/600
const primSection = page.findOne(n => n.type === 'SECTION' && n.name === '02 · Primitives')
if (primSection && !page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'FilterChip')) {
  const mkText = (chars, style, size, fill) => {
    const t = figma.createText()
    t.fontName = P(style); t.characters = chars; t.fontSize = size
    t.fills = [fill]
    return t
  }
  const comps = []
  // Default
  {
    const c = figma.createComponent()
    c.name = 'State=Default'
    c.layoutMode = 'HORIZONTAL'
    c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'
    c.counterAxisAlignItems = 'CENTER'; c.itemSpacing = 4
    c.paddingLeft = 14; c.paddingRight = 14
    c.resize(60, 36); c.cornerRadius = 9999
    c.fills = [await bound(V.raised, '#F0EDE6')]
    c.strokes = [await bound(V.border, '#DDD9CF')]; c.strokeWeight = 1
    c.appendChild(mkText('지역', 'Medium', 13, await bound(V.body, '#4A4540')))
    comps.push(c)
  }
  // Selected
  {
    const c = figma.createComponent()
    c.name = 'State=Selected'
    c.layoutMode = 'HORIZONTAL'
    c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'
    c.counterAxisAlignItems = 'CENTER'; c.itemSpacing = 0
    c.paddingLeft = 14; c.paddingRight = 14
    c.resize(60, 36); c.cornerRadius = 9999
    c.fills = [await bound(V.pSubtle, '#E8EEF4')]
    c.strokes = [await bound(V.pBase, '#4A6380')]; c.strokeWeight = 1.5
    c.appendChild(mkText('지역', 'Regular', 13, await bound(V.sub, '#635D55')))
    c.appendChild(mkText(' · ', 'Regular', 13, await bound(V.sub, '#635D55')))
    c.appendChild(mkText('서울', 'SemiBold', 13, await bound(V.pOn, '#2B3D50')))
    comps.push(c)
  }
  const set = figma.combineAsVariants(comps, primSection)
  set.name = 'FilterChip'
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 16
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24
  set.x = 280; set.y = 840
  const lb = figma.createText()
  lb.fontName = KIMM; lb.characters = 'FilterChip'; lb.fontSize = 20
  lb.fills = [{ type: 'SOLID', color: hex('#1A1714') }]
  primSection.appendChild(lb); lb.x = 280; lb.y = 800
  log.push('C. FilterChip 생성 (Default/Selected)')
}

// ─── D. Input Focus/Error ───────────────────────────────────────
const inputSet = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Input')
if (inputSet) {
  const focus = inputSet.children.find(c => c.name === 'State=Focus')
  if (focus) {
    const field = focus.findOne(n => n.name === 'field')
    field.strokeWeight = 1
    field.effects = [{ type: 'DROP_SHADOW', color: { ...hex('#4A6380'), a: 0.3 }, offset: { x: 0, y: 0 }, radius: 0, spread: 1, visible: true, blendMode: 'NORMAL' }] // ring-1 재현
  }
  const err = inputSet.children.find(c => c.name === 'State=Error')
  if (err) { const field = err.findOne(n => n.name === 'field'); field.strokeWeight = 1 }
  log.push('D. Input: Focus ring + Error stroke 1px')
}

// ─── E. ShowtimeCell 재생성 ─────────────────────────────────────
const compSection = page.findOne(n => n.type === 'SECTION' && n.name === '03 · Components')
if (compSection) {
  const old = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'ShowtimeCell')
  if (old) old.remove()
  const radVar = await figma.variables.getVariableByIdAsync(V.radControl)
  const sp3Var = await figma.variables.getVariableByIdAsync(V.sp3)
  // [상태, 시간strike, 좌석available색/strike, opacity, selected, late, ended]
  const defs = [
    { name: 'Default',  seat: [V.pBase, '#4A6380'] },
    { name: 'Selected', seat: [V.pBase, '#4A6380'], selected: true },
    { name: 'Low',      seat: [V.warn, '#D97706'] },
    { name: 'Soldout',  seat: [V.placeholder, '#A9A39A'], seatStrike: true, dim: true },
    { name: 'Late',     seat: [V.pBase, '#4A6380'], late: true },
    { name: 'Ended',    ended: true, timeStrike: true, dim: true },
  ]
  const comps = []
  for (const d of defs) {
    const c = figma.createComponent()
    c.name = `State=${d.name}`
    c.layoutMode = 'VERTICAL'
    c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'
    c.itemSpacing = 6
    c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 12
    c.resize(100, 80)
    for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) c.setBoundVariable(k, sp3Var)
    for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) c.setBoundVariable(k, radVar)
    c.fills = [d.selected ? await bound(V.pSubtle, '#E8EEF4') : await bound(V.card, '#FFFFFF')]
    c.strokes = [d.selected ? await bound(V.pBase, '#4A6380') : await bound(V.border, '#DDD9CF')]
    c.strokeWeight = d.selected ? 1.5 : 1
    if (d.dim) c.opacity = 0.45

    // 시간 줄: 17/700 + "-21:32" 10 sub
    const row1 = figma.createFrame()
    row1.layoutMode = 'HORIZONTAL'
    row1.primaryAxisSizingMode = 'AUTO'; row1.counterAxisSizingMode = 'AUTO'
    row1.counterAxisAlignItems = 'BASELINE'; row1.itemSpacing = 4
    row1.fills = []
    const time = figma.createText()
    time.fontName = P('Bold'); time.characters = '19:30'; time.fontSize = 17
    time.lineHeight = { unit: 'PERCENT', value: 100 }
    time.fills = [await bound(V.textPrimary, '#1A1714')]
    if (d.timeStrike) time.textDecoration = 'STRIKETHROUGH'
    row1.appendChild(time)
    const end = figma.createText()
    end.fontName = P('Regular'); end.characters = '-21:32'; end.fontSize = 10
    end.fills = [await bound(V.sub, '#635D55')]
    row1.appendChild(end)
    c.appendChild(row1)

    // 좌석 줄: "82" 12/600 색상 + "/120석" 12 sub  (ended: "상영 완료" 12/700 error)
    const row2 = figma.createFrame()
    row2.layoutMode = 'HORIZONTAL'
    row2.primaryAxisSizingMode = 'AUTO'; row2.counterAxisSizingMode = 'AUTO'
    row2.itemSpacing = 0; row2.fills = []
    if (d.ended) {
      const t = figma.createText()
      t.fontName = P('Bold'); t.characters = '상영 완료'; t.fontSize = 12
      t.fills = [await bound(V.err, '#B94A48')]
      row2.appendChild(t)
    } else {
      const avail = figma.createText()
      avail.fontName = P('SemiBold'); avail.characters = d.name === 'Low' ? '6' : '82'; avail.fontSize = 12
      avail.fills = [await bound(d.seat[0], d.seat[1])]
      if (d.seatStrike) avail.textDecoration = 'STRIKETHROUGH'
      row2.appendChild(avail)
      const total = figma.createText()
      total.fontName = P('Regular'); total.characters = '/120석'; total.fontSize = 12
      total.fills = [await bound(V.sub, '#635D55')]
      if (d.seatStrike) total.textDecoration = 'STRIKETHROUGH'
      row2.appendChild(total)
    }
    c.appendChild(row2)

    // 상영관 줄 + 심야 배지
    const row3 = figma.createFrame()
    row3.layoutMode = 'HORIZONTAL'
    row3.primaryAxisSizingMode = 'FIXED'; row3.counterAxisSizingMode = 'AUTO'
    row3.counterAxisAlignItems = 'CENTER'; row3.itemSpacing = 4
    row3.primaryAxisAlignItems = 'SPACE_BETWEEN'
    row3.fills = []
    const hall = figma.createText()
    hall.fontName = P('Regular'); hall.characters = '2관'; hall.fontSize = 11
    hall.fills = [await bound(V.sub, '#635D55')]
    row3.appendChild(hall)
    if (d.late) {
      const b = figma.createFrame()
      b.layoutMode = 'HORIZONTAL'
      b.primaryAxisSizingMode = 'AUTO'; b.counterAxisSizingMode = 'FIXED'
      b.counterAxisAlignItems = 'CENTER'
      b.paddingLeft = 8; b.paddingRight = 8
      b.resize(30, 18)
      b.fills = [await bound(V.pBase, '#4A6380')]
      const rb = await figma.variables.getVariableByIdAsync(V.radBadge)
      for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) b.setBoundVariable(k, rb)
      const bt = figma.createText()
      bt.fontName = P('Bold'); bt.characters = '심야'; bt.fontSize = 9
      bt.letterSpacing = { unit: 'PIXELS', value: 0.4 }
      bt.fills = [await bound(V.onAccent, '#FFFFFF')]
      b.appendChild(bt)
      row3.appendChild(b)
    }
    c.appendChild(row3)
    row3.layoutSizingHorizontal = 'FILL'
    comps.push(c)
  }
  const set = figma.combineAsVariants(comps, compSection)
  set.name = 'ShowtimeCell'
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 16
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24
  set.x = 64; set.y = 500
  if (!page.findOne(n => n.type === 'TEXT' && n.characters === 'ShowtimeCell')) {
    const lb = figma.createText()
    lb.fontName = KIMM; lb.characters = 'ShowtimeCell'; lb.fontSize = 20
    lb.fills = [{ type: 'SOLID', color: hex('#1A1714') }]
    compSection.appendChild(lb); lb.x = 64; lb.y = 460
  }
  log.push('E. ShowtimeCell 재생성 (6개 상태, 배포 스펙)')
}

console.log(log.join('\n'))
console.log('감사 수정 완료')
