// DateCell — 상영있음을 variant 축으로 통일 (Scripter용)
// 목표: Kind(오늘/평일/토요일/일요일) × 상영있음(True/False) = 8 variants
// 불리언 프로퍼티 잔재 제거, 누락 variant 자동 생성

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)

const section = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')
const set = section.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/DateCell')
if (!set) throw new Error('셋 못 찾음')

const log = []

// ── 1. 축 통일 먼저 — 셋이 '에러 상태'면 프로퍼티 API가 잠기므로 이름부터 정규화 ──
for (const variant of set.children) {
  if (!variant.name.includes('상영있음')) {
    variant.name = variant.name + ', 상영있음=True'
    log.push(`정규화: ${variant.name}`)
  }
}
// 중복 variant 이름 검사 (있으면 뒤엣것에 -dup 표기만 하고 보고)
const seen = new Set()
for (const variant of set.children) {
  if (seen.has(variant.name)) {
    variant.name = variant.name + ' -dup'
    log.push(`⚠ 중복 발견: ${variant.name} — 수동 확인 필요`)
  } else seen.add(variant.name)
}

// ── 2. 불리언 프로퍼티 잔재 제거 (축 정리 후에야 접근 가능) ──
for (const variant of set.children) {
  for (const bar of variant.findAll(n => n.type === 'RECTANGLE' && n.height <= 6 && n.width <= 40)) {
    try { bar.componentPropertyReferences = {} } catch (e) {}
  }
}
try {
  for (const key of Object.keys(set.componentPropertyDefinitions)) {
    const def = set.componentPropertyDefinitions[key]
    if (def.type === 'BOOLEAN') {
      try { set.deleteComponentProperty(key); log.push(`불리언 프로퍼티 삭제: ${key}`) } catch (e) { log.push(`⚠ 삭제 실패: ${key} — ${e.message}`) }
    }
  }
} catch (e) {
  log.push('⚠ 프로퍼티 정의 접근 불가: ' + e.message + ' — variant 이름이 아직 불일치할 수 있음, 콘솔의 variant 목록 확인')
}

// ── 3. 누락된 False variant 생성 (True 복제 → 밑줄 숨김) ──
const kinds = ['오늘', '평일', '토요일', '일요일']
for (const kind of kinds) {
  const hasFalse = set.children.some(v => v.name.includes(`Kind=${kind}`) && v.name.includes('상영있음=False'))
  if (hasFalse) continue
  const trueVar = set.children.find(v => v.name.includes(`Kind=${kind}`) && v.name.includes('상영있음=True'))
  if (!trueVar) { log.push(`⚠ ${kind}: True variant 없음`); continue }
  for (const t of trueVar.findAll(n => n.type === 'TEXT')) {
    if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName)
  }
  const clone = trueVar.clone() // 같은 셋 안에 복제 → variant로 합류
  clone.name = `Kind=${kind}, 상영있음=False`
  const bar = clone.findOne(n => n.type === 'RECTANGLE' && n.height <= 6 && n.width <= 40)
  if (bar) bar.visible = false
  log.push(`생성: ${clone.name}`)
}

// ── 4. 낡은 데모 인스턴스 정리 ──
for (const d of page.findAll(n => n.name && (n.name.startsWith('datecell-demo') || n.name === 'demo-label'))) d.remove()

// ── 5. 셋 정렬 ──
set.layoutMode = 'HORIZONTAL'
set.primaryAxisSizingMode = 'AUTO'
set.counterAxisSizingMode = 'AUTO'
set.itemSpacing = 16
set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24
set.description = '날짜바 셀. Kind × 상영있음(밑줄 = 선택 영화가 그 날 상영). 코드: availableDates.has(date)'

const names = set.children.map(v => v.name)
console.log(log.join('\n') + '\n최종 variants (' + names.length + '):\n' + names.join('\n'))
