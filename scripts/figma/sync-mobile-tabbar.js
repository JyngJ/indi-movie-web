// sync-mobile-tabbar — 모바일 탭바 선택 틴트 박스 + shadow-sm 통일을 피그마 TOBE에 반영 (Scripter용)
//
// 하는 일:
//   1. TheaterSheet TOBE (grayscale/Color) · Mobile collapsed의 tabbar:
//      - 이펙트 2.0/shadow/sheet → 2.0/shadow/sm
//      - 활성 탭(지도)에 틴트 라운드 박스 (r8, primary/700 11%)
//   2. FilmsTab TOBE (grayscale) · Mobile: 탭바 없음 → 하단에 생성 (상영작 활성)
//
// 실행: Scripter 붙여넣고 Run.

const report = []
const TINT = { type: 'SOLID', color: { r: 0x40/255, g: 0x4E/255, b: 0x81/255 }, opacity: 0.11 }

function walk(node, fn) {
  fn(node)
  if ('children' in node) for (const c of node.children) walk(c, fn)
}
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

for (const st of ['Regular','Medium']) await figma.loadFontAsync({ family:'Pretendard', style:st })
const smStyle = (await figma.getLocalEffectStylesAsync()).find(s => s.name === '2.0/shadow/sm')

// 아이콘 마스터 색인
const icons = {}
for (const page of figma.root.children) {
  await page.loadAsync()
  walk(page, n => { if (n.type === 'COMPONENT' && n.name.startsWith('2.0/icon/')) icons[n.name] = n })
}

// 활성 탭 프레임에 틴트 박스 적용
function tintTab(tab) {
  tab.fills = [TINT]
  tab.cornerRadius = 8
  if ('layoutMode' in tab && tab.layoutMode !== 'NONE') {
    tab.paddingTop = 6; tab.paddingBottom = 6
    tab.paddingLeft = 14; tab.paddingRight = 14
  }
}

// ── 1. TheaterSheet TOBE tabbar들 ──
for (const page of figma.root.children) {
  for (const sec of page.children) {
    if (sec.type !== 'SECTION' || !sec.name.startsWith('TheaterSheet TOBE')) continue
    for (const fr of sec.children) {
      const bars = findAll(fr, n => n.type === 'FRAME' && n.name === 'tabbar')
      for (const bar of bars) {
        try {
          if (smStyle) await bar.setEffectStyleIdAsync(smStyle.id)
          // 활성 탭 = '지도' 라벨 가진 탭, 없으면 첫 탭
          const tabs = bar.children.filter(n => n.type === 'FRAME')
          const active = tabs.find(t => findAll(t, x => x.type === 'TEXT' && x.characters === '지도').length) || tabs[0]
          if (active) tintTab(active)
          report.push(`${sec.name} / ${fr.name} tabbar — shadow-sm + 지도 틴트`)
        } catch (e) { report.push('✗ tabbar: ' + String(e).slice(0, 60)) }
      }
    }
  }
}

// ── 2. FilmsTab TOBE · Mobile — 탭바 생성 ──
for (const page of figma.root.children) {
  for (const sec of page.children) {
    if (sec.type !== 'SECTION' || sec.name !== 'FilmsTab TOBE (grayscale)') continue
    const mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
    if (!mobile) { report.push('✗ TOBE · Mobile 없음'); continue }
    if (findAll(mobile, n => n.name === 'tabbar').length) { report.push('FilmsTab tabbar 이미 있음 — 건너뜀'); continue }
    try {
      const bar = figma.createFrame()
      bar.name = 'tabbar'
      bar.layoutMode = 'HORIZONTAL'
      bar.primaryAxisAlignItems = 'SPACE_BETWEEN'
      bar.counterAxisAlignItems = 'CENTER'
      bar.paddingLeft = 60; bar.paddingRight = 60
      bar.paddingTop = 6; bar.paddingBottom = 6
      bar.fills = [{ type:'SOLID', color:{r:1,g:1,b:1} }]
      if (smStyle) await bar.setEffectStyleIdAsync(smStyle.id)
      mobile.appendChild(bar)
      bar.layoutSizingHorizontal = 'FILL'
      bar.primaryAxisSizingMode = 'FIXED'
      bar.counterAxisSizingMode = 'AUTO'
      const defs = [
        ['지도', '2.0/icon/map', false],
        ['상영작', '2.0/icon/clapperboard', true],
        ['설정', '2.0/icon/settings', false],
      ]
      for (const [label, iconName, active] of defs) {
        const tab = figma.createFrame()
        tab.name = 'tab'
        tab.layoutMode = 'VERTICAL'; tab.itemSpacing = 4
        tab.counterAxisAlignItems = 'CENTER'
        tab.paddingTop = 6; tab.paddingBottom = 6
        tab.paddingLeft = 14; tab.paddingRight = 14
        tab.cornerRadius = 8
        tab.fills = active ? [TINT] : []
        tab.primaryAxisSizingMode = 'AUTO'; tab.counterAxisSizingMode = 'AUTO'
        const master = icons[iconName]
        if (master) {
          const inst = master.createInstance()
          tab.appendChild(inst)
          inst.rescale(23 / inst.width)
        } else {
          const box = figma.createRectangle(); box.resize(23, 23); box.cornerRadius = 4
          box.fills = [{ type:'SOLID', color:{r:0x72/255,g:0x6B/255,b:0x65/255} }]
          tab.appendChild(box)
        }
        const t = figma.createText()
        t.fontName = { family:'Pretendard', style:'Medium' }
        t.characters = label; t.fontSize = 10; t.lineHeight = { value: 100, unit:'PERCENT' }
        t.fills = [{ type:'SOLID', color: active ? {r:0x40/255,g:0x4E/255,b:0x81/255} : {r:0x72/255,g:0x6B/255,b:0x65/255} }]
        tab.appendChild(t)
        bar.appendChild(tab)
      }
      report.push('FilmsTab TOBE · Mobile — tabbar 생성 (상영작 틴트)')
    } catch (e) { report.push('✗ FilmsTab tabbar: ' + String(e).slice(0, 60)) }
  }
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'sync-mobile-tabbar 결과\n' + (report.length ? report.join('\n') : '대상 못 찾음')
figma.currentPage.appendChild(t)
t.x = figma.viewport.center.x; t.y = figma.viewport.center.y
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('모바일 탭바 동기화 완료')
