// wordmark 정리 (Scripter용)
// 1. variants 안 가이드 텍스트 제거
// 2. 프레임을 글자 바운드에 맞게 트림
// 3. 마스터 크기를 UI 스케일(높이 48)로 축소 — 인스턴스에서 자유 확대·축소

const TARGET_H = 48
const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)
const section = page.children.find(n => n.type === 'SECTION' && n.name.toLowerCase() === 'logo')
const set = section.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/logo/wordmark')
if (!set) throw new Error('wordmark 셋 못 찾음')

const log = []
for (const variant of set.children) {
  // 1. 텍스트 제거
  for (const t of variant.findAll(n => n.type === 'TEXT')) t.remove()
  // 2. 글자 바운드로 트림
  const kids = variant.children
  if (!kids.length) { log.push(`⚠ ${variant.name}: 내용 없음`); continue }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const k of kids) {
    minX = Math.min(minX, k.x); minY = Math.min(minY, k.y)
    maxX = Math.max(maxX, k.x + k.width); maxY = Math.max(maxY, k.y + k.height)
  }
  for (const k of kids) { k.x -= minX; k.y -= minY }
  variant.resize(maxX - minX, maxY - minY)
  // 3. 스케일 다운
  const scale = TARGET_H / variant.height
  try {
    variant.rescale(scale)
  } catch (e) {
    // rescale 미지원 시: 자식 개별 스케일
    for (const k of kids) { k.rescale(scale); k.x *= scale; k.y *= scale }
    variant.resize(variant.width * scale, TARGET_H)
  }
  log.push(`${variant.name}: ${Math.round(variant.width)}x${Math.round(variant.height)}`)
}
// 셋 정렬
set.layoutMode = 'HORIZONTAL'
set.primaryAxisSizingMode = 'AUTO'
set.counterAxisSizingMode = 'AUTO'
set.itemSpacing = 40
set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 32
set.description = '글자 워드마크 (마스터 높이 48). 인디고=종이 위 기본 / 잉크=단색 / 크림=짙은 배경. 최소 높이 16px, 인스턴스 리스케일 운용'

console.log(log.join('\n') + '\n마스터 높이 48 통일 완료')
