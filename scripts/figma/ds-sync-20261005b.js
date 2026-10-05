// PosterChip Tone=primary·neutral 배리언트 삭제 (Scripter용) — 2026-10-05
//
// 코드에서 두 톤을 지웠다(fix/design-system-drift). neutral은 램프에 없는 #78716C 하드코딩이었고,
// 둘 다 9/27 코너 태그 이후 제품 화면에서 쓰이지 않았다.
// 이 배리언트를 쓰는 인스턴스가 있으면 지우지 않고 목록만 남긴다 — 지우면 인스턴스가 원본을 잃는다.

const PAGE = 'Design System fixed'
const DROP = ['primary', 'neutral']

const page = figma.root.children.find(p => p.name === PAGE)
if (!page) throw new Error(`페이지 "${PAGE}" 없음`)
await page.loadAsync()

function findSet(name) {
  const stack = [...page.children]
  while (stack.length) {
    const n = stack.pop()
    if (n.type === 'COMPONENT_SET' && n.name === name) return n
    if ('children' in n) stack.push(...n.children)
  }
  return null
}
const toneOf = name => {
  const m = (name || '').match(/Tone=([^,]+)/)
  return m ? m[1].trim() : null
}

try {
  const set = findSet('2.0/PosterChip')
  if (!set) throw new Error('2.0/PosterChip 세트 없음')
  const targets = set.children.filter(c => DROP.includes(toneOf(c.name)))
  let removed = 0
  for (const c of targets) {
    const instances = await c.getInstancesAsync()
    if (instances.length) {
      console.log('건너뜀:', c.name, `— 인스턴스 ${instances.length}개:`,
        instances.slice(0, 5).map(i => `${i.parent ? i.parent.name : '?'} (${i.id})`).join(', '))
      continue
    }
    c.remove()
    removed++
  }
  console.log(`완료: PosterChip 배리언트 ${removed}/${targets.length}개 삭제`)
  figma.notify(`PosterChip 배리언트 ${removed}/${targets.length}개 삭제`)
} catch (e) {
  console.log('실패: PosterChip —', e.message)
}
