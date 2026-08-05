// fix-swap-region — swap-films-tobe에서 실패한 region-chip → FilterPill 교체 마무리 (Scripter용)
//
// 이전 실행의 실패 원인: FilterPill 라벨 폰트(Pretendard/Medium) 미로드.
// 이번엔 텍스트 노드의 실제 폰트를 읽어서 로드 후 오버라이드.
// 부작용 정리: 실패하면서 삽입만 되고 남은 고아 FilterPill 인스턴스가
// region-chip 옆에 있으면 새로 만들지 않고 그걸 재사용.

const report = []
function walk(node, fn) {
  fn(node)
  if ('children' in node) for (const c of node.children) walk(c, fn)
}
function findAll(root, pred) {
  const out = []
  walk(root, n => { if (pred(n)) out.push(n) })
  return out
}

let tobe = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') { tobe = sec; figma.currentPage = page }
  }
}
if (!tobe) { figma.notify('TOBE 섹션 없음'); throw new Error('no section') }

// FilterPill 마스터
let pillMaster = null
for (const page of figma.root.children) {
  walk(page, n => {
    if (n.type === 'COMPONENT_SET' && n.name === '2.0/FilterPill') {
      pillMaster = n.children.find(v => v.name === 'State=Default') || n.children[0]
    }
  })
}
if (!pillMaster) { figma.notify('FilterPill 마스터 없음'); throw new Error('no master') }

const chips = findAll(tobe, n => n.type === 'FRAME' && (n.name === 'region-chip' || n.name === 'region'))
let ok = 0
for (const chip of chips) {
  try {
    const label = (findAll(chip, n => n.type === 'TEXT')[0] || {}).characters || '검색 지역'
    const parent = chip.parent
    const idx = parent.children.indexOf(chip)
    // 이전 실행이 남긴 고아 인스턴스 재사용 (chip 바로 앞에 삽입돼 있음)
    const prev = parent.children[idx - 1]
    const inst = (prev && prev.type === 'INSTANCE' && prev.name.includes('FilterPill'))
      ? prev
      : (() => { const i = pillMaster.createInstance(); parent.insertChild(idx, i); return i })()
    const t = findAll(inst, n => n.type === 'TEXT')[0]
    if (t) {
      await figma.loadFontAsync(t.fontName)   // ← 지난번 실패 지점: 실제 폰트 로드
      t.characters = label
    }
    chip.remove()
    ok++
  } catch (e) { report.push('✗ ' + String(e).slice(0, 80)) }
}
report.push(`region-chip → FilterPill ${ok}개 완료`)

await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const t = figma.createText()
t.fontName = { family: 'Pretendard', style: 'Regular' }
t.characters = 'fix-swap-region 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40
t.y = tobe.y + 200
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('region-chip 교체 마무리 완료')
