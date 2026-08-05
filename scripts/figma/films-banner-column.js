// films-banner-column — 영화제 배너 이미지형(텍스트 오버레이) + PC 컬럼 축소 (Scripter용)
//
// 1. festival-banner(모바일·PC): 회색 사각형 → 이미지 배너 골격
//    이미지 자리 + 좌측 스크림 그라디언트 + 좌하단 [D-3 · 기간 · 지역 / 영화제명] 오버레이
// 2. PC 컬럼 더 좁게: 콘텐츠 1000 중앙 (body pad 160), 스크롤 행 블리드 유지
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
const mkStyledText = async (chars, styleName, colorRgb) => {
  const t = figma.createText()
  const st = textStyles[styleName]
  if (st) { await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id) }
  else await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
  t.characters = chars
  if (colorRgb) t.fills = [{ type:'SOLID', color: colorRgb }]
  return t
}

// ── 1. 배너 이미지형으로 재구성 ──
async function rebuildBanner(root, h) {
  const old = findAll(root, n => n.name === 'festival-banner')[0]
  if (!old) return false
  const parent = old.parent
  const idx = parent.children.indexOf(old)
  const w = old.width

  const banner = figma.createFrame()
  banner.name = 'festival-banner'
  banner.resize(w, h)
  banner.cornerRadius = old.cornerRadius || 8
  banner.clipsContent = true
  // 이미지 자리(회색) + 좌→우 스크림: 텍스트 대비 확보 (이미지 뭐가 와도 읽히게)
  banner.fills = [
    { type:'SOLID', color:{ r:0xC6/255, g:0xBF/255, b:0xB9/255 } },   // 이미지 자리
    { type:'GRADIENT_LINEAR',
      gradientTransform: [[1, 0, 0], [0, 1, 0]],   // 좌 → 우
      gradientStops: [
        { position: 0,    color: { r:0, g:0, b:0, a:0.55 } },
        { position: 0.55, color: { r:0, g:0, b:0, a:0.15 } },
        { position: 1,    color: { r:0, g:0, b:0, a:0 } },
      ] },
  ]
  banner.layoutMode = 'VERTICAL'
  banner.primaryAxisAlignItems = 'MAX'      // 아래 정렬
  banner.paddingLeft = 20; banner.paddingBottom = 16; banner.paddingTop = 16; banner.paddingRight = 20
  banner.itemSpacing = 4
  banner.primaryAxisSizingMode = 'FIXED'; banner.counterAxisSizingMode = 'FIXED'

  const eyebrow = await mkStyledText('D-3 · 8. 7 – 8. 10 · 강릉', '2.0/caption', { r:1, g:1, b:1 })
  eyebrow.opacity = 0.85
  const title = await mkStyledText('정동진독립영화제', '2.0/display/h2', { r:1, g:1, b:1 })
  banner.appendChild(eyebrow)
  banner.appendChild(title)

  parent.insertChild(idx, banner)
  // 부모 오토레이아웃 내 사이징 승계
  try { banner.layoutSizingHorizontal = old.layoutSizingHorizontal } catch (e) {}
  old.remove()
  return true
}
{
  if (mobile && await rebuildBanner(mobile, 140)) report.push('모바일 배너 — 이미지형 + 오버레이')
  if (pc && await rebuildBanner(pc, 180)) report.push('PC 배너 — 이미지형 + 오버레이')
}

// ── 2. PC 컬럼 축소 — 콘텐츠 1000 중앙 ──
{
  try {
    if (pc) {
      const body = findAll(pc, n => n.name === 'body')[0]
      if (body) {
        const bodyW = pc.width - 72
        const PAD = Math.round((bodyW - 1048) / 2)   // 내부 24 패딩 포함 시각 콘텐츠 ≈1000
        body.paddingLeft = PAD; body.paddingRight = PAD
        body.clipsContent = true
        const bleedW = bodyW - PAD
        for (const child of body.children) {
          const isRow = child.name === 'row' || child.name === 'pr'
          if (isRow) {
            child.layoutSizingHorizontal = 'FIXED'
            child.resize(bleedW, child.height)
            child.clipsContent = true
            if ('paddingLeft' in child) { child.paddingLeft = 24; child.paddingRight = 0 }
          }
        }
        report.push(`PC 컬럼 — pad ${PAD} · 콘텐츠 ≈1000 중앙`)
      }
    }
  } catch (e) { report.push('✗ 컬럼: ' + String(e).slice(0, 60)) }
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'films-banner-column 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 1400
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('배너·컬럼 반영 완료')
