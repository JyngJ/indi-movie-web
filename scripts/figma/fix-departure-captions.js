// fix-departure-captions — 지금출발 캡션을 [시간 / 극장명] 두 줄로 (Scripter용)

function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

let mobile = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
      figma.currentPage = page
    }
  }
}
if (!mobile) { figma.notify('TOBE · Mobile 없음'); throw new Error('no frame') }

const group = findAll(mobile, n =>
  n.type === 'FRAME' &&
  findAll(n, x => x.type === 'TEXT' && x.characters.startsWith('지금 출발')).length > 0 &&
  findAll(n, x => x.type === 'INSTANCE' && x.name.includes('PosterItem')).length > 0)
  .sort((a, b) => a.width * a.height - b.width * b.height)[0]
if (!group) { figma.notify('지금출발 그룹 못 찾음'); throw new Error('not found') }

const caps = ['오늘 18:20\n영화공간주안', '오늘 18:40\n황성시네마', '오늘 19:10\n아리랑시네센터']
let i = 0
for (const item of findAll(group, x => x.type === 'INSTANCE' && x.name.includes('PosterItem'))) {
  const sub = findAll(item, x => x.type === 'TEXT')[1]
  if (sub) {
    await figma.loadFontAsync(sub.fontName)
    sub.characters = caps[i % caps.length]
  }
  i++
}
figma.notify(`지금출발 캡션 ${i}개 — 시간/극장 두 줄로`)
