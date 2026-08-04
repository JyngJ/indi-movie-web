// films-polish-2 — 특별전 헤더 플랫화 · 지금출발 캡션 복원 · 수상 SVG 배경 장식 (Scripter용)
//
// 1. 특별전 극장 헤더: 틴트 박스 + 솔리드 CTA(촌스러움) → 맨 종이 위 플랫 행
//    좌 [클래퍼보드+아트나인] 유지, 우 '영화관 보기 ›' 플랫 텍스트 링크
// 2. 지금 출발하면: PosterItem 캡션 2줄째(감독) → '오늘 18:20 · 극장명' (섹션 존재 이유 복원)
// 3. 수상 카드: '베니스 svg' 사자를 카드 배경 오른쪽 뒤에 — 저대비(7%)·회전(-10°)·클립
//    (칸 svg는 칸 황금종려 카드가 TOBE에 없어 보류 — 만들면 같은 문법으로)
//
// 실행: Scripter 붙여넣고 Run.

const report = []
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

let tobe = null, mobile = null, pc = null, lionSrc = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      tobe = sec; figma.currentPage = page
      mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
      pc = sec.children.find(n => n.name === 'TOBE · PC')
      lionSrc = sec.children.find(n => n.name === '베니스 svg')
    }
  }
}
if (!mobile) { figma.notify('TOBE · Mobile 없음'); throw new Error('no frame') }

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

// ── 1. 특별전 극장 헤더 플랫화 ──
{
  try {
    // 틴트 배경 + cta 자식을 가진 헤더 바 찾기
    const bar = findAll(mobile, n =>
      n.type === 'FRAME' && n.children?.some?.(c => c.name === 'cta') &&
      n.fills !== figma.mixed && n.fills.length > 0)[0]
    if (bar) {
      bar.fills = []                       // 틴트 박스 제거 → 맨 종이
      bar.paddingLeft = 0; bar.paddingRight = 0
      const cta = bar.children.find(c => c.name === 'cta')
      if (cta) {
        const idx = bar.children.indexOf(cta)
        const link = await mkStyledText('영화관 보기 ›', '2.0/body', { r:0x72/255, g:0x6B/255, b:0x65/255 })
        link.name = 'theater-link'
        bar.insertChild(idx, link)
        cta.remove()
      }
      report.push('특별전 헤더 — 틴트 박스·CTA 제거, 플랫 링크로')
    } else report.push('✗ 특별전 헤더 바 못 찾음')
  } catch (e) { report.push('✗ 특별전: ' + String(e).slice(0, 60)) }
}

// ── 2. 지금 출발하면 캡션 복원 ──
{
  try {
    // '지금 출발' 타이틀을 가진 그룹 찾기
    const group = findAll(mobile, n =>
      n.type === 'FRAME' &&
      findAll(n, x => x.type === 'TEXT' && x.characters.startsWith('지금 출발')).length > 0 &&
      findAll(n, x => x.type === 'INSTANCE' && x.name.includes('PosterItem')).length > 0)
      .sort((a, b) => a.width * a.height - b.width * b.height)[0]   // 가장 작은 매칭 = 해당 섹션 그룹
    if (group) {
      const caps = ['오늘 18:20 · 영화공간주안', '오늘 18:40 · 황성시네마', '오늘 19:10 · 아리랑시네센터']
      const items = findAll(group, x => x.type === 'INSTANCE' && x.name.includes('PosterItem'))
      let i = 0
      for (const item of items) {
        const texts = findAll(item, x => x.type === 'TEXT')
        const sub = texts[1]   // [제목, 보조] — 보조 줄을 시간·극장으로
        if (sub) {
          await figma.loadFontAsync(sub.fontName)
          sub.characters = caps[i % caps.length]
        }
        i++
      }
      report.push(`지금출발 캡션 ${i}개 — 시간·극장으로 교체`)
    } else report.push('✗ 지금출발 그룹 못 찾음')
  } catch (e) { report.push('✗ 지금출발: ' + String(e).slice(0, 60)) }
}

// ── 3. 수상 카드 SVG 배경 ──
async function decorate(card, src, targetH, opacity) {
  const deco = src.clone()
  deco.name = 'award-deco'
  card.clipsContent = true
  card.appendChild(deco)
  deco.layoutPositioning = 'ABSOLUTE'
  deco.rescale(targetH / deco.height)
  deco.rotation = -10
  deco.fills = [{ type:'SOLID', color:{r:0,g:0,b:0}, opacity }]
  // 우측으로 블리드 — 오른쪽 1/3쯤 잘리게
  deco.x = card.width - deco.width * 0.7
  deco.y = (card.height - deco.height) / 2
  // 콘텐츠 뒤로
  card.insertChild(0, deco)
}
{
  if (!lionSrc) report.push('✗ 베니스 svg 못 찾음')
  else {
    try {
      // 모바일: award-wrap (베니스 텍스트 포함)
      const mAward = findAll(mobile, n =>
        n.type === 'FRAME' && findAll(n, x => x.type === 'TEXT' && x.characters.includes('베니스')).length > 0 &&
        n.name === 'award-wrap')[0] ||
        findAll(mobile, n => n.name === 'award-wrap')[0]
      if (mAward) { await decorate(mAward, lionSrc, mAward.height * 1.5, 0.07); report.push('모바일 베니스 카드 — 사자 배경') }
      // PC: 베니스 텍스트 가진 award-card
      if (pc) {
        const pAward = findAll(pc, n =>
          (n.name === 'award-card' || n.name === 'award-wrap') &&
          findAll(n, x => x.type === 'TEXT' && x.characters.includes('베니스')).length > 0)[0]
        if (pAward) { await decorate(pAward, lionSrc, pAward.height * 1.4, 0.05); report.push('PC 베니스 카드 — 사자 배경') }
      }
    } catch (e) { report.push('✗ SVG 장식: ' + String(e).slice(0, 60)) }
  }
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'films-polish-2 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 1000
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('반영 완료')
