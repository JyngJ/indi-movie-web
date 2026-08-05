// rebuild-banner-insta — 배너·인스타 카드를 배포판 실제 구조로 재구성 (Scripter용)
//
// 코드 팩트 기준:
//   배너 = bannerUrl 이미지 21:4 그대로 (텍스트 오버레이 없음 — 이미지에 인쇄).
//          PC는 662 고정 중앙 + 양옆 raised 띠. 스크림·오버레이 제거.
//   인스타 카드 = 검정 카드. 좌측 카드뉴스 이미지(PC 480 고정, 우측 페이드) +
//          우측 관련 포스터 스트립. 클릭 → 인스타 게시물.
//          + 제안: 우상단 인스타 아이콘 (어디로 가는 카드인지 어포던스)
//   영화제 상태(D-3)는 부제 삭제로 갈 곳 없음 → 타이틀 행 우측 캡션 'D-3 · 강릉 ›'
//
// 실행: Scripter 붙여넣고 Run.

const report = []
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

let tobe = null, mobile = null, pc = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      tobe = sec; figma.currentPage = page
      mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
      pc = sec.children.find(n => n.name === 'TOBE · PC')
    }
  }
}
if (!tobe) { figma.notify('TOBE 섹션 없음'); throw new Error('no section') }

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

// 이미지 자리 박스 (라벨 포함)
async function imgPlaceholder(w, h, label) {
  const f = figma.createFrame()
  f.name = 'img-placeholder'
  f.resize(w, h)
  f.fills = [{ type:'SOLID', color: GREY }]
  f.layoutMode = 'HORIZONTAL'
  f.primaryAxisAlignItems = 'CENTER'; f.counterAxisAlignItems = 'CENTER'
  f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED'
  const t = await mkStyledText(label, '2.0/caption', WHITE, 0.5)
  f.appendChild(t)
  return f
}

// ── 1. 영화제 배너 — 21:4 이미지 그대로 ──
async function rebuildBanner(root, isPC) {
  const old = findAll(root, n => n.name === 'festival-banner')[0]
  if (!old) return false
  const parent = old.parent
  const idx = parent.children.indexOf(old)
  let node
  if (isPC) {
    // raised 띠(FILL) 안에 662 고정 중앙
    const strip = figma.createFrame()
    strip.name = 'festival-banner'
    strip.layoutMode = 'HORIZONTAL'
    strip.primaryAxisAlignItems = 'CENTER'; strip.counterAxisAlignItems = 'CENTER'
    strip.fills = [{ type:'SOLID', color:{ r:0xEA/255, g:0xE5/255, b:0xE1/255 } }]
    strip.primaryAxisSizingMode = 'AUTO'; strip.counterAxisSizingMode = 'AUTO'
    strip.appendChild(await imgPlaceholder(662, Math.round(662 * 4 / 21), '배너 이미지 (21:4 · bannerUrl)'))
    node = strip
  } else {
    node = await imgPlaceholder(old.width, Math.round(old.width * 4 / 21), '배너 이미지 (21:4 · bannerUrl)')
    node.name = 'festival-banner'
  }
  parent.insertChild(idx, node)
  try { node.layoutSizingHorizontal = isPC ? 'FILL' : old.layoutSizingHorizontal } catch (e) {}
  old.remove()
  return true
}
{
  if (mobile && await rebuildBanner(mobile, false)) report.push('모바일 배너 — 21:4 이미지 자리 (오버레이 제거)')
  if (pc && await rebuildBanner(pc, true)) report.push('PC 배너 — raised 띠 + 662 중앙 (오버레이 제거)')
}

