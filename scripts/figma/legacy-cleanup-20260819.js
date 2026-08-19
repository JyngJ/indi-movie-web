// 1.0 잔재 정리 (Scripter용) — 2026-08-19
//
// 1. 1.0 텍스트 스타일을 쓰는 노드를 2.0 스타일로 갈아끼운다 (덤프 기준 48곳).
// 2. 1.0 이펙트 스타일(shadow/*)을 쓰는 노드를 2.0/shadow/*로 갈아끼운다.
//    1.0은 1겹, 2.0은 2겹(direct+ambient)이라 같은 이름이 다른 값을 가리키고 있었다.
// 3. 갈아끼운 뒤 1.0 스타일을 삭제한다. 남겨두면 다음 사람이 또 집는다.
// 4. 멀티플렉스 브랜드 색(brand/cgv·mega·lotte) 변수와 그 견본 행을 삭제한다.
//    독립·예술영화관만 다루는 서비스라 코드에서도 렌더된 적이 없어 같이 없앴다.
//
// 선행: text-styles-badge-20260819.js를 먼저 돌릴 것 (2.0/badge가 있어야 ui/badge를 옮긴다).
// idempotent — 여러 번 돌려도 같은 결과.

/* ── 매핑 ─────────────────────────────────────────────────────
   1.0 스타일 → 2.0 스타일. 크기가 다르면 2.0 스케일 쪽으로 내린다. */
const TEXT_MAP = {
  'display/h1': '2.0/display/h1',   // KIMM 24 → 24
  'display/h2': '2.0/display/h2',   // KIMM 22 → 20 (2.0에서 h2·h3 통합)
  'display/h3': '2.0/display/h2',   // KIMM 20 → 20
  'ui/title': '2.0/title',          // 17 Bold → 16 Bold
  'ui/subtitle': '2.0/body-strong', // 15 SemiBold → 14 Bold
  'ui/body': '2.0/body',            // 14 Medium → 14 Medium
  'ui/meta': '2.0/meta',            // 13 Regular → 12 Regular
  'ui/caption': '2.0/caption',      // 11 Medium → 12 Medium CAPS
  'ui/badge': '2.0/badge',          // 9 Bold → 10 Bold (신설 스타일)
  'num/time': '2.0/num/time',       // 17 Bold → 16 Bold
  'num/date': '2.0/num/time',       // 16 Bold → 16 Bold (time·date 통합)
  'num/seat': '2.0/num/seat',       // 12 SemiBold → 동일
  'num/dow': '2.0/label',           // 10 Medium → 10 Medium
  'latin/title': '2.0/meta',        // Baskerville 폐지 — 영문 원제는 meta로 흡수
  'latin/meta': '2.0/meta',
  // display/map-label(KIMM 11)은 지도 라벨 전용이고 2.0 대응이 없다 — 손대지 않는다.
}

const EFFECT_MAP = {
  'shadow/sm': '2.0/shadow/sm',
  'shadow/md': '2.0/shadow/md',
  'shadow/lg': '2.0/shadow/lg',
  'shadow/sheet': '2.0/shadow/sheet',
  'shadow/pin': '2.0/shadow/pin',
  'shadow/popup': '2.0/shadow/md',   // popup은 2.0에서 md로 흡수됐다
}

const DELETE_VARS = ['brand/cgv', 'brand/mega', 'brand/lotte']

/* ── 0. 스타일 목록 ──────────────────────────────────────────── */
let textStyles, effectStyles
try {
  textStyles = await figma.getLocalTextStylesAsync()
  effectStyles = await figma.getLocalEffectStylesAsync()
  console.log(`완료: 스타일 조회 — 텍스트 ${textStyles.length} · 이펙트 ${effectStyles.length}`)
} catch (e) {
  console.log('실패: 스타일 조회 —', e.message)
  throw e
}

