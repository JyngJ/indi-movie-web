// DateCell(4) + PosterItem(2) + MovieCard(1) 컴포넌트 추출 (Scripter용)
// 소스: 'Design System - work' TOBE Color expanded → 생성: 'Design System' Components 2.0
// 규칙: 오토레이아웃 밖으로 꺼낼 땐 치수 기록 → FIXED + resize 복원

const WORK_PAGE = 'Design System - work'
const TARGET_PAGE = 'Design System'

for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync({ family: 'Pretendard', style: s })
try { await figma.loadFontAsync({ family: 'KIMM_Bold', style: 'B' }) } catch (e) {}
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

const workPage = figma.root.children.find(p => p.name === WORK_PAGE)
const targetPage = figma.root.children.find(p => p.name === TARGET_PAGE)
if (!workPage || !targetPage) throw new Error('페이지 못 찾음')
await workPage.loadAsync()
await targetPage.loadAsync()
await figma.setCurrentPageAsync(targetPage)

const section = workPage.children.find(n => n.type === 'SECTION' && n.name === 'TheaterSheet TOBE (Color)')
const expanded = section && section.findOne(n => n.type === 'FRAME' && n.name === 'TOBE · Mobile expanded')
if (!expanded) throw new Error('TOBE expanded 못 찾음')

let compSection = targetPage.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
if (!compSection) throw new Error('Components 2.0 섹션 없음 — ShowtimeCell 먼저')

// 원본 텍스트 폰트 로드 헬퍼
const loadFonts = async node => {
  for (const t of node.findAll(n => n.type === 'TEXT')) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }
}
// 클론 → 섹션 이동 → 치수 복원 → 컴포넌트화
const toComp = async (src, name) => {
  const w = src.width, h = src.height
  await loadFonts(src)
  const c = src.clone()
  c.name = name
  compSection.appendChild(c)
  try { c.layoutSizingHorizontal = 'FIXED' } catch (e) {}
  c.resize(w, h)
  return figma.createComponentFromNode(c)
}
const label = (chars, x, y) => {
  const t = figma.createText()
  t.fontName = { family: 'KIMM_Bold', style: 'B' }
  t.characters = chars
  t.fontSize = 20
  t.letterSpacing = { unit: 'PERCENT', value: 5 }
  t.fills = [{ type: 'SOLID', color: { r: 0.047, g: 0.039, b: 0.031 } }]
  compSection.appendChild(t)
  t.x = x; t.y = y
}
const layoutSet = (set, x, y, desc) => {
  set.layoutMode = 'HORIZONTAL'
  set.primaryAxisSizingMode = 'AUTO'
  set.counterAxisSizingMode = 'AUTO'
  set.itemSpacing = 20
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 28
  set.x = x; set.y = y
  set.description = desc
}
const results = []

// ═══ 1. DateCell ═══
{
  const old = compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/DateCell')
  if (old) old.remove()
  const datebar = expanded.findOne(n => n.type === 'FRAME' && n.name === 'datebar')
  if (!datebar) throw new Error('datebar 못 찾음')
  const cellOf = ch => datebar.children.find(c => c.type === 'FRAME' && c.findOne && c.findOne(t => t.type === 'TEXT' && t.characters === ch))
  const src = {
    '오늘': cellOf('오늘'), '평일': cellOf('화'), '토요일': cellOf('토'), '일요일': cellOf('일'),
  }
  const comps = []
  for (const [kind, cell] of Object.entries(src)) {
    if (!cell) { results.push(`⚠ DateCell ${kind} 원본 못 찾음`); continue }
    comps.push(await toComp(cell, `Kind=${kind}`))
  }
  const set = figma.combineAsVariants(comps, compSection)
  set.name = '2.0/DateCell'
  layoutSet(set, 60, 320, '날짜바 셀. 오늘=primary/700 박스+크림, 평일 500, 토=primary/500, 일=error/700. 밑줄 인디케이터 포함.')
  label('DateCell', 60, 280)
  results.push(`DateCell: ${comps.length} variants`)
}

// ═══ 2. PosterItem ═══
{
  const old = compSection.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/PosterItem')
  if (old) old.remove()
  const posters = expanded.findOne(n => n.type === 'FRAME' && n.name === 'posters')
  if (!posters) throw new Error('posters 못 찾음')
  const films = posters.children.filter(c => c.type === 'FRAME')
  // 선택된 아이템 = 후손 중 stroke 있는 사각형 보유
  const isSelected = f => !!f.findOne(n => (n.type === 'RECTANGLE' || n.type === 'FRAME') && n.strokes && n.strokes.length > 0)
  const selFilm = films.find(isSelected) || films[0]
  const unselFilm = films.find(f => f !== selFilm)
  const comps = []
  comps.push(await toComp(selFilm, 'Selected=True'))
  if (unselFilm) comps.push(await toComp(unselFilm, 'Selected=False'))
  const set = figma.combineAsVariants(comps, compSection)
  set.name = '2.0/PosterItem'
  layoutSet(set, 460, 320, '포스터+제목+감독 묶음. 선택=primary/700 보더+배지. radius/poster 2px.')
  label('PosterItem', 460, 280)
  results.push(`PosterItem: ${comps.length} variants`)
}

// ═══ 3. MovieCard ═══
{
  const old = compSection.findOne(n => n.type === 'COMPONENT' && n.name === '2.0/MovieCard')
  if (old) old.remove()
  const card = expanded.findOne(n => n.type === 'FRAME' && n.name === 'movie-card')
  if (!card) throw new Error('movie-card 못 찾음')
  const comp = await toComp(card, '2.0/MovieCard')
  comp.x = 60; comp.y = 560
  comp.description = '선택 영화 상세 카드. 제목 20 · 태그는 메타 텍스트(색 금지) · 감독 행 · 2분할 버튼. 폭 358 기준.'
  label('MovieCard', 60, 520)
  results.push('MovieCard: 단일 컴포넌트')
}

console.log(results.join('\n'))
