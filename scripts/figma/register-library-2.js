// "영화볼지도 색상 - 2.0" 변수 컬렉션 생성 (Scripter용)
// 색상 토큰 완료 섹션의 스와치를 실시간으로 읽어 새 컬렉션에 등록.
// 기존 컬렉션(Primitives/Semantic 등)은 건드리지 않음.

const SECTION_ID = '35:184'
const COLLECTION_NAME = '영화볼지도 색상 - 2.0'

// 이미 있으면 재사용 — 없는 변수만 추가 (그룹 단위 재실행 지원)
const existing = await figma.variables.getLocalVariableCollectionsAsync()
let reuseColl = existing.find(c => c.name === COLLECTION_NAME) || null
const existingNames = new Set()
if (reuseColl) {
  for (const id of reuseColl.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    existingNames.add(v.name)
  }
}

const section = await figma.getNodeByIdAsync(SECTION_ID)
if (!section) throw new Error('색상 토큰 완료 섹션 못 찾음')
const all = section.findAll(n => true)

// ── 스와치 수집 + 분류 ──
const cand = all.filter(n =>
  (n.type === 'RECTANGLE' || (n.type === 'FRAME' && n.children.length === 0)) &&
  n.width >= 50 && n.height >= 40 && n.width < 300 &&
  n.fills !== figma.mixed && n.fills.length && n.fills[0].type === 'SOLID' && n.fills[0].visible !== false)
const uniq = [...new Map(cand.map(n => [n.id, n])).values()]
const hslOf = n => {
  const c = n.fills[0].color
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b)
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  let h = -1
  if (max !== min) {
    if (max === c.r) h = ((c.g - c.b) / (max - min)) % 6
    else if (max === c.g) h = (c.b - c.r) / (max - min) + 2
    else h = (c.r - c.g) / (max - min) + 4
    h = Math.round(h * 60); if (h < 0) h += 360
  }
  return { h, s, l, rgb: c }
}
const groups = { grey: [], primary: [], warning: [], success: [], error: [], gv: [], white: [] }
for (const sw of uniq) {
  const { h, s, l } = hslOf(sw)
  // 화이트 = 진짜 #FFFFFF만 (웜 화이트 L98은 그레이로)
  if (l > 0.995 && s < 0.05) { groups.white.push(sw); continue }
  const isGrey = h === -1 || s < 0.1 || (h >= 15 && h <= 60 && s < 0.45)
  if (isGrey) groups.grey.push(sw)
  else if (h >= 200 && h <= 250) groups.primary.push(sw)
  else if (h >= 255 && h <= 305) groups.gv.push(sw)
  else if (h >= 25 && h <= 55) groups.warning.push(sw)
  else if (h >= 90 && h <= 170) groups.success.push(sw)
  else if (h <= 20 || h >= 345) groups.error.push(sw)
}
for (const arr of Object.values(groups)) arr.sort((a, b) => hslOf(a).l - hslOf(b).l)

