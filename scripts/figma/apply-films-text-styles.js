// apply-films-text-styles — FilmsTab TOBE 텍스트 스타일 일괄 적용 + 섹션 넘김 버튼 (Scripter용)
//
// 추가: 각 sec-title을 가로 행으로 바꾸고 우측에 ‹ › 플랫 화살표 부착
//       (종이 문법 — 떠 있는 원형 버튼 대신 현행 배포의 우상단 플랫 방식)
//
// 스타일 미지정 텍스트를 (크기, 굵기) 기준으로 매핑:
//   24 KIMM → 2.0/display/h1     22·20 KIMM → 2.0/display/h2
//   16 Bold → 2.0/title          14 Bold    → 2.0/body-strong
//   14      → 2.0/body           13·12      → 2.0/meta
//   11      → 2.0/caption        10         → 2.0/label
// 인스턴스 내부 텍스트는 건드리지 않음 (컴포넌트가 이미 관리).

const report = { applied: {}, skipped: 0, unmatched: [] }

function walk(node, fn) {
  fn(node)
  if ('children' in node) for (const c of node.children) walk(c, fn)
}

const styles = {}
for (const s of await figma.getLocalTextStylesAsync()) styles[s.name] = s

function pick(t) {
  const kimm = t.fontName !== figma.mixed && t.fontName.family === 'KIMM_Bold'
  const bold = t.fontName !== figma.mixed && /Bold/.test(t.fontName.style)
  const size = t.fontSize
  if (kimm && size >= 24) return '2.0/display/h1'
  if (kimm) return '2.0/display/h2'
  if (size >= 22) return '2.0/display/h2'
  if (size >= 16 && bold) return '2.0/title'
  if (size >= 14 && bold) return '2.0/body-strong'
  if (size >= 14) return '2.0/body'
  if (size >= 12) return '2.0/meta'
  if (size >= 11) return '2.0/caption'
  return '2.0/label'
}

let tobe = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') { tobe = sec; figma.currentPage = page }
  }
}
if (!tobe) { figma.notify('TOBE 섹션 없음'); throw new Error('no section') }

const texts = []
walk(tobe, n => {
  if (n.type !== 'TEXT') return
  // 인스턴스 내부는 스킵
  let p = n.parent
  while (p) { if (p.type === 'INSTANCE') return; p = p.parent }
  texts.push(n)
})

for (const t of texts) {
  if (t.textStyleId && t.textStyleId !== figma.mixed && t.textStyleId !== '') { report.skipped++; continue }
  const name = pick(t)
  const style = styles[name]
  if (!style) { report.unmatched.push(`${t.characters.slice(0,10)} (${name} 없음)`); continue }
  try {
    await figma.loadFontAsync(style.fontName)
    await t.setTextStyleIdAsync(style.id)
    report.applied[name] = (report.applied[name] || 0) + 1
  } catch (e) {
    report.unmatched.push(`${t.characters.slice(0,10)}: ${String(e).slice(0,40)}`)
  }
}

// ── 섹션 넘김 버튼 — sec-title 우측 ‹ › ──
const chevrons = { left:null, right:null }
for (const page of figma.root.children) {
  walk(page, n => {
    if (n.type === 'COMPONENT' && n.name === '2.0/icon/chevron-left') chevrons.left = n
    if (n.type === 'COMPONENT' && n.name === '2.0/icon/chevron-right') chevrons.right = n
  })
}
let navCount = 0
if (chevrons.left && chevrons.right) {
  const secTitles = []
  walk(tobe, n => { if (n.type === 'FRAME' && n.name === 'sec-title') secTitles.push(n) })
  for (const st of secTitles) {
    try {
      if (st.children.some(c => c.name === 'nav')) continue   // 이미 처리됨
      // 기존 타이틀·부제를 세로 스택으로 묶기
      const titles = figma.createFrame()
      titles.name = 'titles'
      titles.layoutMode = 'VERTICAL'; titles.itemSpacing = 4; titles.fills = []
      titles.primaryAxisSizingMode = 'AUTO'; titles.counterAxisSizingMode = 'AUTO'
      const kids = [...st.children]
      st.appendChild(titles)
      for (const k of kids) titles.appendChild(k)
      // 컨테이너를 가로 행으로
      st.layoutMode = 'HORIZONTAL'
      st.primaryAxisAlignItems = 'SPACE_BETWEEN'
      st.counterAxisAlignItems = 'CENTER'
      st.itemSpacing = 8
      // 우측 ‹ ›
      const nav = figma.createFrame()
      nav.name = 'nav'
      nav.layoutMode = 'HORIZONTAL'; nav.itemSpacing = 12; nav.fills = []
      nav.counterAxisAlignItems = 'CENTER'
      nav.primaryAxisSizingMode = 'AUTO'; nav.counterAxisSizingMode = 'AUTO'
      for (const side of ['left','right']) {
        const inst = chevrons[side].createInstance()
        nav.appendChild(inst)
        inst.rescale(16 / inst.width)
      }
      st.appendChild(nav)
      navCount++
    } catch (e) { report.unmatched.push('nav: ' + String(e).slice(0, 50)) }
  }
}

await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const msg = ['apply-films-text-styles 결과',
  `sec-title 넘김 버튼 부착: ${navCount}개`,
  ...Object.entries(report.applied).map(([k,v]) => `${k}: ${v}개`),
  `이미 스타일 있음(스킵): ${report.skipped}`,
  ...(report.unmatched.length ? ['실패:', ...report.unmatched] : [])].join('\n')
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = msg
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 400
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('텍스트 스타일 일괄 적용 완료')
