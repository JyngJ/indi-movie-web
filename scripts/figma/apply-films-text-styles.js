// apply-films-text-styles — FilmsTab TOBE 텍스트 전부에 2.0 텍스트 스타일 일괄 적용 (Scripter용)
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

await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const msg = ['apply-films-text-styles 결과',
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
