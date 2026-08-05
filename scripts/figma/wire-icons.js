// 컴포넌트 icon-slot → 실제 아이콘 인스턴스 연결 (Scripter용)
// GhostAction(스왑 프로퍼티), FilterButton, TheaterHeader, MovieCard

const TARGET_PAGE = 'Design System'
const page = figma.root.children.find(p => p.name === TARGET_PAGE)
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const iconSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Iconography')
const compSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
const icon = name => iconSec.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/icon/' + name)

// 변수
const colls = await figma.variables.getLocalVariableCollectionsAsync()
const cc = colls.find(c => c.name === '영화볼지도 색상 - 2.0')
const VAR = {}
for (const id of cc.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id)
  VAR[v.name] = v
}
const paintOf = name => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', VAR[name])

// 사각형 자리표시를 아이콘 인스턴스로 교체
const swapRect = (rect, iconComp, size, colorName) => {
  const parent = rect.parent
  const idx = parent.children.indexOf(rect)
  const inst = iconComp.createInstance()
  parent.insertChild(idx, inst)
  inst.resize(size, size)
  for (const v of inst.findAll(n => n.type === 'VECTOR')) {
    if (v.strokes && v.strokes.length) v.strokes = [paintOf(colorName)]
    else if (v.fills && v.fills.length && v.fills !== figma.mixed) v.fills = [paintOf(colorName)] // filled 글리프(인스타)
  }
  rect.remove()
  return inst
}
const log = []

// ── 1. GhostAction — route 기본 + 인스턴스 스왑 프로퍼티 ──
{
  const comp = compSec.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/GhostAction')
  const slot = comp && comp.findOne(n => n.type === 'RECTANGLE')
  if (comp && slot) {
    const inst = swapRect(slot, icon('route'), 14, 'neutral/600')
    inst.name = 'icon'
    // 스왑 프로퍼티: 패널에서 아이콘 골라 끼우기
    const pref = ['route', 'share-2', 'instagram', 'external-link', 'star'].map(n => ({ type: 'COMPONENT', key: icon(n).key }))
    const ref = comp.addComponentProperty('아이콘', 'INSTANCE_SWAP', icon('route').id, { preferredValues: pref })
    inst.componentPropertyReferences = { mainComponent: ref }
    log.push('GhostAction: route + 스왑 프로퍼티(5종 추천 목록)')
  } else log.push('⚠ GhostAction 슬롯 못 찾음')
}

// ── 2. FilterButton — sliders-horizontal 고정 ──
{
  const set = compSec.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/FilterButton')
  if (set) {
    for (const variant of set.children) {
      const slot = variant.findOne(n => n.type === 'RECTANGLE')
      if (!slot) continue
      const active = variant.name.includes('Active')
      swapRect(slot, icon('sliders-horizontal'), 12, active ? 'primary/900' : 'neutral/500')
    }
    log.push('FilterButton: sliders-horizontal (Default 500 / Active 900)')
  }
}

// ── 3. TheaterHeader — 외부링크 + 액션 3종 ──
{
  const comp = compSec.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/TheaterHeader')
  if (comp) {
    // 액션 버튼: 라벨 텍스트로 아이콘 매핑
    const mapping = { '길찾기': 'route', '공유하기': 'share-2', '공유': 'share-2', '인스타그램': 'instagram' }
    let done = 0
    for (const btn of comp.findAll(n => n.type === 'FRAME')) {
      const t = btn.findOne && btn.findOne(x => x.type === 'TEXT')
      const rect = btn.findOne && btn.findOne(x => x.type === 'RECTANGLE' && x.width <= 20)
      if (t && rect && mapping[t.characters]) {
        swapRect(rect, icon(mapping[t.characters]), 14, 'neutral/600')
        done++
      }
    }
    // 이름 옆 외부링크 (남은 작은 사각형 중 첫 번째)
    const leftover = comp.findOne(n => n.type === 'RECTANGLE' && n.width <= 20)
    if (leftover) swapRect(leftover, icon('external-link'), 12, 'neutral/500')
    log.push(`TheaterHeader: 액션 ${done}개 + 외부링크`)
  }
}

// ── 4. MovieCard — 감독 행 chevron + 하단 버튼 아이콘 ──
{
  const comp = compSec.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/MovieCard')
  if (comp) {
    let done = 0
    for (const btn of comp.findAll(n => n.type === 'FRAME')) {
      const t = btn.findOne && btn.findOne(x => x.type === 'TEXT')
      const rect = btn.children && btn.children.find(x => x.type === 'RECTANGLE' && x.width <= 20)
      if (!t || !rect) continue
      if (t.characters.includes('상세 정보')) { swapRect(rect, icon('chevron-right'), 14, 'neutral/600'); done++ }
      else if (t.characters.includes('검색')) { swapRect(rect, icon('search'), 14, 'neutral/600'); done++ }
    }
    // 감독 행 chevron (남은 작은 사각형)
    const leftover = comp.findOne(n => n.type === 'RECTANGLE' && n.width <= 20)
    if (leftover) { swapRect(leftover, icon('chevron-right'), 16, 'neutral/400'); done++ }
    log.push(`MovieCard: 아이콘 ${done}개`)
  }
}

console.log(log.join('\n'))
