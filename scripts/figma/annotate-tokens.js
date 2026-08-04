// 색상 토큰 완료 섹션 주석 스크립트 (Scripter용)
// 각 스와치 아래에 "토큰 이름 + 역할 설명" 라벨을 단다.
// 이름은 스와치 명도(L) 순서로 자동 배정 — 좌우 순서 무관.

const SECTION_ID = '35:184'

// ── 폰트 ──
const fonts = await figma.listAvailableFontsAsync()
const has = (f, s) => fonts.some(x => x.fontName.family === f && x.fontName.style === s)
const NAME_FONT = has('Pretendard', 'SemiBold') ? { family: 'Pretendard', style: 'SemiBold' } : { family: 'Inter', style: 'Semi Bold' }
const DESC_FONT = has('Pretendard', 'Regular') ? { family: 'Pretendard', style: 'Regular' } : { family: 'Inter', style: 'Regular' }
await figma.loadFontAsync(NAME_FONT)
await figma.loadFontAsync(DESC_FONT)

// ── 역할 사전 (어두운 것부터) ──
const ROLES = {
  grey: [
    ['neutral/900', '텍스트 프라이머리 · 제목'],
    ['neutral/800', '강조 텍스트'],
    ['neutral/700', '본문 텍스트'],
    ['neutral/600', '서브 텍스트'],
    ['neutral/500', '캡션 · 메타'],
    ['neutral/400', '플레이스홀더'],
    ['neutral/300', '비활성 · 보조 구분'],
    ['neutral/200', '보더 · 구분선'],
    ['neutral/100', '페이지 · 카드 배경 (미색 종이)'],
  ],
  primary: [
    ['primary/900', '틴트 위 텍스트'],
    ['primary/800', 'hover · 프레스'],
    ['primary/700', 'base — 버튼·CTA·활성 (크림 글자)'],
    ['primary/600', '보조 액센트'],
    ['primary/500', '아이콘 액센트'],
    ['primary/400', '차트 · 보조'],
    ['primary/300', '연한 보더'],
    ['primary/200', '틴트 보더'],
    ['primary/100', 'subtle — 활성 칩 · 틴트 배경'],
  ],
  warning: [
    ['warning/900', '틴트 위 텍스트'],
    ['warning/700', '색 텍스트 + 솔리드 배지 배경 (겸직)'],
    ['warning/500', '아이콘·보더 전용 — 글자 얹기 금지'],
    ['warning/300', '연한 보더'],
    ['warning/100', '틴트 배경'],
  ],
  success: [
    ['success/900', '틴트 위 텍스트'],
    ['success/700', '색 텍스트 + 솔리드 칩("상영중") 배경'],
    ['success/500', '아이콘·보더 — 글자 얹기 금지'],
    ['success/300', '연한 보더'],
    ['success/100', '틴트 배경'],
  ],
  error: [
    ['error/900', '색 텍스트("매진") + 솔리드 칩 배경 (L40 — 텍스트 겸직)'],
    ['error/700', '아이콘·보더 — 글자 얹기 금지 (L52 무인지대)'],
    ['error/500', '연한 액센트'],
    ['error/300', '틴트 보더'],
    ['error/100', '틴트 배경'],
  ],
  gv: [
    ['gv/900', '틴트 위 텍스트'],
    ['gv/700', '색 텍스트 + 핀·배지 솔리드 — 앵커'],
    ['gv/500', '아이콘 — 글자 얹기 금지'],
    ['gv/300', '연한 보더'],
    ['gv/100', '틴트 배경'],
  ],
  white: [
    ['white', 'surface/card — 순백 카드. 미색 종이 위에 뜨는 면'],
  ],
}

// ── 섹션 스캔 ──
const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('섹션 35:184 못 찾음')
const all = section.findAll(n => true)
const swatches = all.filter(n =>
  (n.type === 'RECTANGLE' || n.type === 'FRAME') &&
  n.width >= 50 && n.height >= 40 &&
  n.fills !== figma.mixed && n.fills.length && n.fills[0].type === 'SOLID' && n.fills[0].visible !== false &&
  !n.findChild // RECTANGLE엔 findChild 없음; FRAME이면 자식 없는 것만
) .concat(all.filter(n => n.type === 'FRAME' && n.children.length === 0 && n.width >= 50 && n.height >= 40 && n.fills !== figma.mixed && n.fills.length && n.fills[0].type === 'SOLID'))
const uniq = [...new Map(swatches.map(n => [n.id, n])).values()]

