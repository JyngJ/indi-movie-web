// 로컬 버튼 프레임 → 컴포넌트 인스턴스 교체 (2026-08-09 전수 감사분)
//  대상: Detail Screens TOBE 버튼 8 + 정렬 pill 2 / FilmsTab TOBE·Loading CTA 2 /
//        Popups 버튼 5 / 설문 TOBE 선택지 → 2.0/SurveyChoice
//  스킵: ASIS 프레임(보존), 탭바(내비 문법), 데모·문서 프레임
// Scripter에서 Run.

const report = []
for (const f of [{ family: 'Pretendard', style: 'Regular' }, { family: 'Pretendard', style: 'Medium' }, { family: 'Pretendard', style: 'SemiBold' }, { family: 'Pretendard', style: 'Bold' }]) await figma.loadFontAsync(f)

function findVariant(setName, variantName) {
  for (const page of figma.root.children) {
    const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === setName)
    if (set) return set.children.find(c => c.name === variantName) ?? null
  }
  report.push('배리언트 없음: ' + setName + '/' + variantName)
  return null
}

/** 로컬 프레임을 인스턴스로 교체 — 같은 부모·같은 인덱스, 폭·FILL 상속, 텍스트 오버라이드 */
async function replaceWithInstance(nodeId, variant, label, opts = {}) {
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node) { report.push('노드 없음: ' + nodeId); return }
  if (!variant) return
  const parent = node.parent
  const idx = parent.children.indexOf(node)
  const inst = variant.createInstance()
  parent.insertChild(idx, inst)
  // 텍스트 오버라이드
  const t = inst.findOne(n => n.type === 'TEXT')
  if (t && label) { try { t.characters = label } catch { report.push('텍스트 실패: ' + label) } }
  // 폭 계승
  try {
    if (opts.fill && 'layoutSizingHorizontal' in inst) inst.layoutSizingHorizontal = 'FILL'
    else if (opts.keepWidth) inst.resize(node.width, inst.height)
  } catch { /* 무시 */ }
  inst.x = node.x; inst.y = node.y
  node.remove()
}

const btn = (v, s) => findVariant('2.0/Button', `Variant=${v}, Size=${s}, Icon=none, State=default`)

/* ── A. Detail Screens TOBE ── */
await replaceWithInstance('200:5409', btn('Primary', 'sm'), '지도에서 필터로 보기')
await replaceWithInstance('200:5529', btn('Primary', 'sm'), '지도에서 필터로 보기')
await replaceWithInstance('200:5630', btn('Primary', 'md'), '지도에서 보기')
await replaceWithInstance('200:5699', btn('Primary', 'md'), '지도에서 보기')
await replaceWithInstance('200:5793', btn('Primary', 'md'), '지도에서 필터로 보기')
await replaceWithInstance('200:5886', btn('Primary', 'md'), '지도에서 필터로 보기')
const sortActive = findVariant('2.0/SortToggle', 'State=active')
await replaceWithInstance('200:5826', sortActive, '상영중')
await replaceWithInstance('200:5919', sortActive, '상영중')

/* ── B. FilmsTab TOBE (Color·Loading) — 감독 카드 CTA ── */
await replaceWithInstance('112:2225', btn('Secondary', 'md'), '영화관 보기 ›', { keepWidth: true })
await replaceWithInstance('127:829', btn('Secondary', 'md'), '영화관 보기 ›', { keepWidth: true })

/* ── C. Popups & Overlays TOBE ── */
await replaceWithInstance('206:5989', btn('Primary', 'md'), '요청 보내기', { keepWidth: true })
await replaceWithInstance('206:6025', btn('Primary', 'md'), '요청 보내기', { keepWidth: true })
await replaceWithInstance('206:6060', btn('Primary', 'md'), '위치 허용하기', { keepWidth: true })
await replaceWithInstance('206:6097', btn('Primary', 'md'), '예매하러 가기', { keepWidth: true })
await replaceWithInstance('206:6110', btn('Primary', 'md'), '예매하러 가기', { keepWidth: true })

/* ── D. 설문 TOBE 선택지 → 2.0/SurveyChoice 인스턴스 ── */
const choiceOn = findVariant('2.0/SurveyChoice', 'State=on')
const choiceOff = findVariant('2.0/SurveyChoice', 'State=off')
for (const page of figma.root.children) {
  const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'FeedbackSurvey TOBE (2026-08-09)')
  if (!sec) continue
  for (const frame of sec.children) {
    if (frame.type !== 'FRAME' || !/step1/.test(frame.name)) continue
    const list = frame.findOne(n => n.name === 'choices')
    if (!list) continue
    for (const ch of [...list.children]) {
      if (!ch.name.startsWith('choice')) continue
      const on = ch.name.includes('on')
      const t = ch.findOne ? ch.findOne(n => n.type === 'TEXT') : null
      const label = t ? t.characters : ''
      const variant = on ? choiceOn : choiceOff
      if (!variant) continue
      const idx = list.children.indexOf(ch)
      const inst = variant.createInstance()
      list.insertChild(idx, inst)
      const it = inst.findOne(n => n.type === 'TEXT')
      if (it && label) { try { it.characters = label } catch { /* 무시 */ } }
      try { inst.layoutSizingHorizontal = 'FILL' } catch { /* 무시 */ }
      ch.remove()
    }
  }
}

figma.notify(`인스턴스 교체 완료${report.length ? ` · 경고 ${[...new Set(report)].length}` : ''}`)
if (report.length) console.log(report.join('\n'))
