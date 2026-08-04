// Color 섹션: 컬러 적용된 expanded를 PC 패널로 이식 + 레일 활성 탭 인디고 (Scripter용)

const SECTION_ID = '56:2709' // TheaterSheet TOBE (Color)
const PANEL_W = 440
const PRI700 = { r: 0x40 / 255, g: 0x4E / 255, b: 0x81 / 255 }

for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch (e) {}
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('Color 섹션 못 찾음')
const expanded = section.findOne(n => n.type === 'FRAME' && n.name === 'TOBE · Mobile expanded')
const pc = section.findOne(n => n.type === 'FRAME' && n.name.includes('PC docked'))
if (!expanded || !pc) throw new Error('expanded 또는 PC 프레임 못 찾음')

const log = []

// ── 1. 패널 교체 (컬러 expanded 복제) ──
const oldPanel = pc.children.find(n => n.name.includes('panel'))
const clone = expanded.clone()
clone.name = 'panel (color expanded 이식)'
if (oldPanel) {
  const idx = pc.children.indexOf(oldPanel)
  pc.insertChild(idx, clone)
  oldPanel.remove()
} else {
  pc.insertChild(1, clone)
}
clone.counterAxisSizingMode = 'FIXED'
clone.resize(PANEL_W, clone.height)
clone.topLeftRadius = clone.topRightRadius = 0
if (pc.layoutMode !== 'NONE') clone.layoutSizingVertical = 'FILL'
for (const child of clone.children) {
  if ('layoutSizingHorizontal' in child) {
    try { child.layoutSizingHorizontal = 'FILL' } catch (e) {}
  }
}
// 도킹 패널이므로 시트 그림자 → md로 교체
const fx = await figma.getLocalEffectStylesAsync()
const md = fx.find(s => s.name === '2.0/shadow/md')
if (md) { await clone.setEffectStyleIdAsync(md.id); log.push('패널 그림자 md') }
log.push(`컬러 expanded 이식 (폭 ${PANEL_W})`)

// ── 2. 레일 활성 탭 인디고 ──
const rail = pc.children.find(n => n.name === 'rail')
if (rail) {
  // 활성 탭 = 배경 있는 아이템 (지도) — 그 안 아이콘·라벨을 primary/700로
  let done = false
  for (const item of rail.children) {
    if (item.type !== 'FRAME' || !item.children) continue
    const label = item.findOne(n => n.type === 'TEXT' && n.characters === '지도')
    if (!label) continue
    const f = label.fontName
    if (f !== figma.mixed) await figma.loadFontAsync(f)
    label.fills = [{ type: 'SOLID', color: PRI700 }]
    const iconRect = item.findOne(n => n.type === 'RECTANGLE')
    if (iconRect) iconRect.fills = [{ type: 'SOLID', color: PRI700 }]
    done = true
  }
  log.push(done ? '레일 활성 탭(지도) 인디고' : '⚠ 레일 지도 탭 못 찾음')
}

// 리포트
const oldRep = section.findOne(n => n.type === 'TEXT' && n.name === 'PC 컬러 리포트')
if (oldRep) oldRep.remove()
const rep = figma.createText()
rep.name = 'PC 컬러 리포트'
rep.fontName = { family: 'Inter', style: 'Regular' }
rep.characters = '[PC 컬러 이식]\n' + log.join('\n')
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.04, b: 0.03 } }]
section.appendChild(rep)
rep.x = pc.x; rep.y = pc.y - rep.height - 24
