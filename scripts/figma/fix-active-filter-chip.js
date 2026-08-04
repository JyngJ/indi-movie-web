// ActiveFilterChip — Kind 축 제거, 단일 컴포넌트로 (Scripter용)
// 국기는 라벨 문자열의 일부 (코드 withFlag 방식 그대로)

const page = figma.root.children.find(p => p.name === 'Design System')
await page.loadAsync()
await figma.setCurrentPageAsync(page)
const compSec = page.children.find(n => n.type === 'SECTION' && n.name === 'Components 2.0')

await figma.loadFontAsync({ family: 'Pretendard', style: 'SemiBold' })

const set = compSec.findOne(n => n.type === 'COMPONENT_SET' && n.name === '2.0/ActiveFilterChip')
if (!set) throw new Error('셋 못 찾음')
const x = set.x, y = set.y

// 장르 variant를 단일 컴포넌트로 승격
const keep = set.children.find(c => c.name.includes('장르')) || set.children[0]
for (const t of keep.findAll(n => n.type === 'TEXT')) await figma.loadFontAsync(t.fontName)

const w = keep.width, h = keep.height
const clone = keep.clone()
compSec.appendChild(clone)
try { clone.layoutSizingHorizontal = 'FIXED' } catch (e) {}
clone.resize(w, h)
// clone은 COMPONENT로 복제됨 — 이름·프로퍼티 정리
clone.name = '2.0/ActiveFilterChip'
clone.x = x; clone.y = y
clone.description = '적용된 필터 칩 (탭=해제). 라벨에 국기 포함 가능: "🇯🇵 일본" — 코드 withFlag(n) 방식. 국기는 콘텐츠지 UI 색 아님.'

// 라벨 프로퍼티 재정의
const labelText = clone.findOne(n => n.type === 'TEXT')
if (labelText) {
  const existing = Object.keys(clone.componentPropertyDefinitions || {})
  let ref = existing.find(k => k.startsWith('라벨'))
  if (!ref) ref = clone.addComponentProperty('라벨', 'TEXT', '드라마')
  labelText.componentPropertyReferences = { characters: ref }
}

set.remove()

// 시연: 옆에 국가 라벨 인스턴스
const demo = clone.createInstance()
compSec.appendChild(demo)
demo.x = x + clone.width + 16; demo.y = y
const dt = demo.findOne(n => n.type === 'TEXT')
if (dt) { await figma.loadFontAsync(dt.fontName); dt.characters = '🇯🇵 일본' }
demo.name = 'demo — 국가 라벨 예시'

console.log('ActiveFilterChip 단일화 완료 + 국가 예시 인스턴스')
