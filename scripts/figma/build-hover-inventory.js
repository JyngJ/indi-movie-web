// build-hover-inventory — 호버 상태 인벤토리 섹션 생성 (Scripter용)
//
// "Design System - work"에 섹션 "Hover 인벤토리": 호버 시 배경이 바뀌어야 하는
// 컨트롤 전수 목록을 Default / Hover 페어로 나열. 규칙:
//   칩·링크·버튼류 → hover 배경 neutral/100 (surface-raised)
//   원형 넘김 버튼 → hover 배경 neutral/100 + 보더 유지
//   카드류 → hover 그림자 승격 (sm → md)
//   포스터 → scale 1.1 (기존, 참고용)
//
// 실행: Scripter 붙여넣고 Run.

const C = {
  bg:'#FAF9F8', card:'#FFFFFF', raised:'#EAE5E1', line:'#DDD9CF',
  ink:'#0C0A08', t600:'#726B65', t500:'#8D8781', primary:'#404E81', tint:'#ECEFF9',
}
const hex = h => { const n=parseInt(h.slice(1),16); return { r:((n>>16)&255)/255, g:((n>>8)&255)/255, b:(n&255)/255 } }
const fill = h => [{ type:'SOLID', color:hex(h) }]

for (const st of ['Regular','Medium','Bold']) await figma.loadFontAsync({ family:'Pretendard', style:st })

// 셰브런다운 컴포넌트 (지역 칩 — 코드의 hasDropdown ∨)
let chevDown = null
for (const page of figma.root.children) {
  await page.loadAsync()
  const stack = [page]
  while (stack.length) {
    const n = stack.pop()
    if (n.type === 'COMPONENT' && n.name === '2.0/icon/chevron-down') { chevDown = n; break }
    if ('children' in n) for (const c of n.children) stack.push(c)
  }
  if (chevDown) break
}

