// polish-films-tobe-mobile — TOBE · Mobile "덜 만들어진" 느낌 일괄 정리 (Scripter용)
//
// 1. sec-title FILL 복원 + ‹› 원형 버튼(배포판 스펙)으로 — 우측 끝 정렬
// 2. 특별전 통합: 감독 카드 + 회색 상영작 블록 → 한 흐름
//    (아바타 40 inset + 이름/극장 캡션 + '감독 상세' 플랫 링크 + 맨포스터 행)
// 3. 영화제 배너·다크 히어로: 풀블리드 → 좌우 16 인셋 + 라운드 (종이 위 인쇄물)
// 4. 섹션 리듬 통일: sec-title pad-top 40 (첫 섹션 24), 타이틀-행 12
// 5. award-card: 보더 → shadow/sm
// 6. 탭바 활성(상영작) 틴트 확인
//
// 실행: Scripter 붙여넣고 Run. 재실행 안전.

const report = []
const TINT = { type:'SOLID', color:{ r:0x40/255, g:0x4E/255, b:0x81/255 }, opacity:0.11 }
const C = {
  bg:{r:0xFA/255,g:0xF9/255,b:0xF8/255}, line:{r:0xDD/255,g:0xD9/255,b:0xCF/255},
  t600:{r:0x72/255,g:0x6B/255,b:0x65/255}, t500:{r:0x8D/255,g:0x87/255,b:0x81/255},
  ink:{r:0x0C/255,g:0x0A/255,b:0x08/255}, t800:{r:0x2B/255,g:0x26/255,b:0x22/255},
}
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

for (const st of ['Regular','Medium','Bold']) await figma.loadFontAsync({ family:'Pretendard', style:st })
const effectStyles = await figma.getLocalEffectStylesAsync()
const smStyle = effectStyles.find(s => s.name === '2.0/shadow/sm')
const insetStyle = effectStyles.find(s => s.name === '2.0/shadow/inset')
const textStyles = {}
for (const s of await figma.getLocalTextStylesAsync()) textStyles[s.name] = s

let tobe = null, mobile = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      tobe = sec; figma.currentPage = page
      mobile = sec.children.find(n => n.name === 'TOBE · Mobile')
    }
  }
}
if (!mobile) { figma.notify('TOBE · Mobile 없음'); throw new Error('no frame') }

const mkText = async (chars, styleName, colorRgb) => {
  const t = figma.createText()
  const st = textStyles[styleName]
  if (st) { await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id) }
  t.characters = chars
  if (colorRgb) t.fills = [{ type:'SOLID', color: colorRgb }]
  return t
}

// ── 1. sec-title: FILL + 원형 넘김 버튼 (모바일 프레임 안 전부) ──
{
  const secTitles = findAll(mobile, n => n.type === 'FRAME' && n.name === 'sec-title')
  let fixed = 0
  for (const st of secTitles) {
    try {
      const p = st.parent
      if (p && 'layoutMode' in p && p.layoutMode !== 'NONE') st.layoutSizingHorizontal = 'FILL'
      const nav = st.children.find(c => c.name === 'nav')
      if (nav) {
        nav.itemSpacing = 8
        for (const child of [...nav.children]) {
          if (child.type === 'FRAME' && child.name === 'nav-btn') continue
          const idx = nav.children.indexOf(child)
          const btn = figma.createFrame()
          btn.name = 'nav-btn'; btn.resize(28, 28); btn.cornerRadius = 9999
          btn.fills = [{ type:'SOLID', color:C.bg }]
          btn.strokes = [{ type:'SOLID', color:C.line }]; btn.strokeWeight = 1
          btn.layoutMode = 'HORIZONTAL'
          btn.primaryAxisAlignItems = 'CENTER'; btn.counterAxisAlignItems = 'CENTER'
          btn.primaryAxisSizingMode = 'FIXED'; btn.counterAxisSizingMode = 'FIXED'
          nav.insertChild(idx, btn)
          btn.appendChild(child)
          child.rescale(12 / child.width)
        }
      }
      fixed++
    } catch (e) { report.push('✗ sec-title: ' + String(e).slice(0, 50)) }
  }
  report.push(`sec-title 교정 ${fixed}개`)
}

