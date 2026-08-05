// build-loading-state — 상영작 탭 로딩 상태 화면 생성 (Scripter용)
//
// FilmsTab TOBE (Color)의 TOBE · Mobile / TOBE · PC를 복제해
// 섹션 "FilmsTab Loading 상태"에 배치하고, 화면 상단에 로딩 진행 선을 얹는다.
//   트랙: 상단 전체 폭 3px, primary/100
//   진행 세그먼트: 폭 35%, primary/700 (인디터미네이트 — 좌→우로 흐르는 바의 한 프레임)
//   지도 탭은 제외 (요청 범위: 상영작 탭)
//
// 실행: Scripter 붙여넣고 Run. 재실행 시 기존 로딩 섹션 지우고 재생성.

function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }

const PRIMARY = { r:0x40/255, g:0x4E/255, b:0x81/255 }
const TINT = { r:0xEC/255, g:0xEF/255, b:0xF9/255 }

let colorSec = null, page0 = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (Color)') { colorSec = sec; page0 = page }
  }
}
if (!colorSec) { figma.notify('FilmsTab TOBE (Color) 없음'); throw new Error('no section') }
figma.currentPage = page0

const old = page0.children.find(n => n.type === 'SECTION' && n.name === 'FilmsTab Loading 상태')
if (old) old.remove()
const sec = figma.createSection()
sec.name = 'FilmsTab Loading 상태'
sec.x = colorSec.x
sec.y = colorSec.y + colorSec.height + 200

let x = 60
for (const name of ['TOBE · Mobile', 'TOBE · PC']) {
  const src = colorSec.children.find(n => n.name === name)
  if (!src) continue
  const clone = src.clone()
  clone.name = name + ' (loading)'
  sec.appendChild(clone)
  clone.x = x; clone.y = 80
  x += clone.width + 120

  // 상단 로딩 선 — 트랙 + 진행 세그먼트 (절대 배치, 최상위)
  clone.clipsContent = true
  const track = figma.createRectangle()
  track.name = 'loading-track'
  track.resize(clone.width, 3)
  track.fills = [{ type:'SOLID', color: TINT }]
  clone.appendChild(track)
  track.layoutPositioning = 'ABSOLUTE'
  track.x = 0; track.y = 0
  track.constraints = { horizontal: 'STRETCH', vertical: 'MIN' }

  const seg = figma.createRectangle()
  seg.name = 'loading-bar'
  seg.resize(Math.round(clone.width * 0.35), 3)
  seg.fills = [{ type:'SOLID', color: PRIMARY }]
  seg.cornerRadius = 2
  clone.appendChild(seg)
  seg.layoutPositioning = 'ABSOLUTE'
  seg.x = Math.round(clone.width * 0.18); seg.y = 0   // 흐르는 중의 한 프레임
  seg.constraints = { horizontal: 'MIN', vertical: 'MIN' }
}

// 주석 텍스트
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const note = figma.createText()
note.fontName = { family:'Pretendard', style:'Regular' }
note.fontSize = 13
note.characters = '로딩 진행 선 — 화면 최상단 3px. 트랙 primary/100, 세그먼트 primary/700 35%가 좌→우로 흐름(인디터미네이트).\n라우트 전환·데이터 로딩 중 노출, 완료 시 100%로 채우고 페이드아웃. 지도 탭 제외.'
note.fills = [{ type:'SOLID', color:{ r:0x72/255, g:0x6B/255, b:0x65/255 } }]
sec.appendChild(note)
note.x = 60; note.y = 20

sec.resizeWithoutConstraints(x + 60, 80 + Math.max(...sec.children.map(c => c.height || 0)) + 120)
figma.viewport.scrollAndZoomIntoView([sec])
figma.notify('로딩 상태 화면 생성 완료')
