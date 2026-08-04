// build-films-color — FilmsTab TOBE (grayscale) 복제 → (Color) + 2.0 변수 일괄 바인딩 (Scripter용)
//
// 1. 섹션 "FilmsTab TOBE (Color)" 생성, TOBE · Mobile / TOBE · PC 복제
// 2. 그레이스케일 hex → "영화볼지도 색상 - 2.0" 변수 바인딩 (fills·strokes)
//    구판 회색값(#DDD9CF·#4A4540·#1A1714 등)은 근접 2.0 뉴트럴로 승격
//    #000(인스타 카드)·저대비 워터마크는 그대로 (의도된 고정색)
// 3. 인스턴스 내부는 스킵 — 컴포넌트가 이미 변수 관리
//
// 실행: Scripter 붙여넣고 Run.

const report = { bound: {}, skipped: 0 }
function walk(node, fn) { fn(node); if ('children' in node) for (const c of node.children) walk(c, fn) }

// ── 그레이스케일 hex → 2.0 변수명 ──
const MAP = {
  'FAF9F8': 'neutral/100',
  'FFFFFF': 'white',
  'EAE5E1': 'neutral/200',
  'DDD9CF': 'neutral/200',   // 구판 라인색 → 2.0 보더
  'C6BFB9': 'neutral/300',
  'A7A19A': 'neutral/400',
  '8D8781': 'neutral/500',
  '726B65': 'neutral/600',
  '58524B': 'neutral/700',
  '4A4540': 'neutral/700',   // 구판 700
  '2B2622': 'neutral/800',
  '1A1714': 'neutral/900',   // 구판 잉크
  '0C0A08': 'neutral/900',
  '404E81': 'primary/700',
  'DCDFEA': 'primary/100',   // 레일 탭 틴트 근사
  'ECEFF9': 'primary/100',
}

// ── 2.0 변수 색인 ──
const varByName = {}
for (const coll of await figma.variables.getLocalVariableCollectionsAsync()) {
  if (coll.name !== '영화볼지도 색상 - 2.0') continue
  for (const id of coll.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id)
    varByName[v.name] = v
  }
}
if (!Object.keys(varByName).length) { figma.notify('2.0 색상 컬렉션 없음'); throw new Error('no collection') }

const toHex = c => [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()

function bindPaints(paints) {
  if (!paints || paints === figma.mixed) return null
  let changed = false
  const out = paints.map(p => {
    if (p.type !== 'SOLID') return p
    if (p.boundVariables && p.boundVariables.color) return p        // 이미 바인딩됨
    if (p.opacity != null && p.opacity < 0.5) return p              // 저대비 워터마크류 유지
    const name = MAP[toHex(p.color)]
    if (!name || !varByName[name]) return p
    changed = true
    report.bound[name] = (report.bound[name] || 0) + 1
    return figma.variables.setBoundVariableForPaint(p, 'color', varByName[name])
  })
  return changed ? out : null
}

// ── 섹션 복제 ──
let gray = null, page0 = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const sec of page.children) {
    if (sec.type === 'SECTION' && sec.name === 'FilmsTab TOBE (grayscale)') { gray = sec; page0 = page }
  }
}
if (!gray) { figma.notify('grayscale 섹션 없음'); throw new Error('no section') }
figma.currentPage = page0

let color = page0.children.find(n => n.type === 'SECTION' && n.name === 'FilmsTab TOBE (Color)')
if (!color) {
  color = figma.createSection()
  color.name = 'FilmsTab TOBE (Color)'
  color.x = gray.x
  color.y = gray.y + gray.height + 200
  color.resizeWithoutConstraints(gray.width, gray.height)
}

for (const name of ['TOBE · Mobile', 'TOBE · PC']) {
  const src = gray.children.find(n => n.name === name)
  if (!src) continue
  // 기존 복제본 있으면 삭제 후 재생성
  const prev = color.children.find(n => n.name === name)
  if (prev) prev.remove()
  const clone = src.clone()
  color.appendChild(clone)
  clone.x = src.x; clone.y = src.y

  // ── 변수 바인딩 (인스턴스 내부 스킵) ──
  const stack = [clone]
  while (stack.length) {
    const n = stack.pop()
    if (n.type === 'INSTANCE') { report.skipped++; continue }       // 컴포넌트가 관리
    try {
      const f = bindPaints(n.fills);   if (f) n.fills = f
      const s = bindPaints(n.strokes); if (s) n.strokes = s
    } catch (e) { /* 잠긴 속성 등 — 무시 */ }
    if ('children' in n) for (const c of n.children) stack.push(c)
  }
}

// ── 리포트 ──
await figma.loadFontAsync({ family:'Pretendard', style:'Regular' })
const lines = ['build-films-color 결과',
  ...Object.entries(report.bound).map(([k, v]) => `${k}: ${v}곳`),
  `인스턴스 스킵: ${report.skipped}`]
const t = figma.createText()
t.fontName = { family:'Pretendard', style:'Regular' }
t.characters = lines.join('\n')
page0.appendChild(t)
t.x = color.x + color.width + 40; t.y = color.y
figma.viewport.scrollAndZoomIntoView([color])
figma.notify('Color 섹션 생성 + 변수 바인딩 완료')
