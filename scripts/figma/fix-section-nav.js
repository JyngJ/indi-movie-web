// fix-section-nav — sec-title 넘김 버튼을 배포판 ScrollNavButton 모양으로 교정 (Scripter용)
//
// 문제 2가지 수정:
//   1. sec-title이 가로 전환 때 FILL이 풀려 허그로 줄어듦 → FILL 복원 (화살표가 우측 끝으로)
//   2. 맨 셰브런 → 원형 버튼 (28, surface-bg 채움, neutral/200 1px 보더 — 배포판 스펙)
//
// 실행: Scripter 붙여넣고 Run. 재실행 안전 (이미 원형이면 스킵).

const report = []
function walk(node, fn) {
  fn(node)
  if ('children' in node) for (const c of node.children) walk(c, fn)
}

let tobe = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') { tobe = sec; figma.currentPage = page }
  }
}
if (!tobe) { figma.notify('TOBE 섹션 없음'); throw new Error('no section') }

const secTitles = []
walk(tobe, n => { if (n.type === 'FRAME' && n.name === 'sec-title') secTitles.push(n) })

let fixed = 0
for (const st of secTitles) {
  try {
    // 1. FILL 복원 — 부모가 오토레이아웃일 때만
    const p = st.parent
    if (p && 'layoutMode' in p && p.layoutMode !== 'NONE') st.layoutSizingHorizontal = 'FILL'

    // 2. nav 안 맨 셰브런 → 원형 버튼
    const nav = st.children.find(c => c.name === 'nav')
    if (!nav) continue
    nav.itemSpacing = 8
    for (const child of [...nav.children]) {
      if (child.type === 'FRAME' && child.name === 'nav-btn') continue   // 이미 원형
      const idx = nav.children.indexOf(child)
      const btn = figma.createFrame()
      btn.name = 'nav-btn'
      btn.resize(28, 28)
      btn.cornerRadius = 9999
      btn.fills = [{ type:'SOLID', color:{ r:0xFA/255, g:0xF9/255, b:0xF8/255 } }]   // surface-bg
      btn.strokes = [{ type:'SOLID', color:{ r:0xDD/255, g:0xD9/255, b:0xCF/255 } }] // neutral/200
      btn.strokeWeight = 1
      btn.layoutMode = 'HORIZONTAL'
      btn.primaryAxisAlignItems = 'CENTER'
      btn.counterAxisAlignItems = 'CENTER'
      btn.primaryAxisSizingMode = 'FIXED'
      btn.counterAxisSizingMode = 'FIXED'
      nav.insertChild(idx, btn)
      btn.appendChild(child)                 // 셰브런을 버튼 안으로
      child.rescale(12 / child.width)        // 아이콘 12 (배포판 비율 ≈ size*0.44)
    }
    fixed++
  } catch (e) { report.push('✗ ' + String(e).slice(0, 60)) }
}
report.unshift(`sec-title 교정 ${fixed}개 (FILL 복원 + 원형 버튼)`)

await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'fix-section-nav 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 600
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('섹션 넘김 버튼 교정 완료')
