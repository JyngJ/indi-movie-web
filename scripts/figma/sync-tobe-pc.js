// TOBE · PC docked — 확정된 expanded를 패널로 이식 (Scripter용)
// 'TheaterSheet TOBE (grayscale)' 섹션에서:
//   1. 'TOBE · Mobile expanded' 프레임을 복제
//   2. 'ASIS · PC docked'의 panel 자리에 교체 (폭 440)
//   3. 프레임명 'TOBE · PC docked'로 변경

const SECTION_NAME = 'TheaterSheet TOBE (grayscale)'
const PANEL_W = 440 // 거터 24×2 + 포스터 120×3 + gap 16×2 = 440 (콘텐츠 유도값)

for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch (e) {}
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

const section = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === SECTION_NAME)
if (!section) throw new Error('TOBE 섹션 못 찾음')

const expanded = section.findOne(n => n.type === 'FRAME' && n.name === 'TOBE · Mobile expanded')
if (!expanded) throw new Error("'TOBE · Mobile expanded' 프레임 못 찾음 — 프레임 이름 확인")

const pc = section.findOne(n => n.type === 'FRAME' && (n.name === 'ASIS · PC docked' || n.name === 'TOBE · PC docked'))
if (!pc) throw new Error('PC docked 프레임 못 찾음')

const log = []

// 기존 panel 교체
const oldPanel = pc.children.find(n => n.name === 'panel' || n.name.includes('panel'))
const clone = expanded.clone()
clone.name = 'panel (expanded 이식)'
if (oldPanel) {
  const idx = pc.children.indexOf(oldPanel)
  pc.insertChild(idx, clone)
  oldPanel.remove()
  log.push('기존 panel 교체')
} else {
  pc.insertChild(1, clone) // rail 다음
  log.push('panel 삽입 (기존 못 찾아 rail 뒤에)')
}
// 폭 440 고정, 세로는 PC 프레임 높이 채움
clone.counterAxisSizingMode = 'FIXED'
clone.resize(PANEL_W, clone.height)
clone.topLeftRadius = clone.topRightRadius = 0 // 도킹 패널은 시트 라운드 불필요
if (pc.layoutMode !== 'NONE') clone.layoutSizingVertical = 'FILL'
log.push(`panel 폭 ${PANEL_W} (포스터 3열 유도값)`)

// 패널 안 요소들 FILL 유지 확인 — 자식 중 FIXED 폭(402)인 것들 FILL로
for (const child of clone.children) {
  if ('layoutSizingHorizontal' in child) {
    try { child.layoutSizingHorizontal = 'FILL' } catch (e) {}
  }
}
log.push('패널 자식 가로 FILL 통일')

pc.name = 'TOBE · PC docked'

// 리포트
const oldRep = section.findOne(n => n.type === 'TEXT' && n.name === 'PC 이식 리포트')
if (oldRep) oldRep.remove()
const rep = figma.createText()
rep.name = 'PC 이식 리포트'
rep.fontName = { family: 'Inter', style: 'Regular' }
rep.characters = '[PC 이식]\n' + log.join('\n') + '\n확인 항목: 포스터 3열 노출 / 시간표 3열 / 거터 24 유지'
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.04, b: 0.03 } }]
section.appendChild(rep)
rep.x = pc.x; rep.y = pc.y - rep.height - 24
