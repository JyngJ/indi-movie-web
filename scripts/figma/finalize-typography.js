// 타이포 2.0 마감 (Scripter용)
// 1. 텍스트 스타일 10종 신규 등록 (이름 "2.0/..." — 기존 16종 안 건드림)
// 2. "타이포그래피 완료" 섹션 생성 + 스타일별 견본·용도 정리
// 3. 견본 텍스트에 새 스타일 링크

const P = s => ({ family: 'Pretendard', style: s })
const KIMM = { family: 'KIMM_Bold', style: 'B' }
for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
await figma.loadFontAsync(KIMM)
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
const C = { ink: '#0C0A08', strong: '#726B65', mid: '#8D8781', label: '#858075', warn: '#B9800E', paper: '#FAF9F8' }

// [스타일명, 폰트, 크기, 행간, 자간, caps, 견본, 견본색, 설명(색 배정+용도), 사용 예]
const DEFS = [
  ['2.0/display/h1', KIMM, 24, 125, 0, false, '중경삼림', C.ink,
    '영화 대제목 · 색: neutral/900', '상세 히어로 제목, 온보딩 타이틀'],
  ['2.0/display/h2', KIMM, 20, 130, 0, false, '씨네큐브 광화문', C.ink,
    '극장명·섹션 헤더 · 색: neutral/900 (구 h2 22 + h3 20 통합)', '바텀시트 극장명, 큐레이션 섹션 대제목'],
  ['2.0/title', P('Bold'), 16, 140, 0, false, '고령가 소년 살인사건', C.ink,
    '카드·리스트 제목 · 색: neutral/900 (구 17)', '영화 카드 제목, 시간표 행 영화명'],
  ['2.0/body-strong', P('Bold'), 14, 150, 0, false, '오늘 상영하는 특별전', C.strong,
    '소제목·아이브로우 · 색: neutral/600 + 굵기 700로 위계 (구 subtitle 15)', '큐레이션 소제목, CTA 라벨(크림 primary/100)'],
  ['2.0/body', P('Medium'), 14, 150, 0, false, '서울의 예술영화관 상영 정보를 한눈에 모아 봅니다.', C.strong,
    '본문 · 색: neutral/600, 긴 글 화면은 700 예외', '시놉시스, 안내 문구'],
  ['2.0/meta', P('Regular'), 12, 150, 0, false, '왕가위 · 1994 · Chungking Express', C.mid,
    '메타·주소·크레딧 · 색: neutral/500 — 없어도 되는 정보만 (구 13, Baskerville 흡수)', '감독·연도·영문원제, 극장 주소'],
  ['2.0/caption', P('Medium'), 12, 140, 0.4, true, 'Now Showing', C.mid,
    '라벨 CAPS 자간 0.4 · 색: neutral/500 또는 시맨틱 700 (구 11)', 'NOW SHOWING, 섹션 상단 아이브로우'],
  ['2.0/label', P('Medium'), 10, 140, 0, false, 'D-1 · 화', C.mid,
    '최소 라벨 · 색: 맥락색 (구 badge 9 + dow 10 통합)', 'D-1 칩, 날짜바 요일, 심야 배지'],
  ['2.0/num/time', P('Bold'), 16, 100, 0, false, '19:30', C.ink,
    '시간·날짜 tnum · 색: neutral/900 (구 time 17 + date 16 통합) ※ tnum은 스타일 편집에서 수동 설정', '상영 시간, 날짜바 일자'],
  ['2.0/num/seat', P('SemiBold'), 12, 100, 0, false, '82/120석', C.ink,
    '좌석수 tnum · 잔여석=상태색 600, /총석=neutral/500 400weight ※ tnum 수동 설정', 'ShowtimeCell 잔여석'],
]

// ── 1. 텍스트 스타일 등록 ──
const existingStyles = await figma.getLocalTextStylesAsync()
const styleIds = {}
let created = 0
for (const [name, font, size, lh, ls, caps] of DEFS) {
  let st = existingStyles.find(s => s.name === name)
  if (!st) { st = figma.createTextStyle(); st.name = name; created++ }
  st.fontName = font
  st.fontSize = size
  st.lineHeight = { unit: 'PERCENT', value: lh }
  if (ls) st.letterSpacing = { unit: 'PIXELS', value: ls }
  if (caps) st.textCase = 'UPPER'
  const def = DEFS.find(d => d[0] === name)
  st.description = def[8] + ' | 예: ' + def[9]
  styleIds[name] = st.id
}

