// rebuild-insta-row — 인스타 카드(검정 액자) → 일반 큐레이션 행 문법으로 강등 (Scripter용)
//
// insta-card / theme-hero / insta-hero 를 갈아엎고:
//   sec-title: "자려고 누웠는데 특별 상영전" + 우측 '인스타 게시물 보기 ›' 플랫 링크
//   poster-row: 맨 앞 카드뉴스 이미지(포스터 비율) + PosterItem 인스턴스들
//
// 실행: Scripter 붙여넣고 Run.

const report = []
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

let tobe = null, mobile = null, pc = null, posterMaster = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      tobe = sec; figma.currentPage = page
      mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
      pc = sec.children.find(n => n.name === 'TOBE · PC')
    }
  }
  walk(page, n => {
    if (n.type === 'COMPONENT_SET' && n.name === '2.0/PosterItem') {
      posterMaster = n.children.find(v => v.name === 'Selected=False') || n.children[0]
    }
  })
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
const C = { ink:{r:0x0C/255,g:0x0A/255,b:0x08/255}, t600:{r:0x72/255,g:0x6B/255,b:0x65/255},
  grey:{r:0x4A/255,g:0x45/255,b:0x40/255} }

async function rebuild(root, isPC) {
  const old = findAll(root, n => ['insta-card','theme-hero','insta-hero','insta-wrap'].includes(n.name))
    .sort((a, b) => b.width * b.height - a.width * a.height)[0]   // 가장 큰 매칭(래퍼 우선)
  if (!old) return false
  const parent = old.parent
  const idx = parent.children.indexOf(old)
  const posterW = isPC ? 176 : 128

  // sec-title (타이틀 + 우측 플랫 링크)
  const st = figma.createFrame()
  st.name = 'sec-title'
  st.layoutMode = 'HORIZONTAL'
  st.primaryAxisAlignItems = 'SPACE_BETWEEN'; st.counterAxisAlignItems = 'CENTER'
  st.paddingTop = 40; st.paddingBottom = 12; st.paddingLeft = isPC ? 24 : 16; st.paddingRight = isPC ? 24 : 16
  st.fills = []
  st.primaryAxisSizingMode = 'AUTO'; st.counterAxisSizingMode = 'AUTO'
  st.appendChild(await mkStyledText('자려고 누웠는데 특별 상영전', '2.0/display/h2', C.ink))
  st.appendChild(await mkStyledText('인스타 게시물 보기 ›', '2.0/meta', C.t600))

  // poster-row: 맨 앞 카드뉴스 이미지 + PosterItem들
  const row = figma.createFrame()
  row.name = 'poster-row'
  row.layoutMode = 'HORIZONTAL'; row.itemSpacing = isPC ? 16 : 12
  row.paddingTop = 8; row.paddingBottom = 16; row.paddingLeft = isPC ? 24 : 16; row.paddingRight = 0
  row.fills = []
  row.clipsContent = true
  row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO'

  // 카드뉴스 이미지 아이템 (포스터 비율 크롭 자리)
  const cn = figma.createFrame()
  cn.name = 'cardnews-item'
  cn.resize(posterW, Math.round(posterW * 1.5))
  cn.cornerRadius = 2
  cn.fills = [{ type:'SOLID', color: C.grey }]
  cn.layoutMode = 'HORIZONTAL'
  cn.primaryAxisAlignItems = 'CENTER'; cn.counterAxisAlignItems = 'CENTER'
  cn.primaryAxisSizingMode = 'FIXED'; cn.counterAxisSizingMode = 'FIXED'
  cn.appendChild(await mkStyledText('카드뉴스\n이미지', '2.0/caption', { r:1, g:1, b:1 }, 0.5))
  row.appendChild(cn)

  const N = isPC ? 6 : 3
  for (let i = 0; i < N; i++) {
    if (!posterMaster) break
    const inst = posterMaster.createInstance()
    row.appendChild(inst)
  }

  parent.insertChild(idx, st)
  parent.insertChild(idx + 1, row)
  try { st.layoutSizingHorizontal = 'FILL' } catch (e) {}
  try {
    if (isPC) {
      // PC: 다른 행처럼 오른쪽 블리드 폭 승계
      const sibling = findAll(root, n => n.name === 'row' && n !== row && n.layoutSizingHorizontal === 'FIXED')[0]
      if (sibling) { row.layoutSizingHorizontal = 'FIXED'; row.resize(sibling.width, row.height) }
      else row.layoutSizingHorizontal = 'FILL'
    } else row.layoutSizingHorizontal = 'FILL'
  } catch (e) {}
  old.remove()
  return true
}
{
  if (mobile && await rebuild(mobile, false)) report.push('모바일 — 인스타 섹션 행 문법으로')
  if (pc && await rebuild(pc, true)) report.push('PC — 인스타 섹션 행 문법으로')
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'rebuild-insta-row 결과\n' + (report.length ? report.join('\n') : '대상 못 찾음')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 1800
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('인스타 섹션 행 문법 전환 완료')