const byName = list => Object.fromEntries(list.map(s => [s.name, s]))
const T = byName(textStyles)
const E = byName(effectStyles)

// 목적지 스타일이 없으면 그 매핑은 건너뛴다(잘못된 링크보다 낫다).
const missing = []
for (const [from, to] of Object.entries(TEXT_MAP)) if (T[from] && !T[to]) missing.push(`${from} → ${to}`)
for (const [from, to] of Object.entries(EFFECT_MAP)) if (E[from] && !E[to]) missing.push(`${from} → ${to}`)
if (missing.length) console.log('경고: 목적지 스타일 없음 —', missing.join(', '))

/* ── 1·2. 노드 순회하며 갈아끼우기 ───────────────────────────── */
const relinked = {}
const bump = k => { relinked[k] = (relinked[k] || 0) + 1 }

async function visit(node) {
  try {
    if (node.type === 'TEXT' && node.textStyleId && node.textStyleId !== figma.mixed) {
      const cur = textStyles.find(s => s.id === node.textStyleId)
      const to = cur && TEXT_MAP[cur.name]
      if (to && T[to]) {
        await node.setTextStyleIdAsync(T[to].id)
        bump(`text ${cur.name} → ${to}`)
      }
    }
    if ('effectStyleId' in node && node.effectStyleId && node.effectStyleId !== figma.mixed) {
      const cur = effectStyles.find(s => s.id === node.effectStyleId)
      const to = cur && EFFECT_MAP[cur.name]
      if (to && E[to]) {
        await node.setEffectStyleIdAsync(E[to].id)
        bump(`effect ${cur.name} → ${to}`)
      }
    }
  } catch (e) {
    console.log(`실패: 노드 ${node.name} —`, e.message)
  }
  if ('children' in node) for (const c of node.children) await visit(c)
}

try {
  for (const page of figma.root.children) {
    await page.loadAsync()
    for (const child of page.children) await visit(child)
  }
  console.log('완료: 재링크 —', JSON.stringify(relinked, null, 1))
} catch (e) {
  console.log('실패: 순회 —', e.message)
  throw e
}

/* ── 3. 1.0 스타일 삭제 ──────────────────────────────────────── */
const deleted = []
try {
  for (const name of Object.keys(TEXT_MAP)) {
    if (T[name]) { T[name].remove(); deleted.push(`text ${name}`) }
  }
  for (const name of Object.keys(EFFECT_MAP)) {
    if (E[name]) { E[name].remove(); deleted.push(`effect ${name}`) }
  }
  console.log(`완료: 1.0 스타일 삭제 ${deleted.length}개`)
} catch (e) {
  console.log('실패: 스타일 삭제 —', e.message)
}

/* ── 4. 멀티플렉스 브랜드 변수 + 견본 삭제 ───────────────────── */
try {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  let removedVars = 0
  for (const col of collections) {
    for (const id of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id)
      if (v && DELETE_VARS.includes(v.name)) { v.remove(); removedVars++ }
    }
  }
  console.log(`완료: 브랜드 변수 삭제 ${removedVars}개`)

  // 견본 행("Multiplex (핀 전용)" 프레임)도 같이 걷어낸다.
  let removedFrames = 0
  for (const page of figma.root.children) {
    await page.loadAsync()
    const stack = [...page.children]
    while (stack.length) {
      const n = stack.pop()
      if (typeof n.name === 'string' && n.name.startsWith('Multiplex')) { n.remove(); removedFrames++; continue }
      if ('children' in n) stack.push(...n.children)
    }
  }
  console.log(`완료: 멀티플렉스 견본 프레임 삭제 ${removedFrames}개`)
} catch (e) {
  console.log('실패: 브랜드 정리 —', e.message)
}

const total = Object.values(relinked).reduce((a, b) => a + b, 0)
figma.notify(`1.0 잔재 정리 — 재링크 ${total}곳 · 스타일 ${deleted.length}개 삭제`)
