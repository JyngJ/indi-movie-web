// texts 섹션 Typography 프레임을 "타이포 2.0 (TOBE)" 스펙으로 재구성 (Scripter용)
// 스케일 10·12·14·16·20·24 / 행간 24=125% → 소형 150% / num류 100% / Baskerville 제거

const FRAME_ID = '41:306'

const P = s => ({ family: 'Pretendard', style: s })
const KIMM = { family: 'KIMM_Bold', style: 'B' }
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync(KIMM)

const frame = await figma.getNodeByIdAsync(FRAME_ID)
if (!frame) throw new Error('Typography 프레임(41:306) 못 찾음')

// 기존 내용 전부 제거 후 재구성
for (const c of [...frame.children]) c.remove()
frame.name = 'Typography 2.0 (TOBE)'
frame.layoutMode = 'VERTICAL'
frame.primaryAxisSizingMode = 'AUTO'
frame.counterAxisSizingMode = 'AUTO'
frame.itemSpacing = 24
frame.fills = []

const GREY_LABEL = { r: 0.52, g: 0.5, b: 0.46 }
const INK = { r: 0.106, g: 0.09, b: 0.075 }

const title = figma.createText()
title.fontName = KIMM
title.characters = 'Typography 2.0'
title.fontSize = 24
title.lineHeight = { unit: 'PERCENT', value: 125 }
title.fills = [{ type: 'SOLID', color: INK }]
frame.appendChild(title)

// [스타일명 라벨, 견본, 폰트, 크기, 행간%, 자간px, 대문자, tnum]
// h1·h2 패밀리는 KIMM 유지 — 서체 오디션 후 교체 대상
const ROWS = [
  ['display/h1 · 24/700 · 125% · 영화 대제목 (서체 오디션 대기)', '중경삼림', KIMM, 24, 125, 0, false, false],
  ['display/h2 · 20/700 · 130% · 극장명·섹션 헤더 (h2+h3 통합)', '씨네큐브 광화문', KIMM, 20, 130, 0, false, false],
  ['title · 16/700 · 140% · 카드 제목 (구 17)', '고령가 소년 살인사건', P('Bold'), 16, 140, 0, false, false],
  ['body-strong · 14/700 · 150% · 소제목 (구 subtitle 15 — weight로 위계)', '오늘 상영하는 특별전', P('Bold'), 14, 150, 0, false, false],
  ['body · 14/500 · 150% · 본문', '서울의 예술영화관 상영 정보를 한눈에 모아 봅니다.', P('Medium'), 14, 150, 0, false, false],
  ['meta · 12/400 · 150% · 메타·주소·영문원제 (구 13, Baskerville 흡수)', '서울 종로구 새문안로 68 · Chungking Express, 1994', P('Regular'), 12, 150, 0, false, false],
  ['caption · 12/500 · 140% · 라벨 CAPS, 자간 0.4 (구 11)', 'Now Showing', P('Medium'), 12, 140, 0.4, true, false],
  ['label · 10/500 · 140% · 최소 라벨 (구 badge 9 + dow 10 통합)', 'D-1 · 화', P('Medium'), 10, 140, 0, false, false],
  ['num/time · 16/700 · 100% tnum · 상영 시간·날짜 (구 17+16 통합)', '19:30', P('Bold'), 16, 100, 0, false, true],
  ['num/seat · 12/600 · 100% tnum · 좌석수', '82/120석', P('SemiBold'), 12, 100, 0, false, true],
]

const ids = []
for (const [label, sample, font, size, lh, ls, caps, tnum] of ROWS) {
  const row = figma.createFrame()
  row.layoutMode = 'VERTICAL'
  row.primaryAxisSizingMode = 'AUTO'
  row.counterAxisSizingMode = 'AUTO'
  row.itemSpacing = 4
  row.fills = []
  row.name = label

  const l = figma.createText()
  l.fontName = P('Regular')
  l.characters = label
  l.fontSize = 11
  l.fills = [{ type: 'SOLID', color: GREY_LABEL }]
  row.appendChild(l)

  const t = figma.createText()
  t.fontName = font
  t.characters = sample
  t.fontSize = size
  t.lineHeight = { unit: 'PERCENT', value: lh }
  if (ls) t.letterSpacing = { unit: 'PIXELS', value: ls }
  if (caps) t.textCase = 'UPPER'
  t.fills = [{ type: 'SOLID', color: INK }]
  row.appendChild(t)

  frame.appendChild(row)
  ids.push(row.id)
}

// 결과 리포트 (캔버스)
const section = frame.parent
const oldRep = section.findOne && section.findOne(n => n.type === 'TEXT' && n.name === '타이포 리포트')
if (oldRep) oldRep.remove()
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const rep = figma.createText()
rep.name = '타이포 리포트'
rep.characters = `[타이포 2.0 재구성 완료] 스타일 ${ROWS.length}종\n스케일: 10·12·14·16·20·24\n행간: 24→125 / 20→130 / 16→140 / 14→150 / 12→150(라벨 140) / num→100\n삭제: Baskerville, subtitle15, h3 20, badge9, dow10, date16(→time)\n주의: tnum(고정폭 숫자)은 피그마 UI에서 수동 설정 — 텍스트 선택 → 타입 설정(…) → 숫자 → 고정폭`
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: INK }]
section.appendChild(rep)
rep.x = frame.x + frame.width + 60
rep.y = frame.y
