// add-hero-external-icon — 인스타 히어로 우상단에 external-link 아이콘 (Scripter용)
// 모바일 theme-hero · PC insta-hero, 16px 흰색 60% — 외부로 나가는 카드 어포던스.

function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

let mobile = null, pc = null, extIcon = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
      pc = sec.children.find(n => n.name === 'TOBE · PC')
      figma.currentPage = page
    }
  }
  walk(page, n => { if (!extIcon && n.type === 'COMPONENT' && n.name === '2.0/icon/external-link') extIcon = n })
}
if (!extIcon) { figma.notify('2.0/icon/external-link 없음'); throw new Error('no icon') }

let done = 0
for (const hero of [
  mobile && findAll(mobile, n => n.name === 'theme-hero')[0],
  pc && findAll(pc, n => n.name === 'insta-hero')[0],
]) {
  if (!hero) continue
  if (findAll(hero, n => n.type === 'INSTANCE' && n.name.includes('external-link')).length) continue
  const inst = extIcon.createInstance()
  hero.appendChild(inst)
  inst.layoutPositioning = 'ABSOLUTE'
  inst.rescale(16 / inst.width)
  inst.x = hero.width - inst.width - 16
  inst.y = 16
  inst.constraints = { horizontal: 'MAX', vertical: 'MIN' }
  walk(inst, n => { if (n.type === 'VECTOR') n.fills = [{ type:'SOLID', color:{ r:1, g:1, b:1 } }] })
  inst.opacity = 0.6
  done++
}
figma.notify(`external-link 아이콘 ${done}개 부착`)
