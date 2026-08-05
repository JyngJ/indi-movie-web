// 코드 → 피그마 동기화 (2026-08-05 세션분)
// 1) 모바일 로딩바: 상단(y=0) → 바텀 탭바 바로 위로 이동 (코드: bottom 탭바 밀착으로 변경됨)
//    + PC loading-bar가 프레임 밖에 떠 있으면 프레임 안 상단으로 회수
// 2) 특별전 '영화관 보기 ›' 모바일(Frame 27 안): neutral/600 → primary/base
// 3) 수상 카드 워터마크(award-deco): 중심 우하단으로 이동 (코드: right -16% / top 64%)
// 4) 매진임박 3줄 캡션 데모 프레임 생성 — [시간 / 잔여석(error) / 극장명]
// Scripter에서 Run. 결과는 캔버스 리포트 텍스트.

const report = []
const TABBAR_H = 65

function sections(names) {
  const out = []
  for (const page of figma.root.children)
    for (const s of page.children)
      if (s.type === 'SECTION' && names.includes(s.name)) out.push(s)
  return out
}

// ── 1) 로딩바 위치 ──────────────────────────────────────────────
for (const sec of sections(['FilmsTab Loading 상태'])) {
  const mobile = sec.findOne(n => n.type === 'FRAME' && n.name.includes('Mobile'))
  if (mobile) {
    const track = mobile.findOne(n => n.name === 'loading-track')
    const bar = mobile.findOne(n => n.name === 'loading-bar')
    for (const el of [track, bar]) {
      if (!el) continue
      el.y = mobile.height - TABBAR_H - el.height
      report.push(`모바일 ${el.name} → y=${el.y} (탭바 위 밀착)`)
    }
  }
  // PC: 스트레이 loading-bar 회수 (프레임 밖에 떠 있는 경우)
  const pc = sec.findOne(n => n.type === 'FRAME' && n.name.includes('PC'))
  if (pc) {
    const strays = figma.currentPage.findAll(n => n.name === 'loading-bar' && n.parent.type === 'PAGE')
    for (const s of strays) {
      pc.appendChild(s)
      s.layoutPositioning = 'ABSOLUTE'
      s.x = 72; s.y = 0
      report.push('PC 스트레이 loading-bar 프레임 안으로 회수 (y=0)')
    }
  }
}

// ── 1.5) Loading 섹션에 남은 인스타 아이브로 제거 (insta 스크립트 대상 밖이었음) ──
for (const sec of sections(['FilmsTab Loading 상태'])) {
  for (const t of sec.findAll(n => n.type === 'TEXT' && n.characters === '영화 소식을 소개할지도')) {
    report.push(`아이브로 삭제 (${sec.name} / ${t.parent.name})`)
    t.remove()
  }
  for (const t of sec.findAll(n => n.type === 'TEXT' && n.characters === '인스타그램에서 추천한 그 영화')) {
    await figma.loadFontAsync(t.fontName)
    t.characters = '인스타그램에서 추천한 영화'
    report.push(`인스타 제목 문구 수정 (${sec.name})`)
  }
}

// ── 2·3) TOBE 두 벌: theater-link 색 + award-deco 위치 ─────────
const PRIMARY = { r: 0x4A / 255, g: 0x63 / 255, b: 0x80 / 255 }   // primary/base
for (const sec of sections(['FilmsTab TOBE (Color)', 'FilmsTab TOBE (grayscale)', 'FilmsTab Loading 상태'])) {
  // 특별전 링크 — 모바일 틴트 바(Frame 27, fill primary/100) 안의 것만
  for (const t of sec.findAll(n => n.type === 'TEXT' && n.characters === '영화관 보기 ›')) {
    let p = t.parent, tinted = false
    while (p && p.type !== 'SECTION') {
      if (p.name === 'Frame 27') { tinted = true; break }
      p = p.parent
    }
    if (tinted) {
      t.fills = [{ type: 'SOLID', color: PRIMARY }]
      report.push(`theater-link primary 적용 (${sec.name})`)
    }
  }
  // award-deco — 부모 카드 기준 중심 우하단 (코드: right -16%, top 64%)
  for (const v of sec.findAll(n => n.name === 'award-deco' || n.name === '칸 svg')) {
    const card = v.parent
    if (!card || !('width' in card)) continue
    v.x = Math.round(card.width * 1.16 - v.width)       // right: -16%
    v.y = Math.round(card.height * 0.64 - v.height / 2) // top: 64% 중심
    report.push(`${v.name} 우하단 이동 (${sec.name} / ${card.name}) → x=${v.x}, y=${v.y}`)
  }
}

// ── 4) 매진임박 3줄 캡션 데모 ───────────────────────────────────
await figma.loadFontAsync({ family: 'Pretendard', style: 'Bold' })
await figma.loadFontAsync({ family: 'Pretendard', style: 'SemiBold' })
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const tobe = sections(['FilmsTab TOBE (Color)'])[0]
if (tobe && !tobe.findOne(n => n.name === 'ASO-caption-demo')) {
  const demo = figma.createFrame()
  demo.name = 'ASO-caption-demo'
  demo.layoutMode = 'VERTICAL'
  demo.itemSpacing = 4
  demo.paddingLeft = demo.paddingRight = demo.paddingTop = demo.paddingBottom = 12
  demo.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  tobe.appendChild(demo)
  demo.x = 480; demo.y = 2760   // 모바일 프레임 아래 여백

  const mk = (chars, style, hex) => {
    const t = figma.createText()
    t.fontName = { family: 'Pretendard', style }
    t.fontSize = 12
    t.characters = chars
    const c = parseInt(hex.slice(1), 16)
    t.fills = [{ type: 'SOLID', color: { r: (c >> 16 & 255) / 255, g: (c >> 8 & 255) / 255, b: (c & 255) / 255 } }]
    demo.appendChild(t)
    return t
  }
  mk('오늘 18:50 · 외 2회', 'SemiBold', '#2B2622')   // neutral/800 · tnum
  mk('잔여 4석', 'SemiBold', '#9B3331')               // error
  mk('정남진시네마', 'Regular', '#857F76')            // caption
  mk('※ 매진임박 캡션 = 세 줄 [시간/잔여석/극장]. 잔여석 0이면 미표시', 'Regular', '#A9A39A').fontSize = 10
  report.push('ASO-caption-demo 생성 (TOBE Color 섹션)')
}

// ── 리포트 ─────────────────────────────────────────────────────
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = report.length
  ? `sync-code-diffs 결과 (${report.length}건)\n` + report.join('\n')
  : 'sync-code-diffs: 대상 없음'
note.fills = [{ type: 'SOLID', color: { r: 0x72 / 255, g: 0x6B / 255, b: 0x65 / 255 } }]
figma.currentPage.appendChild(note)
note.x = figma.viewport.center.x
note.y = figma.viewport.center.y
figma.viewport.scrollAndZoomIntoView([note])
figma.notify(`sync-code-diffs: ${report.length}건 처리`)
