// fix-hero-banner — 인스타 히어로 배경 이미지 + 영화제 배너 21:4 수정 (Scripter용)
//
// 1. theme-hero(모바일)·insta-hero(PC): 형태 유지, 배경에 카드뉴스 이미지 자리 추가
//    — 오른쪽에서 이미지가 배어나오고 왼쪽은 잉크가 덮는 스크림 (배포판 페이드 문법)
// 2. festival-banner: 스크림·텍스트 오버레이 제거 → bannerUrl 이미지 21:4 그대로
//    (PC는 raised 띠 + 662 중앙). 상태(D-3·지역)는 타이틀 행 우측 캡션으로.
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
const INK = { r:0x0C/255, g:0x0A/255, b:0x08/255 }
const GREY = { r:0x4A/255, g:0x45/255, b:0x40/255 }

// ── 1. 히어로 배경 이미지 ──
async function addHeroBg(hero) {
  if (findAll(hero, n => n.name === 'cardnews-bg').length) return false   // 이미 있음
  hero.clipsContent = true
  const w = hero.width, h = hero.height
  const bg = figma.createRectangle()
  bg.name = 'cardnews-bg'
  bg.resize(Math.round(w * 0.62), h)
  // 오른쪽 = 이미지(회색 자리), 왼쪽으로 갈수록 잉크가 덮음 — 배포판 페이드
  bg.fills = [{ type:'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0,    color: { ...INK, a: 1 } },
      { position: 0.45, color: { ...INK, a: 0.35 } },
      { position: 1,    color: { ...GREY, a: 1 } },
    ] }]
  hero.appendChild(bg)
  bg.layoutPositioning = 'ABSOLUTE'
  bg.x = w - bg.width; bg.y = 0
  bg.constraints = { horizontal: 'MAX', vertical: 'STRETCH' }
  hero.insertChild(0, bg)   // 콘텐츠 뒤로

  const lbl = await mkStyledText('카드뉴스 이미지 자리', '2.0/caption', { r:1, g:1, b:1 }, 0.4)
  hero.appendChild(lbl)
  lbl.layoutPositioning = 'ABSOLUTE'
  lbl.x = w - lbl.width - 16; lbl.y = 12
  lbl.constraints = { horizontal: 'MAX', vertical: 'MIN' }
  return true
}
{
  const mh = mobile && findAll(mobile, n => n.name === 'theme-hero')[0]
  if (mh && await addHeroBg(mh)) report.push('모바일 히어로 — 배경 이미지 자리 + 잉크 스크림')
  const ph = pc && findAll(pc, n => n.name === 'insta-hero')[0]
  if (ph && await addHeroBg(ph)) report.push('PC 히어로 — 배경 이미지 자리 + 잉크 스크림')
}

// ── 2. 영화제 배너 21:4 ──
async function imgPlaceholder(w, h, label) {
  const f = figma.createFrame()
  f.name = 'img-placeholder'
  f.resize(w, h)
  f.fills = [{ type:'SOLID', color:{ r:0xC6/255, g:0xBF/255, b:0xB9/255 } }]
  f.layoutMode = 'HORIZONTAL'
  f.primaryAxisAlignItems = 'CENTER'; f.counterAxisAlignItems = 'CENTER'
  f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED'
  f.appendChild(await mkStyledText(label, '2.0/caption', { r:1, g:1, b:1 }, 0.6))
  return f
}
async function fixBanner(root, isPC) {
  const old = findAll(root, n => n.name === 'festival-banner')[0]
  if (!old) return false
  if (findAll(old, n => n.name === 'img-placeholder').length) return false   // 이미 처리됨
  const parent = old.parent
  const idx = parent.children.indexOf(old)
  let node
  if (isPC) {
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

  // 상태 캡션 — '주목할 영화제' 타이틀 행 우측
  const st = findAll(root, n => n.name === 'sec-title' &&
    findAll(n, x => x.type === 'TEXT' && x.characters.includes('주목할 영화제')).length > 0)[0]
  if (st && !findAll(st, x => x.type === 'TEXT' && x.characters.includes('D-3')).length) {
    const cap = await mkStyledText('D-3 · 강릉 ›', '2.0/meta', { r:0x72/255, g:0x6B/255, b:0x65/255 })
    if (st.layoutMode !== 'HORIZONTAL') st.layoutMode = 'HORIZONTAL'
    st.primaryAxisAlignItems = 'SPACE_BETWEEN'; st.counterAxisAlignItems = 'CENTER'
    st.appendChild(cap)
    try { st.layoutSizingHorizontal = 'FILL' } catch (e) {}
  }
  return true
}
{
  if (mobile && await fixBanner(mobile, false)) report.push('모바일 배너 — 21:4 이미지 (오버레이 제거)')
  if (pc && await fixBanner(pc, true)) report.push('PC 배너 — raised 띠 + 662 중앙')
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'fix-hero-banner 결과\n' + (report.length ? report.join('\n') : '변경 없음 (이미 처리됨?)')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 2000
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('히어로 배경·배너 수정 완료')
