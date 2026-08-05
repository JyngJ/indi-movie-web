// sync-hero-code — 인스타 히어로를 코드 현재 구현대로 피그마에 재구성 (Scripter용)
//
// 코드 스펙 (InstagramRecsSection):
//   검정 카드 r12 · 이미지 좌 62% + 우측 검정 페이드(52%→100%)
//   전면 스크림 115° (0.78 → 0.5@40% → 0.35) · 좌상단 아이브로+KIMM 타이틀(흰)
//   포스터 스트립: PC left 320·세로중앙 h76% · 모바일 top38%~bottom14 left16
//   ‹›는 hover 전용이라 정적 화면엔 없음 · 모바일 4:3 · PC 높이 260
// 대상: FilmsTab TOBE (grayscale)·(Color) 각각의 theme-hero / insta-hero(insta-wrap)
//
// 실행: Scripter 붙여넣고 Run.

const report = []
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

const textStyles = {}
for (const s of await figma.getLocalTextStylesAsync()) textStyles[s.name] = s
const mkStyledText = async (chars, styleName, colorRgb, opacity) => {
  const t = figma.createText()
  const st = textStyles[styleName]
  if (st) { await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id) }
  else await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
  t.characters = chars
  if (colorRgb) t.fills = [{ type:'SOLID', color: colorRgb }]
  if (opacity != null) t.opacity = opacity
  return t
}
const GREY = { r:0x4A/255, g:0x45/255, b:0x40/255 }
const WHITE = { r:1, g:1, b:1 }
const N400 = { r:0xA7/255, g:0xA1/255, b:0x9A/255 }

async function rebuild(old, isPC) {
  const parent = old.parent
  const idx = parent.children.indexOf(old)
  const w = old.width
  const h = isPC ? 260 : Math.round(w * 3 / 4)

  const card = figma.createFrame()
  card.name = isPC ? 'insta-hero' : 'theme-hero'
  card.resize(w, h)
  card.cornerRadius = 12
  card.clipsContent = true
  card.fills = [{ type:'SOLID', color:{ r:0, g:0, b:0 } }]

  // 이미지 자리 — 좌 62%, 우측으로 검정 페이드
  const img = figma.createRectangle()
  img.name = 'cardnews-img'
  img.resize(Math.round(w * 0.62), h)
  img.fills = [{ type:'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0,    color: { ...GREY, a: 1 } },
      { position: 0.52, color: { ...GREY, a: 1 } },
      { position: 1,    color: { r:0, g:0, b:0, a: 1 } },
    ] }]
  card.appendChild(img)
  img.x = 0; img.y = 0

  // 전면 스크림 115° — 0.78 → 0.5 → 0.35
  const scrim = figma.createRectangle()
  scrim.name = 'scrim'
  scrim.resize(w, h)
  scrim.fills = [{ type:'GRADIENT_LINEAR',
    gradientTransform: [[0.9, 0.42, 0], [-0.42, 0.9, 0]],   // ≈115°
    gradientStops: [
      { position: 0,   color: { r:0, g:0, b:0, a: 0.78 } },
      { position: 0.4, color: { r:0, g:0, b:0, a: 0.5 } },
      { position: 1,   color: { r:0, g:0, b:0, a: 0.35 } },
    ] }]
  card.appendChild(scrim)
  scrim.x = 0; scrim.y = 0

  // 좌상단 텍스트
  const stack = figma.createFrame()
  stack.name = 'texts'
  stack.layoutMode = 'VERTICAL'; stack.itemSpacing = 8; stack.fills = []
  stack.primaryAxisSizingMode = 'AUTO'; stack.counterAxisSizingMode = 'AUTO'
  stack.appendChild(await mkStyledText('영화 소식을 소개할지도', '2.0/caption', N400))
  stack.appendChild(await mkStyledText('자려고 누웠는데 특별 상영전', '2.0/display/h2', WHITE))
  card.appendChild(stack)
  stack.x = isPC ? 24 : 16; stack.y = isPC ? 24 : 16

  // 포스터 스트립
  const pH = Math.round(h * 0.76)
  const pW = Math.round(pH * 2 / 3)
  let px = isPC ? 320 : 16
  const py = isPC ? Math.round((h - pH) / 2) : Math.round(h * 0.38)
  const stripH = isPC ? pH : (h - 14 - py)
  const spW = isPC ? pW : Math.round(stripH * 2 / 3)
  while (px < w - 8) {
    const p = figma.createRectangle()
    p.resize(spW, stripH)
    p.cornerRadius = 8
    p.fills = [{ type:'SOLID', color:{ r:0x2B/255, g:0x26/255, b:0x22/255 } }]
    card.appendChild(p)
    p.x = px; p.y = py
    px += spW + 8
  }

  parent.insertChild(idx, card)
  try { card.layoutSizingHorizontal = old.layoutSizingHorizontal } catch (e) {}
  old.remove()
  return true
}

for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type !== 'SECTION' || !sec.name.startsWith('FilmsTab TOBE')) continue
    const mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
    const pc = sec.children.find(n => n.name === 'TOBE · PC')
    figma.currentPage = page
    if (mobile) {
      const oldM = findAll(mobile, n => ['theme-hero', 'insta-card'].includes(n.name))[0]
      if (oldM && await rebuild(oldM, false)) report.push(`${sec.name} 모바일 히어로 재구성`)
    }
    if (pc) {
      const oldP = findAll(pc, n => ['insta-hero', 'theme-hero', 'insta-card'].includes(n.name))[0]
      if (oldP && await rebuild(oldP, true)) report.push(`${sec.name} PC 히어로 재구성`)
    }
  }
}

await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'sync-hero-code 결과\n' + (report.length ? report.join('\n') : '대상 못 찾음')
figma.currentPage.appendChild(t)
t.x = figma.viewport.center.x; t.y = figma.viewport.center.y
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('히어로 코드 동기화 완료')