// ── 1b. 영화제 상태 캡션 — 배너 직전 sec-title 우측에 'D-3 · 강릉 ›' ──
{
  for (const [root, label] of [[mobile, '모바일'], [pc, 'PC']]) {
    if (!root) continue
    try {
      const st = findAll(root, n => n.name === 'sec-title' &&
        findAll(n, x => x.type === 'TEXT' && x.characters.includes('주목할 영화제')).length > 0)[0]
      if (!st) continue
      if (findAll(st, x => x.type === 'TEXT' && x.characters.includes('D-3')).length) continue   // 이미 있음
      const cap = await mkStyledText('D-3 · 강릉 ›', '2.0/meta', { r:0x72/255, g:0x6B/255, b:0x65/255 })
      cap.name = 'status-cap'
      if (st.layoutMode === 'HORIZONTAL') {
        st.appendChild(cap)
        st.primaryAxisAlignItems = 'SPACE_BETWEEN'; st.counterAxisAlignItems = 'CENTER'
      } else {
        st.layoutMode = 'HORIZONTAL'
        st.primaryAxisAlignItems = 'SPACE_BETWEEN'; st.counterAxisAlignItems = 'CENTER'
        st.appendChild(cap)
        try { st.layoutSizingHorizontal = 'FILL' } catch (e) {}
      }
      report.push(`${label} 영화제 상태 캡션 부착`)
    } catch (e) { report.push('✗ 상태 캡션: ' + String(e).slice(0, 50)) }
  }
}

// ── 2. 인스타 카드 재구성 ──
let instaIcon = null
walk(figma.root, n => { if (!instaIcon && n.type === 'COMPONENT' && n.name === '2.0/icon/instagram') instaIcon = n })

async function rebuildInsta(old, isPC) {
  const parent = old.parent
  const idx = parent.children.indexOf(old)
  const w = old.width
  const h = isPC ? 260 : Math.round(w / 2)     // PC 고정 260, 모바일 2:1

  const card = figma.createFrame()
  card.name = 'insta-card'
  card.resize(w, h)
  card.cornerRadius = 12
  card.clipsContent = true
  card.fills = [{ type:'SOLID', color:{ r:0, g:0, b:0 } }]

  // 좌측 카드뉴스 이미지 — 우측으로 페이드 (마스크 표현: 회색→검정 그라디언트)
  const imgW = isPC ? 480 : Math.round(w * 0.75)
  const img = figma.createRectangle()
  img.name = 'cardnews-img'
  img.resize(imgW, h)
  img.fills = [{ type:'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0,    color: { ...GREY, a: 1 } },
      { position: 0.72, color: { ...GREY, a: 1 } },
      { position: 1,    color: { r:0, g:0, b:0, a: 1 } },
    ] }]
  card.appendChild(img)
  img.x = 0; img.y = 0

  // 카드뉴스 라벨 (실물에선 이미지 안 글자)
  const lbl = await mkStyledText('카드뉴스 이미지\n(자려고 누웠는데 특별 상영전)', '2.0/caption', WHITE, 0.5)
  card.appendChild(lbl)
  lbl.x = 20; lbl.y = h - lbl.height - 16

  // 우측 포스터 스트립
  const stripX = isPC ? imgW + 24 : Math.round(w * 0.55)
  const pH = Math.round(h * 0.76)
  const pW = Math.round(pH * 2 / 3)
  let px = stripX
  while (px < w - 8) {
    const p = figma.createRectangle()
    p.resize(pW, pH)
    p.cornerRadius = 2
    p.fills = [{ type:'SOLID', color:{ r:0x2B/255, g:0x26/255, b:0x22/255 } }]
    card.appendChild(p)
    p.x = px; p.y = Math.round((h - pH) / 2)
    px += pW + 10
  }

  // 우상단 인스타 아이콘 — 어디로 가는 카드인지 (제안)
  if (instaIcon) {
    const ic = instaIcon.createInstance()
    card.appendChild(ic)
    ic.rescale(18 / ic.width)
    ic.x = w - ic.width - 14; ic.y = 14
    // 글리프 흰색으로
    walk(ic, n => { if (n.type === 'VECTOR') n.fills = [{ type:'SOLID', color: WHITE }] })
    ic.opacity = 0.8
  }

  parent.insertChild(idx, card)
  try { card.layoutSizingHorizontal = old.layoutSizingHorizontal } catch (e) {}
  old.remove()
  return true
}
{
  if (mobile) {
    const oldM = findAll(mobile, n => n.name === 'theme-hero' || n.name === 'insta-card')[0]
    if (oldM && oldM.name === 'theme-hero' && await rebuildInsta(oldM, false)) report.push('모바일 인스타 카드 재구성')
  }
  if (pc) {
    const oldP = findAll(pc, n => n.name === 'insta-hero' || n.name === 'theme-hero')[0]
    if (oldP && await rebuildInsta(oldP, true)) report.push('PC 인스타 카드 재구성')
  }
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'rebuild-banner-insta 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 1600
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('배너·인스타 카드 재구성 완료')