// ── 이름·설명·역할 (어두운 순) ──
const T = 'TEXT_FILL', F = ['FRAME_FILL', 'SHAPE_FILL'], K = 'STROKE_COLOR'
const DEFS = {
  grey: [
    ['neutral/900', '텍스트 프라이머리 · 제목', [T]],
    ['neutral/800', '강조 텍스트', [T]],
    ['neutral/700', '본문 텍스트', [T]],
    ['neutral/600', '서브 텍스트', [T]],
    ['neutral/500', '캡션 · 메타', [T]],
    ['neutral/400', '플레이스홀더', [T]],
    ['neutral/300', '비활성 · 보조 구분', [K, ...F]],
    ['neutral/200', '보더 · 구분선', [K]],
    ['neutral/100', '페이지 배경 (미색 종이) · 눌린 면', F],
  ],
  primary: [
    ['primary/900', '틴트 위 텍스트', [T]],
    ['primary/800', 'hover · 프레스', F],
    ['primary/700', 'base — 버튼·CTA·활성 (크림 글자)', [...F, T]],
    ['primary/600', '보조 액센트', [...F, K]],
    ['primary/500', '아이콘 액센트 — 글자 얹기 금지', F],
    ['primary/400', '차트 · 보조', F],
    ['primary/300', '연한 보더', [K]],
    ['primary/200', '틴트 보더', [K]],
    ['primary/100', 'subtle — 활성 칩 · 틴트 배경', F],
  ],
  warning: [
    ['warning/900', '틴트 위 텍스트', [T]],
    ['warning/700', '색 텍스트 + 솔리드 배지 배경 (겸직)', [...F, T]],
    ['warning/500', '아이콘·보더 전용 — 글자 얹기 금지', [...F, K]],
    ['warning/300', '연한 보더', [K]],
    ['warning/100', '틴트 배경', F],
  ],
  success: [
    ['success/900', '틴트 위 텍스트', [T]],
    ['success/700', '색 텍스트 + 솔리드 칩("상영중") 배경', [...F, T]],
    ['success/500', '아이콘·보더 — 글자 얹기 금지', [...F, K]],
    ['success/300', '연한 보더', [K]],
    ['success/100', '틴트 배경', F],
  ],
  error: [
    ['error/900', '색 텍스트("매진") + 솔리드 칩 배경 (L40 겸직) + 틴트 위 텍스트', [...F, T]],
    ['error/700', '아이콘·보더 — 글자 얹기 금지 (L52 무인지대)', [...F, K]],
    ['error/500', '연한 액센트', F],
    ['error/300', '틴트 보더', [K]],
    ['error/100', '틴트 배경', F],
  ],
  gv: [
    ['gv/900', '핀·배지 솔리드 + 색 텍스트 + 틴트 위 텍스트 (3겸직)', [...F, T]],
    ['gv/500', '아이콘·연한 액센트 — 글자 얹기 금지', F],
    ['gv/100', '틴트 배경', F],
  ],
  white: [
    ['white', 'surface/card — 순백 카드. 미색 종이 위에 뜨는 면', F],
  ],
}

// ── 컬렉션 생성/재사용 ──
const coll = reuseColl || figma.variables.createVariableCollection(COLLECTION_NAME)
if (!reuseColl) coll.renameMode(coll.modes[0].modeId, 'Light')
const mode = coll.modes[0].modeId
const made = [], warns = []
for (const [key, defs] of Object.entries(DEFS)) {
  let arr = groups[key]
  let useDefs = defs
  // 그레이 10개면 최밝 스탑을 neutral/50으로 추가 등록
  if (key === 'grey' && arr.length === defs.length + 1) {
    useDefs = [...defs, ['neutral/50', '최밝 보조 스탑 (웜 화이트)', F]]
  }
  if (arr.length !== useDefs.length) {
    warns.push(`⚠ ${key}: 스와치 ${arr.length} vs 정의 ${useDefs.length} — 건너뜀. HSL: ` +
      arr.map(s => { const { h, s: ss, l } = hslOf(s); return `H${h}/S${Math.round(ss * 100)}/L${Math.round(l * 100)}` }).join(' '))
    continue
  }
  for (let i = 0; i < arr.length; i++) {
    const [name, desc, scopes] = useDefs[i]
    if (existingNames.has(name)) { continue }
    const v = figma.variables.createVariable(name, coll, 'COLOR')
    v.setValueForMode(mode, hslOf(arr[i]).rgb)
    v.description = desc
    v.scopes = scopes
    v.setVariableCodeSyntax('WEB', `var(--color-${name.replace('/', '-')})`)
    const { h, s, l } = hslOf(arr[i])
    made.push(`${name}  H${h} S${Math.round(s * 100)} L${Math.round(l * 100)}  — ${desc}`)
  }
}
// ── 결과 리포트: 캔버스에 텍스트로 직접 씀 (Scripter 콘솔 안 보이는 문제 대응) ──
const reportLines = [
  `[등록 리포트] ${new Date().toLocaleTimeString()}`,
  `그룹별 감지: ` + Object.entries(groups).map(([k, v]) => `${k}:${v.length}`).join(' '),
  ...warns,
  `신규 등록 ${made.length}개:`,
  ...made,
]
const old = section.findOne(n => n.type === 'TEXT' && n.name === '등록 리포트')
if (old) old.remove()
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const rep = figma.createText()
rep.name = '등록 리포트'
rep.characters = reportLines.join('\n')
rep.fontSize = 12
rep.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
section.appendChild(rep)
rep.x = 0; rep.y = -reportLines.length * 18 - 40  // 섹션 위쪽에 배치
console.log(reportLines.join('\n'))
