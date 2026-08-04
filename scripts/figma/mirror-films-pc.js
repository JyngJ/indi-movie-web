// mirror-films-pc — 모바일 확정사항을 TOBE · PC에 반영 (Scripter용)
//
// 1. 섹션 부제(설명) 전부 삭제
// 2. 특별전: 카드형(감독 카드+회색 블록) → 플랫 헤더 행 + 맨 포스터 행
// 3. 지금출발 캡션: [오늘 18:20 / 극장명] 두 줄
// 4. 막바지 캡션 위계 정상화 (제목 위 · 보조 아래)
// 5. ‹› 넘김 버튼은 PC 유지 (마우스 환경 — 호버 노출은 코드 몫)
//
// 실행: Scripter 붙여넣고 Run.

const report = []
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }
function findAll(root, pred) { const o=[]; walk(root, n => { if (pred(n)) o.push(n) }); return o }

let tobe = null, pc = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') {
      tobe = sec; pc = sec.children.find(n => n.name === 'TOBE · PC'); figma.currentPage = page
    }
  }
}
if (!pc) { figma.notify('TOBE · PC 없음'); throw new Error('no frame') }

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
const C = { ink:{r:0x0C/255,g:0x0A/255,b:0x08/255}, t600:{r:0x72/255,g:0x6B/255,b:0x65/255}, t500:{r:0x8D/255,g:0x87/255,b:0x81/255} }

// ── 1. 부제 삭제 ──
{
  let removed = 0
  for (const st of findAll(pc, n => n.type === 'FRAME' && n.name === 'sec-title')) {
    const titles = st.children.find(c => c.name === 'titles') || st
    const texts = titles.children.filter(c => c.type === 'TEXT')
    for (const t of texts.slice(1)) { t.remove(); removed++ }
  }
  report.push(`부제 삭제 ${removed}개`)
}

// ── 2. 특별전 플랫화 ──
{
  try {
    const sr = findAll(pc, n => n.name === 'special-row')[0]
    if (sr) {
      const body = sr.parent
      const idx = body.children.indexOf(sr)
      const sub = sr.children.find(c => c.name === 'sub')
      const pr = sub ? findAll(sub, n => n.name === 'pr')[0] : null

      // 플랫 헤더 행: [클래퍼보드 + 아트나인/캡션] ... 영화관 보기 ›
      const bar = figma.createFrame()
      bar.name = 'theater-bar'
      bar.layoutMode = 'HORIZONTAL'; bar.itemSpacing = 12
      bar.counterAxisAlignItems = 'CENTER'
      bar.paddingTop = 0; bar.paddingBottom = 12; bar.paddingLeft = 24; bar.paddingRight = 24
      bar.fills = []
      bar.primaryAxisSizingMode = 'AUTO'; bar.counterAxisSizingMode = 'AUTO'
      let clap = null
      walk(figma.root, n => { if (!clap && n.type === 'COMPONENT' && n.name === '2.0/icon/clapperboard') clap = n })
      if (clap) { const i = clap.createInstance(); bar.appendChild(i); i.rescale(18 / i.width) }
      const stack = figma.createFrame()
      stack.name = 'names'; stack.layoutMode = 'VERTICAL'; stack.itemSpacing = 2; stack.fills = []
      stack.primaryAxisSizingMode = 'AUTO'; stack.counterAxisSizingMode = 'AUTO'
      stack.appendChild(await mkStyledText('아트나인', '2.0/title', C.ink))
      stack.appendChild(await mkStyledText('서울 · 5편 상영중', '2.0/meta', C.t500))
      bar.appendChild(stack)
      const link = await mkStyledText('영화관 보기 ›', '2.0/body', C.t600)
      bar.appendChild(link)

      body.insertChild(idx, bar)
      bar.layoutSizingHorizontal = 'FILL'
      stack.layoutSizingHorizontal = 'FILL'   // 링크를 우측 끝으로

      // 포스터 행을 밖으로 — 배경 없이
      if (pr) {
        body.insertChild(idx + 1, pr)
        pr.layoutSizingHorizontal = 'FILL'
        pr.fills = []
        pr.paddingLeft = 24; pr.paddingRight = 24; pr.paddingBottom = 16
      }
      sr.remove()
      report.push('특별전 — 플랫 헤더 + 맨 포스터 행')
    } else report.push('special-row 없음 — 이미 처리됐거나 이름 다름')
  } catch (e) { report.push('✗ 특별전: ' + String(e).slice(0, 60)) }
}

// ── 3·4. 행 캡션 — 직전 sec-title 기준 매핑 ──
{
  try {
    const body = findAll(pc, n => n.name === 'body')[0]
    let current = ''
    let departN = 0, lastN = 0
    const departCaps = ['오늘 18:20\n영화공간주안', '오늘 18:40\n황성시네마', '오늘 19:10\n아리랑시네센터', '오늘 19:30\n인디스페이스', '오늘 20:10\n에무시네마', '오늘 20:40\n씨네큐브']
    for (const child of body.children) {
      if (child.name === 'sec-title') {
        const t = findAll(child, x => x.type === 'TEXT')[0]
        current = t ? t.characters : ''
        continue
      }
      if (child.name !== 'row' && child.name !== 'pr') continue
      const items = findAll(child, x => x.type === 'INSTANCE' && x.name.includes('PosterItem'))
      for (const item of items) {
        const texts = findAll(item, x => x.type === 'TEXT')
        if (texts.length < 2) continue
        await figma.loadFontAsync(texts[0].fontName)
        await figma.loadFontAsync(texts[1].fontName)
        if (current.startsWith('지금 출발')) {
          texts[1].characters = departCaps[departN % departCaps.length]; departN++
        } else if (current.startsWith('막바지')) {
          // 위계 정상화: 제목 위(bold) · 보조 아래
          texts[0].characters = '영화 제목'
          texts[1].characters = '감독 이름'
          lastN++
        }
      }
    }
    report.push(`지금출발 캡션 ${departN}개 · 막바지 정상화 ${lastN}개`)
  } catch (e) { report.push('✗ 캡션: ' + String(e).slice(0, 60)) }
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = 'mirror-films-pc 결과\n' + report.join('\n')
figma.currentPage.appendChild(t)
t.x = tobe.x + tobe.width + 40; t.y = tobe.y + 1200
figma.viewport.scrollAndZoomIntoView([t])
figma.notify('PC 미러링 완료')
