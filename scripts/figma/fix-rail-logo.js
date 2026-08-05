// PC 레일 로고 수리 (Scripter용)
// 레일 상단의 로고 인스턴스·자리표시 잔재 전부 제거 → 인디고 타일 인스턴스 rescale로 재삽입

const DS = 'Design System', WORK = 'Design System - work'
const dsPage = figma.root.children.find(p => p.name === DS)
const workPage = figma.root.children.find(p => p.name === WORK)
await dsPage.loadAsync(); await workPage.loadAsync()
await figma.setCurrentPageAsync(workPage)

const logoSec = dsPage.children.find(n => n.type === 'SECTION' && n.name.toLowerCase() === 'logo')
const tileSet = logoSec.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/logo/tile')
if (!tileSet) throw new Error('tile 셋 없음')
const indigo = tileSet.children.find(c => c.name.includes('인디고')) || tileSet.children[0]

const tobeSec = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
const pc = tobeSec.findOne(n => n.type === 'FRAME' && n.name.includes('PC docked'))
const rail = pc.findOne(n => n.name === 'rail')
if (!rail) throw new Error('rail 없음')

const log = []
// 1. 잔재 제거: 로고 인스턴스 + 상단의 작은 무자식 사각/프레임 (탭 아이템·아이콘 인스턴스는 보존)
for (const n of [...rail.children]) {
  const isLogoInst = n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.name.includes('logo')
  const isPlaceholder = (n.type === 'RECTANGLE' || (n.type === 'FRAME' && (!n.children || n.children.length === 0))) && n.width <= 48 && n.height <= 48
  if (isLogoInst || isPlaceholder) { log.push(`제거: ${n.type} ${Math.round(n.width)}x${Math.round(n.height)}`); n.remove() }
}
// 2. 재삽입: rescale (자식까지 비례 축소)
const inst = indigo.createInstance()
rail.insertChild(0, inst)
inst.rescale(40 / inst.width)
log.push(`인디고 타일 재삽입: ${Math.round(inst.width)}x${Math.round(inst.height)} (rescale)`)

console.log(log.join('\n'))