// ── 2. 섹션 + 견본 ──
let section = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === '타이포그래피 완료')
if (!section) {
  section = figma.createSection()
  section.name = '타이포그래피 완료'
  // 페이지 오른쪽 빈 자리에 배치
  let maxX = 0
  for (const n of figma.currentPage.children) { if (n !== section) maxX = Math.max(maxX, n.x + n.width) }
  section.x = maxX + 200; section.y = 0
  section.resizeWithoutConstraints(760, 1400)
  section.fills = [{ type: 'SOLID', color: hex(C.paper) }]
  figma.currentPage.appendChild(section)
}
const oldSpec = section.findOne(n => n.name === 'Typography 2.0 스펙')
if (oldSpec) oldSpec.remove()

const root = figma.createFrame()
root.name = 'Typography 2.0 스펙'
root.layoutMode = 'VERTICAL'
root.primaryAxisSizingMode = 'AUTO'; root.counterAxisSizingMode = 'AUTO'
root.itemSpacing = 28
root.fills = []
section.appendChild(root)
root.x = 48; root.y = 48

const heading = figma.createText()
heading.fontName = KIMM
heading.characters = 'Typography 2.0'
heading.fontSize = 24
heading.lineHeight = { unit: 'PERCENT', value: 125 }
heading.fills = [{ type: 'SOLID', color: hex(C.ink) }]
root.appendChild(heading)
const intro = figma.createText()
intro.fontName = P('Regular')
intro.characters = '스케일 10·12·14·16·20·24 · 행간 125%→150% (num 100%) · 삭제: Baskerville, 15, 22, 17, 13, 11, 9\n위계 원칙: 크기·굵기·색 셋 중 둘 이상으로 층 만들기 · 500 이하 색엔 "없어도 되는 정보"만'
intro.fontSize = 12
intro.lineHeight = { unit: 'PERCENT', value: 150 }
intro.fills = [{ type: 'SOLID', color: hex(C.mid) }]
root.appendChild(intro)

for (const [name, font, size, lh, ls, caps, sample, color, desc, usage] of DEFS) {
  const row = figma.createFrame()
  row.name = name
  row.layoutMode = 'VERTICAL'
  row.primaryAxisSizingMode = 'AUTO'; row.counterAxisSizingMode = 'AUTO'
  row.itemSpacing = 5
  row.fills = []

  const l = figma.createText()
  l.fontName = P('Regular')
  l.characters = `${name} · ${size}/${font.style === 'B' ? 'KIMM' : font.style} · ${lh}%`
  l.fontSize = 11
  l.fills = [{ type: 'SOLID', color: hex(C.label) }]
  row.appendChild(l)

  const t = figma.createText()
  t.fontName = font
  t.characters = sample
  t.fontSize = size
  t.lineHeight = { unit: 'PERCENT', value: lh }
  if (ls) t.letterSpacing = { unit: 'PIXELS', value: ls }
  if (caps) t.textCase = 'UPPER'
  t.fills = [{ type: 'SOLID', color: hex(color) }]
  row.appendChild(t)
  await t.setTextStyleIdAsync(styleIds[name]) // 스타일 링크

  const u = figma.createText()
  u.fontName = P('Regular')
  u.characters = `${desc}\n예: ${usage}`
  u.fontSize = 11
  u.lineHeight = { unit: 'PERCENT', value: 150 }
  u.fills = [{ type: 'SOLID', color: hex(C.mid) }]
  row.appendChild(u)

  root.appendChild(row)
}

// 리포트
const oldRep = section.findOne(n => n.type === 'TEXT' && n.name === '마감 리포트')
if (oldRep) oldRep.remove()
const rep = figma.createText()
rep.name = '마감 리포트'
rep.fontName = { family: 'Inter', style: 'Regular' }
rep.characters = `[타이포 2.0 마감] 스타일 ${created}개 신규 등록 (총 ${DEFS.length}종, "2.0/" 프리픽스)\n남은 수동 작업:\n1. num/time · num/seat 스타일에 tnum — 견본 텍스트 선택 → 숫자→고정폭 → 스타일 우클릭 '스타일 업데이트'\n2. 기존 1.0 스타일 16종은 그대로 둠 — 리디자인 적용 끝나면 일괄 삭제`
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: hex(C.ink) }]
section.appendChild(rep)
rep.x = 48; rep.y = root.y + root.height + 40
