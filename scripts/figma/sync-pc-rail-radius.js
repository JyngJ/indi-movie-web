// sync-pc-rail-radius — 코드에 반영한 PC 레일·패널 라운드를 피그마 TOBE에 역동기화 (Scripter용)
//
// 하는 일 (TOBE · PC docked — grayscale/Color 양쪽):
//   1. panel 프레임: 왼쪽 코너만 r16 (topLeft/bottomLeft)
//   2. rail 안 2.0/logo/tile 인스턴스: 바탕 Rectangle r4
//   3. rail 메뉴 탭 프레임(지도/상영작, r10): r8
//
// 실행: Scripter에서 붙여넣고 Run. 결과는 캔버스에 텍스트 리포트로 남김.

const report = []

function walk(node, fn) {
  fn(node)
  if ('children' in node) for (const c of node.children) walk(c, fn)
}

for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type !== 'SECTION') continue
    if (!sec.name.startsWith('TheaterSheet TOBE')) continue
    for (const fr of sec.children) {
      if (fr.name !== 'TOBE · PC docked') continue

      for (const kid of fr.children) {
        // 1. 패널 — 왼쪽 코너 r16
        if (kid.name.startsWith('panel')) {
          kid.topLeftRadius = 16
          kid.bottomLeftRadius = 16
          kid.topRightRadius = 0
          kid.bottomRightRadius = 0
          report.push(`${sec.name} / panel → 왼쪽 r16`)
        }
        // 2·3. 레일 내부
        if (kid.name === 'rail') {
          walk(kid, n => {
            // 로고 타일 인스턴스 안 바탕 Rectangle → r4
            if (n.type === 'INSTANCE' && n.name === '2.0/logo/tile') {
              walk(n, m => {
                if (m.type === 'RECTANGLE' && m.visible && 'cornerRadius' in m) {
                  m.cornerRadius = 4
                  report.push(`${sec.name} / logo tile rect → r4`)
                }
              })
            }
            // 메뉴 탭 프레임 (r10짜리) → r8
            if (n.type === 'FRAME' && n.cornerRadius === 10) {
              n.cornerRadius = 8
              report.push(`${sec.name} / rail tab "${n.name}" → r8`)
            }
          })
        }
      }
    }
  }
}

// ── 캔버스 리포트 ──
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' }).catch(() =>
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }))
const t = figma.createText()
try { t.fontName = { family: 'Pretendard', style: 'Regular' } } catch (e) { t.fontName = { family: 'Inter', style: 'Regular' } }
t.characters = 'sync-pc-rail-radius 결과\n' + (report.length ? report.join('\n') : '변경 대상 못 찾음 — 프레임 이름 확인')
t.x = figma.viewport.center.x
t.y = figma.viewport.center.y
figma.currentPage.appendChild(t)
figma.viewport.scrollAndZoomIntoView([t])
