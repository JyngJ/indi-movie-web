// Elevation 아이소메트릭 다이어그램 (Scripter용)
// 기존 'Elevation Model' 단면도를 사선 투영 버전으로 교체.
// 투영: X = 0.866(x−y), Y = 0.5(x+y) − z  (2:1 아이소메트릭)

const SHADOW_FRAME = '42:1158'

const P = s => ({ family: 'Pretendard', style: s })
for (const s of ['Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' })

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const INK = hex('#0C0A08'), MID = hex('#8D8781'), PAPER = hex('#FAF9F8')
const WHITE = hex('#FFFFFF'), PLATE = hex('#EAE5E1'), PLATE_BD = hex('#C6BFB9'), LINE = hex('#404E81')

const shadowFrame = await figma.getNodeByIdAsync(SHADOW_FRAME)
const section = shadowFrame.parent
const old = section.findOne(n => n.name === 'Elevation Model')
if (old) old.remove()

const effectStyles = await figma.getLocalEffectStylesAsync()
const fxId = name => { const st = effectStyles.find(s => s.name === name); return st ? st.id : null }

const dia = figma.createFrame()
dia.name = 'Elevation Model'
dia.resize(640, 480)
dia.fills = [{ type: 'SOLID', color: PAPER }]
dia.cornerRadius = 16
dia.clipsContent = true
section.appendChild(dia)
dia.x = shadowFrame.x + shadowFrame.width + 60
dia.y = shadowFrame.y

const title = figma.createText()
title.fontName = { family: 'KIMM_Bold', style: 'B' }
title.characters = 'Elevation'
title.fontSize = 20
title.letterSpacing = { unit: 'PERCENT', value: 5 }
title.fills = [{ type: 'SOLID', color: INK }]
dia.appendChild(title)
title.x = 24; title.y = 20

// 원점(아이소 좌표계 기준점)
const OX = 300, OY = 170
const isoX = (x, y) => OX + 0.866 * (x - y)
const isoY = (x, y, z) => OY + 0.5 * (x + y) - z

// 아이소 평면 사각형 생성: 로컬 (lx,ly) 위치, w×h, 고도 z
const isoRect = (lx, ly, w, h, z, fill, radius = 4) => {
  const r = figma.createRectangle()
  r.resize(w, h)
  r.cornerRadius = radius
  r.fills = [{ type: 'SOLID', color: fill }]
  dia.appendChild(r)
  r.relativeTransform = [
    [0.866, -0.866, isoX(lx, ly)],
    [0.5, 0.5, isoY(lx, ly, z)],
  ]
  return r
}
// 수직 기준선: 로컬 코너 (lx,ly)에서 고도 z까지 (위아래 20px 오버슛)
const vline = (lx, ly, z) => {
  const l = figma.createLine()
  dia.appendChild(l)
  l.resize(z + 40, 0)
  l.rotation = 90
  l.x = isoX(lx, ly)
  l.y = isoY(lx, ly, 0) + 20
  l.strokes = [{ type: 'SOLID', color: LINE, }]
  l.strokeWeight = 1.5
  l.opacity = 0.75
  return l
}
const label = (chars, x, y, strong) => {
  const t = figma.createText()
  t.fontName = P(strong ? 'Medium' : 'Regular')
  t.characters = chars
  t.fontSize = 11
  t.fills = [{ type: 'SOLID', color: strong ? INK : MID }]
  dia.appendChild(t)
  t.x = x; t.y = y
  return t
}

// ── E0: 페이지 베이스 플레이트 ──
const base = isoRect(-15, -15, 230, 310, 0, PLATE, 6)
base.strokes = [{ type: 'SOLID', color: PLATE_BD }]
base.strokeWeight = 1

// ── E1: 카드 그리드 (sm) — z=45 ──
const smId = fxId('2.0/shadow/sm')
for (const [lx, ly] of [[15, 95], [115, 95], [15, 195], [115, 195]]) {
  const c = isoRect(lx, ly, 85, 90, 45, WHITE, 6)
  if (smId) await c.setEffectStyleIdAsync(smId)
}

// ── E2: 상단 바 (md) — z=95 ──
const bar = isoRect(0, 0, 200, 70, 95, WHITE, 6)
const mdId = fxId('2.0/shadow/md')
if (mdId) await bar.setEffectStyleIdAsync(mdId)

// ── E3: 모달 (lg) — z=155 ──
const modal = isoRect(50, 110, 120, 100, 155, WHITE, 8)
const lgId = fxId('2.0/shadow/lg')
if (lgId) await modal.setEffectStyleIdAsync(lgId)

// ── 수직 기준선 (사진의 보라 선 역할) ──
vline(0, 0, 95)        // E2 좌상단 코너
vline(200, 0, 95)      // E2 우상단 코너
vline(50, 110, 155)    // E3 좌상단
vline(170, 210, 155)   // E3 우하단
vline(15, 285, 45)     // E1 좌하단 카드

// ── 라벨 ──
label('E3 · lg — 모달·다이얼로그', 24, 100, true)
label('E2 · md — FAB·드롭다운·팝업', 24, 130, true)
label('E1 · sm — 카드·버튼 hover', 24, 160, true)
label('E0 · 페이지 — 그림자 없음', 24, 190, false)
label('sheet: 하단 고정 면 — offset 0 ambient (별도)', 24, 440, false)

console.log('아이소메트릭 Elevation 다이어그램 완료')