// 그룹 라벨 위치로 행 분류
const groups = { grey: [], primary: [], warning: [], success: [], error: [], gv: [] }
// hue 기반 자동 분류 — 그룹 라벨 없어도 동작
const hueOf = n => {
  const c = n.fills[0].color
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b)
  if (max - min < 0.001) return -1
  let h
  if (max === c.r) h = ((c.g - c.b) / (max - min)) % 6
  else if (max === c.g) h = (c.b - c.r) / (max - min) + 2
  else h = (c.r - c.g) / (max - min) + 4
  h = Math.round(h * 60)
  return h < 0 ? h + 360 : h
}
const satOf = n => {
  const c = n.fills[0].color
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b)
  const l = (max + min) / 2
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
}
for (const sw of uniq) {
  const h = hueOf(sw), s = satOf(sw)
  const c = sw.fills[0].color
  const l = (Math.max(c.r, c.g, c.b) + Math.min(c.r, c.g, c.b)) / 2
  // 순백은 별도 처리 (surface/card)
  if (l > 0.985 && s < 0.1) { groups.white = groups.white || []; groups.white.push(sw); continue }
  // 웜그레이: 무채색이거나, 웜 hue(15~60) 저채도. 초록·파랑 저채도는 그레이 아님
  const isGrey = h === -1 || s < 0.1 || (h >= 15 && h <= 60 && s < 0.45)
  if (isGrey) groups.grey.push(sw)
  else if (h >= 200 && h <= 250) groups.primary.push(sw)            // 인디고
  else if (h >= 255 && h <= 305) groups.gv.push(sw)                 // 보라
  else if (h >= 25 && h <= 55) groups.warning.push(sw)              // 오커
  else if (h >= 90 && h <= 170) groups.success.push(sw)             // 초록
  else if (h <= 20 || h >= 345) groups.error.push(sw)               // 빨강
}

// 명도 계산
const lightness = n => {
  const c = n.fills[0].color
  return (Math.max(c.r, c.g, c.b) + Math.min(c.r, c.g, c.b)) / 2
}

const created = []
for (const [key, arr] of Object.entries(groups)) {
  const roles = ROLES[key]
  if (!roles || !arr.length) continue
  if (arr.length !== roles.length) {
    created.push(`⚠ ${key}: 스와치 ${arr.length}개 vs 역할 ${roles.length}개 — 개수 불일치, 이 그룹 건너뜀`)
    continue
  }
  arr.sort((a, b) => lightness(a) - lightness(b)) // 어두운 순
  for (let i = 0; i < arr.length; i++) {
    const sw = arr[i]
    const [name, desc] = roles[i]
    if (all.some(t => t.type === 'TEXT' && t.characters === name)) { created.push(`${name} 이미 있음 — 건너뜀`); continue }
    // 스와치 아래, 같은 열의 기존 텍스트(HSL 주석)보다 아래에 배치
    const swX = sw.absoluteTransform[0][2] - section.x
    const swY = sw.absoluteTransform[1][2] - section.y
    let bottom = swY + sw.height
    for (const t of all) {
      if (t.type !== 'TEXT') continue
      const tx = t.absoluteTransform[0][2] - section.x
      const ty = t.absoluteTransform[1][2] - section.y
      if (tx < swX + sw.width && tx + t.width > swX && ty >= swY + sw.height - 4 && ty < swY + sw.height + 140) {
        bottom = Math.max(bottom, ty + t.height)
      }
    }
    const nameT = figma.createText()
    nameT.fontName = NAME_FONT
    nameT.characters = name
    nameT.fontSize = 12
    nameT.fills = [{ type: 'SOLID', color: { r: 0.106, g: 0.09, b: 0.075 } }]
    section.appendChild(nameT)
    nameT.x = swX; nameT.y = bottom + 10
    const descT = figma.createText()
    descT.fontName = DESC_FONT
    descT.characters = desc
    descT.fontSize = 10
    descT.fills = [{ type: 'SOLID', color: { r: 0.52, g: 0.5, b: 0.46 } }]
    descT.textAutoResize = 'HEIGHT'
    section.appendChild(descT)
    descT.resize(Math.max(sw.width, 96), 12)
    descT.x = swX; descT.y = bottom + 26
    created.push(`${name} ← L${Math.round(lightness(sw) * 100)}`)
  }
}
console.log(created.join('\n'))
console.log('주석 완료. 변수 등록할 때 이 이름 그대로 쓰면 됨.')
