// 인스타 히어로 코드 동기화 (2026-08-05)
// 1) 아이브로 텍스트 '영화 소식을 소개할지도' 삭제 — 코드에서 폐기됨
// 2) 섹션 제목 문구 '인스타그램에서 추천한 그 영화' → '인스타그램에서 추천한 영화' (있는 경우)
// 대상: FilmsTab TOBE (grayscale) / FilmsTab TOBE (Color) 섹션 전체
// Scripter에서 Run. 결과는 캔버스 우측 리포트 텍스트로.

const TARGET_SECTIONS = ['FilmsTab TOBE (grayscale)', 'FilmsTab TOBE (Color)']
const EYEBROW = '영화 소식을 소개할지도'
const TITLE_OLD = '인스타그램에서 추천한 그 영화'
const TITLE_NEW = '인스타그램에서 추천한 영화'

const report = []

for (const page of figma.root.children) {
  for (const sec of page.children) {
    if (sec.type !== 'SECTION' || !TARGET_SECTIONS.includes(sec.name)) continue

    const texts = sec.findAll(n => n.type === 'TEXT')
    for (const t of texts) {
      if (t.characters === EYEBROW) {
        report.push(`삭제: "${EYEBROW}" (${sec.name} / ${t.parent.name})`)
        t.remove()
      } else if (t.characters === TITLE_OLD) {
        await figma.loadFontAsync(t.fontName)
        t.characters = TITLE_NEW
        report.push(`문구 수정: "${TITLE_NEW}" (${sec.name} / ${t.parent.name})`)
      }
    }
  }
}

// 리포트 텍스트
await figma.loadFontAsync({ family: 'Pretendard', style: 'Regular' })
const note = figma.createText()
note.fontName = { family: 'Pretendard', style: 'Regular' }
note.fontSize = 13
note.characters = report.length
  ? `sync-insta-hero 결과 (${report.length}건)\n` + report.join('\n')
  : 'sync-insta-hero: 대상 없음 (이미 반영됐거나 섹션명 확인 필요)'
note.fills = [{ type: 'SOLID', color: { r: 0x72 / 255, g: 0x6B / 255, b: 0x65 / 255 } }]
figma.currentPage.appendChild(note)
note.x = figma.viewport.center.x
note.y = figma.viewport.center.y
figma.viewport.scrollAndZoomIntoView([note])
figma.notify(`sync-insta-hero: ${report.length}건 처리`)