const mkText = (chars, size, weight='Regular', color=C.ink) => {
  const t = figma.createText()
  t.fontName = { family:'Pretendard', style:weight }
  t.characters = chars; t.fontSize = size
  t.fills = fill(color)
  t.lineHeight = { value:140, unit:'PERCENT' }
  return t
}
const mkAuto = (name, dir, gap, pad) => {
  const f = figma.createFrame()
  f.name = name; f.layoutMode = dir; f.itemSpacing = gap
  ;[f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = pad
  f.fills = []
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'
  return f
}

// 샘플 컨트롤 생성기 — kind별 Default/Hover
function sample(kind, hover) {
  const f = mkAuto('sample', 'HORIZONTAL', 4, [6, 12, 6, 12])
  f.counterAxisAlignItems = 'CENTER'
  switch (kind) {
    case 'chip': {    // 지역 칩 — 라벨 + ∨ (코드 hasDropdown)
      f.cornerRadius = 9999
      f.fills = fill(hover ? C.raised : C.card)
      f.strokes = fill(C.line); f.strokeWeight = 1
      f.appendChild(mkText('검색 지역', 12, 'Medium', C.t600))
      if (chevDown) {
        const i = chevDown.createInstance()
        f.appendChild(i)
        i.rescale(12 / i.width)
      } else {
        // 아이콘 세트에 chevron-down 없으면 벡터로
        const v = figma.createVector()
        f.appendChild(v)
        v.resize(8, 5)
        v.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 0 L 4 5 L 8 0' }]
        v.strokes = fill(C.t600); v.strokeWeight = 1.5
        v.strokeCap = 'ROUND'; v.strokeJoin = 'ROUND'
        v.fills = []
      }
      break
    }
    case 'link':      // 영화관 보기 › · 감독 상세 · 인스타 더보기
      f.cornerRadius = 8
      f.fills = hover ? fill(C.raised) : []
      f.appendChild(mkText('영화관 보기 ›', 14, 'Medium', C.t600))
      break
    case 'caption': {  // 시의성 캡션 — [시간 / 극장] 2줄 통째 클릭
      const b = mkAuto('caption', 'VERTICAL', 4, [4, 8, 4, 8])
      b.cornerRadius = 8
      b.fills = hover ? fill(C.raised) : []
      b.appendChild(mkText('오늘 18:40', 12, 'Bold', '#2B2622'))
      b.appendChild(mkText('황성시네마', 12, 'Regular', C.t500))
      return b
    }
    case 'navbtn': {  // ‹› 원형
      const b = figma.createFrame()
      b.resize(28, 28); b.cornerRadius = 9999
      b.fills = fill(hover ? C.raised : C.bg)
      b.strokes = fill(C.line); b.strokeWeight = 1
      b.layoutMode = 'HORIZONTAL'
      b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER'
      b.primaryAxisSizingMode = 'FIXED'; b.counterAxisSizingMode = 'FIXED'
      b.appendChild(mkText('›', 12, 'Bold', C.ink))
      return b
    }
    case 'tab':       // 레일·모바일 탭
      f.cornerRadius = 8
      f.fills = hover ? [{ type:'SOLID', color:hex(C.primary), opacity:0.11 }] : []
      f.appendChild(mkText('지도', 12, 'Medium', C.t600))
      break
    case 'card': {    // 수상작 카드 등
      const b = mkAuto('card', 'VERTICAL', 4, [14, 16, 14, 16])
      b.cornerRadius = 12
      b.fills = fill(C.card)
      b.effects = [{ type:'DROP_SHADOW', color:{ r:20/255, g:15/255, b:10/255, a: hover ? 0.10 : 0.06 },
        offset:{ x:0, y: hover ? 4 : 1 }, radius: hover ? 16 : 4, visible:true, blendMode:'NORMAL' }]
      b.appendChild(mkText('수상작 카드', 14, 'Bold'))
      b.appendChild(mkText(hover ? '그림자 sm → md' : '그림자 sm', 12, 'Regular', C.t500))
      return b
    }
    case 'select':    // 정렬 셀렉트
      f.cornerRadius = 8
      f.fills = fill(hover ? C.raised : C.card)
      f.strokes = fill(C.line); f.strokeWeight = 1
      f.appendChild(mkText('상영관 많은순 ▾', 12, 'Medium', C.t600))
      break
  }
  return f
}

const ITEMS = [
  ['지역 칩 (헤더)', 'chip'],
  ['예매 가능만 보기 · 필터 필', 'chip'],
  ['플랫 링크 — 영화관 보기 › · 감독 상세', 'link'],
  ['인스타 더 보기 ↗ (섹션 타이틀 우측)', 'link'],
  ['시의성 캡션 (시간/극장 — 통째 클릭 → 극장 상세)', 'caption'],
  ['‹ › 원형 넘김 버튼 (hover 노출 + hover 배경)', 'navbtn'],
  ['탭 (레일·모바일 하단)', 'tab'],
  ['정렬 셀렉트 (전체 그리드)', 'select'],
  ['수상작·기념일 카드', 'card'],
]

// ── 섹션 조립 ──
const work = figma.root.children.find(p => p.name === 'Design System - work')
await work.loadAsync()
figma.currentPage = work

const old = work.children.find(n => n.type === 'SECTION' && n.name === 'Hover 인벤토리')
if (old) old.remove()
const sec = figma.createSection()
sec.name = 'Hover 인벤토리'
let maxX = 0
for (const c of work.children) if (c !== sec) maxX = Math.max(maxX, c.x + c.width)
sec.x = maxX + 200; sec.y = 0

const board = mkAuto('hover-board', 'VERTICAL', 20, [40, 48, 40, 48])
board.fills = fill(C.bg)
sec.appendChild(board); board.x = 40; board.y = 60

const title = mkText('호버 인벤토리 — hover 시 배경/그림자 변화 목록', 20, 'Bold')
board.appendChild(title)
const head = mkAuto('head', 'HORIZONTAL', 24, [0, 0, 0, 0])
head.appendChild(mkText('컨트롤', 13, 'Bold', C.t500))
board.appendChild(head)

for (const [label, kind] of ITEMS) {
  const row = mkAuto('row', 'HORIZONTAL', 24, [8, 0, 8, 0])
  row.counterAxisAlignItems = 'CENTER'
  const lbl = mkText(label, 13, 'Medium')
  row.appendChild(lbl)
  lbl.layoutSizingHorizontal = 'FIXED'
  lbl.resize(300, lbl.height)
  const d = sample(kind, false); row.appendChild(d)
  const arrow = mkText('→', 12, 'Regular', C.t500); row.appendChild(arrow)
  const h = sample(kind, true); row.appendChild(h)
  board.appendChild(row)
}
const note = mkText('규칙: 칩·링크 hover=neutral/100 · 원형버튼 hover=neutral/100 · 탭 hover=primary 11% · 카드 hover=shadow md · 포스터=scale 1.1(기존)', 12, 'Regular', C.t500)
board.appendChild(note)

sec.resizeWithoutConstraints(board.width + 80, board.height + 120)
figma.viewport.scrollAndZoomIntoView([sec])
figma.notify('Hover 인벤토리 생성 완료')
