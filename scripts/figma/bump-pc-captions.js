// bump-pc-captions — TOBE · PC 포스터 캡션 폰트 승격을 피그마에 반영 (Scripter용)
//
// 코드에 이미 반영된 값(피그마 128 기준 14/12 → PC 210 기준 승격):
//   제목: 2.0/body-strong(14) → 2.0/title(16 Bold)
//   보조(감독·시간·극장): 2.0/meta(12) → 2.0/body(14)  — 색은 기존 유지
// 대상: FilmsTab TOBE (grayscale)·(Color) 두 섹션의 TOBE · PC 안 PosterItem 인스턴스
//
// 실행: Scripter 붙여넣고 Run.

const report = { title: 0, sub: 0, fail: [] }
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

const styles = {}
for (const s of await figma.getLocalTextStylesAsync()) styles[s.name] = s
const titleStyle = styles['2.0/title']
const bodyStyle = styles['2.0/body']
if (!titleStyle || !bodyStyle) { figma.notify('2.0/title 또는 2.0/body 스타일 없음'); throw new Error('no styles') }
await figma.loadFontAsync(titleStyle.fontName)
await figma.loadFontAsync(bodyStyle.fontName)

for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type !== 'SECTION' || !sec.name.startsWith('FilmsTab TOBE')) continue
    const pc = sec.children.find(n => n.name === 'TOBE · PC')
    if (!pc) continue
    for (const inst of findAll(pc, n => n.type === 'INSTANCE' && n.name.includes('PosterItem'))) {
      const texts = findAll(inst, n => n.type === 'TEXT')
      try {
        if (texts[0]) {
          const keep = texts[0].fills          // 색 오버라이드 유지
          await texts[0].setTextStyleIdAsync(titleStyle.id)
          texts[0].fills = keep
          report.title++
        }
        for (const t of texts.slice(1)) {
          const keep = t.fills
          await t.setTextStyleIdAsync(bodyStyle.id)
          t.fills = keep
          report.sub++
        }
      } catch (e) { report.fail.push(String(e).slice(0, 50)) }
    }
  }
}

await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = `bump-pc-captions 결과\n제목 → 2.0/title: ${report.title}개\n보조 → 2.0/body: ${report.sub}개` +
  (report.fail.length ? '\n실패: ' + report.fail.slice(0, 3).join(' / ') : '')
figma.currentPage.appendChild(t)
t.x = figma.viewport.center.x; t.y = figma.viewport.center.y
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('PC 캡션 승격 완료')
