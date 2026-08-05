// 로고 자산 재구성 (Scripter용)
// - 와이드(1200×630) = OG/카톡 썸네일 → 2.0/logo/og (단일)
// - 정사각형 그룹 = 앱 아이콘 타일 → 2.0/logo/tile (배경색 감지로 인디고/잉크 variants)
// - PC 레일 인스턴스를 정사각 타일로 교체

const DS = 'Design System', WORK = 'Design System - work'
const dsPage = figma.root.children.find(p => p.name === DS)
const workPage = figma.root.children.find(p => p.name === WORK)
await dsPage.loadAsync(); await workPage.loadAsync()
await figma.setCurrentPageAsync(dsPage)
const section = dsPage.children.find(n => n.type === 'SECTION' && n.name.toLowerCase() === 'logo')
if (!section) throw new Error('logo 섹션 없음')

const log = []

// ── 1. 기존 tile(와이드) → og로 재편 ──
{
  const old = section.findOne(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === '2.0/logo/tile')
  if (old && Math.abs(old.type === 'COMPONENT_SET' ? 1200 / 630 - (old.children[0].width / old.children[0].height) : 1200 / 630 - old.width / old.height) < 0.4) {
    // 와이드 락업이 tile 이름을 차지 중 → og로
    if (!section.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/logo/og')) {
      const src = old.type === 'COMPONENT_SET'
        ? (old.children.find(c => c.name.includes('인디고')) || old.children[0])
        : old
      const w = src.width, h = src.height
      const clone = src.clone()
      section.appendChild(clone)
      try { clone.layoutSizingHorizontal = 'FIXED' } catch (e) {}
      clone.resize(w, h)
      const og = clone.type === 'COMPONENT' ? clone : figma.createComponentFromNode(clone)
      og.name = '2.0/logo/og'
      og.description = '공유 썸네일 (카톡·OG) 1200×630 — 인디고 타일 락업'
      og.x = 60; og.y = 1500
      log.push('og 컴포넌트 생성 (1200×630)')
    }
    old.remove()
    log.push('와이드가 차지하던 tile 이름 회수')
  }
}

// ── 2. 정사각형 그룹 → tile variants ──
{
  const squares = section.children.filter(n =>
    (n.type === 'GROUP' || n.type === 'FRAME') &&
    n.type !== 'COMPONENT' &&
    n.width > 100 &&
    Math.abs(n.width / n.height - 1) < 0.12)
  if (!squares.length) {
    log.push('⚠ 정사각형 그룹 못 찾음 — 섹션 자식: ' + section.children.map(c => `${c.type}:${Math.round(c.width)}x${Math.round(c.height)}`).join(', '))
  } else {
    // 배경 명도로 인디고/잉크 판정
    const lumOf = n => {
      const rects = n.findAll(x => x.type === 'RECTANGLE' && x.fills !== figma.mixed && x.fills.length && x.fills[0].type === 'SOLID')
      const big = rects.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
      const c = big ? big.fills[0].color : { r: 0.5, g: 0.5, b: 0.5 }
      return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b
    }
    const comps = []
    for (const sq of squares.sort((a, b) => lumOf(b) - lumOf(a))) {
      const w = sq.width, h = sq.height
      const clone = sq.clone()
      section.appendChild(clone)
      let wrap = clone
      if (clone.type !== 'FRAME') {
        wrap = figma.createFrame()
        wrap.resize(w, h); wrap.fills = []
        section.appendChild(wrap)
        wrap.appendChild(clone)
        clone.x = 0; clone.y = 0
      } else { try { wrap.layoutSizingHorizontal = 'FIXED' } catch (e) {}; wrap.resize(w, h) }
      const comp = figma.createComponentFromNode(wrap)
      comp.name = lumOf(sq) < 0.2 ? 'Color=잉크' : 'Color=인디고'
      comps.push(comp)
    }
    // 이름 충돌 방지 (둘 다 같은 판정이면 순번)
    const names = new Set()
    for (const c of comps) { if (names.has(c.name)) c.name = c.name + ' 2'; names.add(c.name) }
    const set = figma.combineAsVariants(comps, section)
    set.name = '2.0/logo/tile'
    set.layoutMode = 'HORIZONTAL'
    set.primaryAxisSizingMode = 'AUTO'
    set.counterAxisSizingMode = 'AUTO'
    set.itemSpacing = 60
    set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 40
    set.x = 60; set.y = 60
    set.description = '앱 아이콘 타일 (정사각). 인디고=기본, 잉크=다크 컨텍스트. 최소 32px'
    log.push(`tile 셋 생성 (${comps.length} variants: ${comps.map(c => c.name).join(', ')})`)

    // ── 3. PC 레일 인스턴스 교체 ──
    const tobeSec = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
    const pc = tobeSec && tobeSec.findOne(n => n.type === 'FRAME' && n.name.includes('PC docked'))
    const rail = pc && pc.findOne(n => n.name === 'rail')
    if (rail) {
      const oldInst = rail.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.name.includes('logo'))
      const indigo = comps.find(c => c.name.includes('인디고')) || comps[0]
      const inst = indigo.createInstance()
      if (oldInst) {
        const p = oldInst.parent, i = p.children.indexOf(oldInst)
        p.insertChild(i, inst)
        oldInst.remove()
      } else {
        rail.insertChild(0, inst)
      }
      inst.resize(40, 40)
      log.push('레일 인스턴스 → 정사각 타일 40px')
    }
  }
}
console.log(log.join('\n'))
