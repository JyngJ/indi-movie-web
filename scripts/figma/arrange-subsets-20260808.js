// IconButton·Chip·SortToggle 배치 재구성 (2026-08-08) — 한 줄 나열이 어색해서 의미 격자로.
//  · IconButton: 행=variant(ghost/overlay), 열=[32: default·hover·pressed]  [44: default·hover·pressed]
//  · Chip: 행=variant(filter/dropdown), 열=[off·off-hover]  [on·on-hover]
//  · SortToggle: 행=state(default/active), 열=[기본·hover]
//  이후 섹션 세로 스택 재정렬(라벨 동반 이동). Scripter에서 Run.

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const page = figma.root.children.find(p => p.name === 'Design System - work')
if (!page) { figma.notify('Design System - work 페이지 없음'); throw new Error('no page') }
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Buttons 2.0 제안 (2026-08-08)')
if (!section) { figma.notify('제안 섹션 없음'); throw new Error('no section') }

const sets = Object.fromEntries(section.children.filter(n => n.type === 'COMPONENT_SET').map(n => [n.name, n]))
const texts = section.children.filter(n => n.type === 'TEXT')
const scrollNav = section.children.find(n => n.type === 'COMPONENT' && n.name.includes('ScrollNav'))

// 라벨 짝: 세트 위 ~28px에 있는 텍스트
function labelOf(node) {
  return texts.find(t => Math.abs((t.y + t.height) - node.y) < 20 && Math.abs(t.x - node.x) < 200)
}

const P = 24, GAP = 16, GROUP_GAP = 48, ROW_GAP = 24

// 격자 배치 헬퍼 — rows: [[{name판별fn}...그룹배열]...]
function arrange(set, rowsSpec) {
  let maxW = 0
  let cy = P
  for (const groups of rowsSpec) {
    let cx = P, rowH = 0
    for (let gi = 0; gi < groups.length; gi++) {
      if (gi > 0) cx += GROUP_GAP - GAP
      for (const match of groups[gi]) {
        const child = set.children.find(c => c.name === match)
        if (!child) continue
        child.x = cx; child.y = cy
        cx += child.width + GAP
        rowH = Math.max(rowH, child.height)
      }
    }
    maxW = Math.max(maxW, cx - GAP)
    cy += rowH + ROW_GAP
  }
  // 행 내 세로 중앙 정렬
  for (const groups of rowsSpec) {
    const rowChildren = groups.flat().map(m => set.children.find(c => c.name === m)).filter(Boolean)
    const top = Math.min(...rowChildren.map(c => c.y))
    const h = Math.max(...rowChildren.map(c => c.height))
    for (const c of rowChildren) c.y = top + (h - c.height) / 2
  }
  set.resizeWithoutConstraints(maxW + P, cy - ROW_GAP + P)
}

if (sets['2.0/IconButton']) {
  arrange(sets['2.0/IconButton'], [
    [['Variant=ghost, Size=32, State=default', 'Variant=ghost, Size=32, State=hover', 'Variant=ghost, Size=32, State=pressed'],
     ['Variant=ghost, Size=44, State=default', 'Variant=ghost, Size=44, State=hover', 'Variant=ghost, Size=44, State=pressed']],
    [['Variant=overlay, Size=32, State=default', 'Variant=overlay, Size=32, State=hover', 'Variant=overlay, Size=32, State=pressed'],
     ['Variant=overlay, Size=44, State=default', 'Variant=overlay, Size=44, State=hover', 'Variant=overlay, Size=44, State=pressed']],
  ])
}
if (sets['2.0/Chip']) {
  arrange(sets['2.0/Chip'], [
    [['Variant=filter, State=off', 'Variant=filter, State=off-hover'], ['Variant=filter, State=on', 'Variant=filter, State=on-hover']],
    [['Variant=dropdown, State=off', 'Variant=dropdown, State=off-hover'], ['Variant=dropdown, State=on', 'Variant=dropdown, State=on-hover']],
  ])
}
if (sets['2.0/SortToggle']) {
  arrange(sets['2.0/SortToggle'], [
    [['State=default', 'State=hover']],
    [['State=active', 'State=active-hover']],
  ])
}

/* 섹션 세로 스택 재정렬 — Button 아래로 라벨 동반 */
const ORDER = ['2.0/Button', '2.0/IconButton', '2.0/Chip', '2.0/SortToggle', '2.0/FAB']
let y = null
for (const name of ORDER) {
  const set = sets[name]
  if (!set) continue
  const lbl = labelOf(set)
  if (y === null) { y = set.y + set.height + 64; continue }   // Button은 그대로, 커서만 시작
  if (lbl) { lbl.y = y - 28; lbl.x = 60 }
  set.x = 60; set.y = y
  y = set.y + set.height + 64
}
if (scrollNav && y !== null) {
  const lbl = labelOf(scrollNav)
  if (lbl) { lbl.y = y - 28; lbl.x = 60 }
  scrollNav.x = 60; scrollNav.y = y
  y = scrollNav.y + scrollNav.height + 64
}
section.resizeWithoutConstraints(section.width, (y ?? section.height) + 60)
figma.viewport.scrollAndZoomIntoView([section])
figma.notify('IconButton·Chip·SortToggle 배치 재구성 완료')
