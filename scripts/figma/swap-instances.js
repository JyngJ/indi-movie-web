// TOBE 3화면 인스턴스 교체 (Scripter용) — 원시 프레임을 2.0 컴포넌트 인스턴스로
// 대상: work 페이지 'TheaterSheet TOBE (Color)' — expanded / collapsed / PC 패널
// + 남은 자리표시 사각형(내비·탭바·화살표) 아이콘 연결

const DS = 'Design System', WORK = 'Design System - work'
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })

const dsPage = figma.root.children.find(p => p.name === DS)
const workPage = figma.root.children.find(p => p.name === WORK)
await dsPage.loadAsync(); await workPage.loadAsync()
await figma.setCurrentPageAsync(workPage)

const compSec = dsPage.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
const iconSec = dsPage.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
const C = name => compSec.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === '2.0/' + name)
const icon = name => iconSec.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/' + name)
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of cc.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); VAR[v.name] = v }
const paintOf = n => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[n])]

const section = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
const frames = []
for (const nm of ['TOBE · Mobile expanded', 'TOBE · Mobile collapsed', 'TOBE · PC docked']) {
  const f = section.findOne(n => n.type === 'FRAME' && n.name === nm)
  if (f) frames.push(f)
}
const log = []
const loadTexts = async node => {
  for (const t of node.findAll(n => n.type === 'TEXT')) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }
}
// 노드를 인스턴스로 교체 (부모·순서 유지)
const replace = (node, inst) => {
  const p = node.parent, i = p.children.indexOf(node)
  p.insertChild(i, inst)
  node.remove()
  return inst
}
const setText = async (inst, matchFn, chars) => {
  const t = inst.findAll(n => n.type === 'TEXT').find(matchFn)
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = chars }
}
const iconize = (rect, name, size, colorName) => {
  const inst = icon(name).createInstance()
  const p = rect.parent, i = p.children.indexOf(rect)
  p.insertChild(i, inst)
  inst.resize(size, size)
  const g = inst.findOne(n => n.name === 'glyph')
  if (g) g.fills = paintOf(colorName)
  rect.remove()
  return inst
}
// DateCell 불리언 키
const dateSet = C('DateCell')
const boolKey = Object.keys(dateSet.componentPropertyDefinitions).find(k => k.startsWith('상영있음'))