// ── 2. 특별전 통합 ──
{
  try {
    // 감독 카드/상영작 블록 찾기 — director-wrap의 부모 그룹
    const dw = findAll(mobile, n => n.name === 'director-wrap')[0]
    if (dw) {
      const group = dw.parent   // Frame 17 (sec-title + director-wrap + sub)
      const sub = group.children.find(n => n.name === 'sub')
      const posterRow = sub ? findAll(sub, n => n.name === 'poster-row')[0] : null

      // 새 감독 행
      const row = figma.createFrame()
      row.name = 'director-row'
      row.layoutMode = 'HORIZONTAL'; row.itemSpacing = 12
      row.counterAxisAlignItems = 'CENTER'
      row.paddingTop = 4; row.paddingBottom = 8; row.paddingLeft = 16; row.paddingRight = 16
      row.fills = []
      row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO'

      const av = figma.createEllipse(); av.resize(40, 40)
      av.fills = [{ type:'SOLID', color:C.t800 }]
      if (insetStyle) await av.setEffectStyleIdAsync(insetStyle.id)
      row.appendChild(av)

      const stack = figma.createFrame()
      stack.name = 'names'; stack.layoutMode = 'VERTICAL'; stack.itemSpacing = 2; stack.fills = []
      stack.primaryAxisSizingMode = 'AUTO'; stack.counterAxisSizingMode = 'AUTO'
      stack.appendChild(await mkText('라스 폰 트리에', '2.0/title', C.ink))
      stack.appendChild(await mkText('아트나인 · 서울 · 5편 상영중', '2.0/meta', C.t500))
      row.appendChild(stack)

      const link = await mkText('감독 상세', '2.0/meta', C.t600)
      row.appendChild(link)

      // 그룹 재조립: sec-title 유지 → director-row → poster-row (배경 없이)
      const secTitle = group.children.find(n => n.name === 'sec-title')
      const idx = secTitle ? group.children.indexOf(secTitle) + 1 : 0
      group.insertChild(idx, row)
      row.layoutSizingHorizontal = 'FILL'
      // link를 우측 끝으로 — stack을 FILL
      stack.layoutSizingHorizontal = 'FILL'
      if (posterRow) {
        group.insertChild(idx + 1, posterRow)
        posterRow.layoutSizingHorizontal = 'FILL'
        posterRow.fills = []
      }
      dw.remove()
      if (sub) sub.remove()
      report.push('특별전 통합 — 카드 2장 → 한 흐름')
    } else report.push('director-wrap 없음 — 특별전 스킵')
  } catch (e) { report.push('✗ 특별전: ' + String(e).slice(0, 60)) }
}

// ── 3. 배너·히어로 인셋 + 라운드 ──
{
  mobile.counterAxisAlignItems = 'CENTER'   // 고정폭 자식(배너·히어로) 중앙 정렬
  const banner = findAll(mobile, n => n.name === 'festival-banner')[0]
  if (banner) {
    try {
      banner.layoutSizingHorizontal = 'FIXED'
      banner.resize(370, 140)
      banner.cornerRadius = 8
      report.push('영화제 배너 — 인셋 370 + r8')
    } catch (e) { report.push('✗ 배너: ' + String(e).slice(0, 50)) }
  }
  const hero = findAll(mobile, n => n.name === 'theme-hero')[0]
  if (hero) {
    try {
      hero.layoutSizingHorizontal = 'FIXED'
      hero.resize(370, hero.height)
      hero.cornerRadius = 12
      hero.clipsContent = true
      report.push('다크 히어로 — 인셋 370 + r12')
    } catch (e) { report.push('✗ 히어로: ' + String(e).slice(0, 50)) }
  }
}

// ── 4. 섹션 리듬 — sec-title pad-top 통일 ──
{
  const secTitles = findAll(mobile, n => n.type === 'FRAME' && n.name === 'sec-title')
  let first = true
  for (const st of secTitles) {
    st.paddingTop = first ? 24 : 40
    st.paddingBottom = 12
    first = false
  }
  report.push(`섹션 리듬 통일 ${secTitles.length}개 (top 40 · bottom 12)`)
}

// ── 5. award-card 보더 → shadow/sm ──
{
  for (const card of findAll(mobile, n => n.name === 'award-card')) {
    card.strokes = []
    if (smStyle) await card.setEffectStyleIdAsync(smStyle.id)
    card.cornerRadius = 12
  }
  report.push('award-card 보더 제거 + shadow/sm')
}

// ── 6. 탭바 활성 틴트 ──
{
  const bar = findAll(mobile, n => n.name === 'tabbar')[0]
  if (bar) {
    if (smStyle) await bar.setEffectStyleIdAsync(smStyle.id)
    for (const tab of bar.children.filter(n => n.name === 'tab')) {
      const isActive = findAll(tab, x => x.type === 'TEXT' && x.characters === '상영작').length > 0
      tab.fills = isActive ? [TINT] : []
      tab.cornerRadius = 8
    }
    report.push('탭바 — 상영작 틴트 + shadow/sm')
  }
}

// ── 리포트 ──
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'polish-films-tobe-mobile 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 800
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('TOBE · Mobile 정리 완료')
