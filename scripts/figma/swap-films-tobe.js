// swap-films-tobe — FilmsTab TOBE (grayscale)의 골격 요소를 기존 2.0 컴포넌트 인스턴스로 교체 (Scripter용)
//
// 교체 목록:
//   1. poster-item 골격 → 2.0/PosterItem 인스턴스 (Selected=False), 캡션 텍스트 이식
//   2. region-chip("검색 지역") → 2.0/FilterPill 인스턴스 (라벨 오버라이드)
//   3. PC rail: 로고 사각형 → 2.0/logo/tile(인디고) 인스턴스 40 (rescale — resize는 내부 크롭됨)
//              탭 아이콘 사각형 → 2.0/icon/map · 2.0/icon/clapperboard 인스턴스 22 (rescale)
//   4. 감독 프로필(원형 아바타) → 2.0/shadow/inset 이펙트 적용 (배경 분리 규칙)
//
// 실행: Scripter 붙여넣고 Run. 결과는 캔버스 텍스트 리포트.

const report = []
const fail = (m) => report.push('✗ ' + m)

function walk(node, fn) {
  fn(node)
  if ('children' in node) for (const c of node.children) walk(c, fn)
}
function findAll(root, pred) {
  const out = []
  walk(root, n => { if (pred(n)) out.push(n) })
  return out
}

// ── 컴포넌트·스타일 색인 ──
const comps = {}         // 이름 → COMPONENT (셋이면 defaultVariant 아님 — variant 이름으로)
for (const page of figma.root.children) {
  await page.loadAsync()
  walk(page, n => {
    if (n.type === 'COMPONENT_SET') for (const v of n.children) comps[`${n.name}#${v.name}`] = v
    if (n.type === 'COMPONENT' && !n.parent.name?.startsWith?.('2.0')) comps[n.name] = comps[n.name] || n
    if (n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET') comps[n.name] = n
  })
}
const effectStyles = await figma.getLocalEffectStylesAsync()
const insetStyle = effectStyles.find(s => s.name === '2.0/shadow/inset')

// TOBE 섹션
let tobe = null
for (const page of figma.root.children) {
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') { tobe = sec; figma.currentPage = page }
  }
}
if (!tobe) { figma.notify('FilmsTab TOBE (grayscale) 섹션 없음'); throw new Error('no section') }

// 필요한 폰트 (텍스트 오버라이드용)
await figma.loadFontAsync({ family: 'Pretendard', style: 'Bold' })
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })

// ── 1. poster-item → 2.0/PosterItem ──
const posterMaster = comps['2.0/PosterItem#Selected=False']
if (!posterMaster) fail('PosterItem 마스터 못 찾음')
else {
  const items = findAll(tobe, n => n.type === 'FRAME' && n.name === 'poster-item')
  let ok = 0
  for (const item of items) {
    try {
      // 기존 캡션 텍스트 수집 (제거 전에!)
      const texts = findAll(item, n => n.type === 'TEXT').map(t => t.characters)
      const parent = item.parent
      const idx = parent.children.indexOf(item)
      const inst = posterMaster.createInstance()
      parent.insertChild(idx, inst)
      // 캡션 이식 — 인스턴스 안 TEXT 순서: 제목, 감독
      const instTexts = findAll(inst, n => n.type === 'TEXT')
      if (texts[0] && instTexts[0]) instTexts[0].characters = texts[0]
      if (texts[1] && instTexts[1]) instTexts[1].characters = texts[1]
      item.remove()
      ok++
    } catch (e) { fail('poster-item 교체 실패: ' + String(e).slice(0, 60)) }
  }
  report.push(`poster-item → PosterItem 인스턴스 ${ok}개`)
}

// ── 2. region-chip → 2.0/FilterPill ──
const pillMaster = comps['2.0/FilterPill#State=Default']
if (!pillMaster) fail('FilterPill 마스터 못 찾음')
else {
  const chips = findAll(tobe, n => n.type === 'FRAME' && (n.name === 'region-chip' || n.name === 'region'))
  let ok = 0
  for (const chip of chips) {
    try {
      const label = (findAll(chip, n => n.type === 'TEXT')[0] || {}).characters || '검색 지역'
      const parent = chip.parent
      const idx = parent.children.indexOf(chip)
      const inst = pillMaster.createInstance()
      parent.insertChild(idx, inst)
      const t = findAll(inst, n => n.type === 'TEXT')[0]
      if (t) t.characters = label
      chip.remove()
      ok++
    } catch (e) { fail('region-chip 교체 실패: ' + String(e).slice(0, 60)) }
  }
  report.push(`region-chip → FilterPill 인스턴스 ${ok}개`)
}

// ── 3. PC rail 로고·아이콘 ──
{
  const rails = findAll(tobe, n => n.type === 'FRAME' && n.name === 'rail')
  for (const rail of rails) {
    // 로고: 40×40 Rectangle
    const logoRect = rail.children.find(n => n.type === 'RECTANGLE' && Math.round(n.width) === 40)
    const tileMaster = comps['2.0/logo/tile#Color=인디고']
    if (logoRect && tileMaster) {
      try {
        const idx = rail.children.indexOf(logoRect)
        const inst = tileMaster.createInstance()
        rail.insertChild(idx, inst)
        inst.rescale(40 / inst.width)   // resize는 내부 크롭 — 반드시 rescale
        logoRect.remove()
        report.push('rail 로고 → logo/tile 인스턴스')
      } catch (e) { fail('rail 로고 교체 실패: ' + String(e).slice(0, 60)) }
    }
    // 탭 아이콘
    const tabIcons = { '지도': '2.0/icon/map', '상영작': '2.0/icon/clapperboard' }
    for (const tab of rail.children.filter(n => n.name === 'tab')) {
      const label = (findAll(tab, n => n.type === 'TEXT')[0] || {}).characters
      const master = comps[tabIcons[label]]
      const rect = tab.children.find(n => n.type === 'RECTANGLE')
      if (master && rect) {
        try {
          const idx = tab.children.indexOf(rect)
          const inst = master.createInstance()
          tab.insertChild(idx, inst)
          inst.rescale(22 / inst.width)
          rect.remove()
          report.push(`rail 탭 아이콘(${label}) → 인스턴스`)
        } catch (e) { fail(`탭 아이콘(${label}) 교체 실패: ` + String(e).slice(0, 60)) }
      }
    }
  }
}

// ── 4. 프로필 아바타 — 2.0/shadow/inset (배경과 분리) ──
if (!insetStyle) fail('2.0/shadow/inset 스타일 못 찾음')
else {
  const avatars = findAll(tobe, n => n.type === 'ELLIPSE')
  let ok = 0
  for (const av of avatars) {
    try { await av.setEffectStyleIdAsync(insetStyle.id); ok++ }
    catch (e) { fail('아바타 inset 실패: ' + String(e).slice(0, 60)) }
  }
  report.push(`프로필 아바타 inset 적용 ${ok}개`)
}

// ── 리포트 ──
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const t = figma.createText()
t.fontName = { family: 'Pretendard', style: 'Regular' }
t.characters = 'swap-films-tobe 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40
t.y = tobe.y
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('TOBE 컴포넌트 교체 완료')