for (const frame of frames) {
  const fLog = []
  const isInst = n => n.type === 'INSTANCE'
  // 실제 작업 루트 (PC는 panel 안)
  const roots = frame.name.includes('PC') ? frame.findAll(n => n.type === 'FRAME' && n.name.includes('panel')).slice(0, 1) : [frame]
  const root = roots[0] || frame

  // ── ShowtimeCell ──
  const showtimes = root.findOne(n => n.name === 'showtimes')
  if (showtimes) {
    for (const cell of [...showtimes.children]) {
      if (isInst(cell) || cell.type !== 'FRAME') continue
      await loadTexts(cell)
      const txt = cell.findAll(n => n.type === 'TEXT').map(t => t.characters).join(' ')
      const state = txt.includes('상영 완료') ? '상영 완료' : txt.includes('상영중') ? '상영중' : txt.includes('매진') ? '매진' : '예정'
      const inst = C('ShowtimeCell').defaultVariant.createInstance()
      replace(cell, inst)
      inst.setProperties({ State: state })
    }
    fLog.push('showtimes')
  }
  // ── DateCell ──
  const datebar = root.findOne(n => n.name === 'datebar')
  if (datebar) {
    for (const cell of [...datebar.children]) {
      if (isInst(cell) || cell.type !== 'FRAME') continue
      await loadTexts(cell)
      const texts = cell.findAll(n => n.type === 'TEXT').map(t => t.characters)
      const dow = texts[0] || ''
      const kind = dow === '오늘' ? '오늘' : dow === '토' ? '토요일' : dow === '일' ? '일요일' : '평일'
      const bar = cell.findOne(n => n.type === 'RECTANGLE' && n.height <= 6)
      const has = bar ? bar.visible : false
      const inst = dateSet.defaultVariant.createInstance()
      replace(cell, inst)
      const props = { Kind: kind }
      if (boolKey) props[boolKey] = has
      inst.setProperties(props)
      await setText(inst, t => t.fontSize >= 14, texts[1] || '')  // 날짜 숫자
      await setText(inst, t => t.fontSize < 14, dow)              // 요일
    }
    fLog.push('datebar')
  }
  // ── PosterItem ──
  const posters = root.findOne(n => n.name === 'posters')
  if (posters) {
    for (const film of [...posters.children]) {
      if (isInst(film) || film.type !== 'FRAME') continue
      await loadTexts(film)
      const texts = film.findAll(n => n.type === 'TEXT').map(t => t.characters)
      const selected = !!film.findOne(n => n.strokes && n.strokes.length > 0)
      const inst = C('PosterItem').defaultVariant.createInstance()
      replace(film, inst)
      inst.setProperties({ Selected: selected ? 'True' : 'False' })
      if (texts[0]) await setText(inst, t => t.fontSize >= 14, texts[0])
      if (texts[1]) await setText(inst, t => t.fontSize < 14, texts[1])
    }
    fLog.push('posters')
  }
  // ── MovieCard ──
  const card = root.findOne(n => n.name === 'movie-card' && n.type === 'FRAME')
  if (card) {
    const inst = C('MovieCard').createInstance()
    replace(card, inst)
    try { inst.layoutSizingHorizontal = 'FILL' } catch (e) {}
    fLog.push('movie-card')
  }
  // ── TheaterHeader ──
  const header = root.findOne(n => n.type === 'FRAME' && n.name.includes('theater-header'))
  if (header) {
    await loadTexts(header)
    // 문자열을 삭제 전에 캡처 (노드는 replace 후 죽음)
    const nameT = header.findAll(n => n.type === 'TEXT').find(t => t.fontSize >= 20)
    const addrT = header.findAll(n => n.type === 'TEXT').find(t => t.characters.includes('서울'))
    const nameStr = nameT ? nameT.characters : null
    const addrStr = addrT ? addrT.characters : null
    const inst = C('TheaterHeader').createInstance()
    replace(header, inst)
    try { inst.layoutSizingHorizontal = 'FILL' } catch (e) {}
    const defs = C('TheaterHeader').componentPropertyDefinitions
    const props = {}
    for (const k of Object.keys(defs)) {
      if (k.startsWith('극장명') && nameStr) props[k] = nameStr
      if (k.startsWith('주소') && addrStr) props[k] = addrStr
    }
    if (Object.keys(props).length) inst.setProperties(props)
    fLog.push('theater-header')
  }
  // ── count-row 칩 ──
  const countRow = root.findOne(n => n.name === 'count-row')
  if (countRow) {
    for (const chip of countRow.findAll(n => n.type === 'FRAME' && !isInst(n))) {
      const t = chip.findOne && chip.findOne(x => x.type === 'TEXT')
      if (!t) continue
      if (t.characters.includes('예매')) { replace(chip, C('FilterPill').defaultVariant.createInstance()); fLog.push('FilterPill') }
      else if (t.characters.includes('필터')) { replace(chip, C('FilterButton').defaultVariant.createInstance()); fLog.push('FilterButton') }
    }
  }
  // ── 남은 자리표시 아이콘: nav / 탭바 / 날짜바 화살표 ──
  const nav = root.findOne(n => n.name === 'nav-row')
  if (nav) {
    const rects = nav.findAll(n => n.type === 'RECTANGLE')
    if (rects[0]) iconize(rects[0], 'chevron-left', 20, 'neutral/800')
    if (rects[1]) iconize(rects[1], 'x', 20, 'neutral/800')
    fLog.push('nav 아이콘')
  }
  const tabbar = frame.findOne(n => n.name === 'tabbar')
  if (tabbar) {
    const items = tabbar.children.filter(n => n.type === 'FRAME')
    const tabIcons = ['map', 'clapperboard', 'settings']
    items.forEach((item, i) => {
      const rect = item.findOne(n => n.type === 'RECTANGLE')
      if (rect) iconize(rect, tabIcons[i] || 'settings', 22, i === 0 ? 'primary/700' : 'neutral/400')
    })
    fLog.push('탭바 아이콘')
  }
  const db2 = root.findOne(n => n.name === 'datebar')
  if (db2) {
    for (const r of db2.findAll(n => n.type === 'RECTANGLE' && n.width <= 16 && n.parent === db2)) {
      iconize(r, r.x < db2.width / 2 ? 'chevron-left' : 'chevron-right', 14, 'neutral/400')
    }
  }
  log.push(`${frame.name}: ${fLog.join(', ')}`)
}
console.log(log.join('\n'))
