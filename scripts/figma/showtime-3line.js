// ShowtimeCell 3줄 압축 (Scripter용)
// 전 variant: 관·포맷 줄 삭제. 심야 배지는 시간 줄 오른쪽 인라인으로.

const TARGET_PAGE = 'Design System'
const page = figma.root.children.find(p => p.name === TARGET_PAGE)
if (!page) throw new Error('Design System 페이지 못 찾음')
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ShowtimeCell')
if (!set) throw new Error('2.0/ShowtimeCell 못 찾음')

const log = []
for (const variant of set.children) {
  // 폰트 로드 (텍스트 이동·삭제 대비)
  for (const t of variant.findAll(n => n.type === 'TEXT')) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }

  // 1. 심야 배지 확보 (있으면 잠시 분리)
  const badge = variant.findOne(n => n.type === 'FRAME' && n.findOne && n.findOne(t => t.type === 'TEXT' && t.characters === '심야'))

  // 2. 관·포맷 텍스트 삭제 (예: "2관 2D(자막)") — /\d관/ 패턴
  const hallTexts = variant.findAll(n => n.type === 'TEXT' && /\d관/.test(n.characters))
  for (const h of hallTexts) {
    const parent = h.parent
    h.remove()
    // hall-row 래퍼가 비었거나 배지만 남았으면 정리
    if (parent !== variant && parent.type === 'FRAME') {
      if (parent.children.length === 0) parent.remove()
      else if (badge && parent.children.length === 1 && parent.children[0] === badge) {
        variant.appendChild(badge) // 배지 구출 후 래퍼 제거
        parent.remove()
      }
    }
  }

  // 3. 배지 → 시간 줄 인라인
  if (badge && badge.parent) {
    const timeText = variant.findAll(n => n.type === 'TEXT').find(t => /^\d{1,2}:\d{2}$/.test(t.characters.trim()))
    if (timeText && timeText.parent === variant) {
      const row = figma.createFrame()
      row.name = 'time-row'
      row.layoutMode = 'HORIZONTAL'
      row.counterAxisAlignItems = 'CENTER'
      row.primaryAxisAlignItems = 'SPACE_BETWEEN'
      row.fills = []
      const idx = variant.children.indexOf(timeText)
      variant.insertChild(idx, row)
      row.appendChild(timeText)
      row.appendChild(badge)
      row.layoutSizingHorizontal = 'FILL'
      row.counterAxisSizingMode = 'AUTO'
    } else if (timeText && timeText.parent !== variant) {
      // 이미 time-row 구조면 배지만 편입
      timeText.parent.appendChild(badge)
      timeText.parent.primaryAxisAlignItems = 'SPACE_BETWEEN'
    }
  }
  log.push(`${variant.name.replace('State=', '')}: ${Math.round(variant.height)}px`)
}

console.log('3줄 압축 완료 — variant 높이: ' + log.join(' / '))
