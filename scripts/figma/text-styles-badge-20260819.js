// 텍스트 스타일 정리 (Scripter용) — 2026-08-19
//
// 1. 2.0/badge 신설 (Pretendard Bold 10 / lh 100%) — 코드 --text-badge(10px)+700 정합.
//    구 1.0 ui/badge는 9px라 못 쓴다. 2.0 세트에 배지 스타일이 없어서 10곳이 직접 지정 상태였다.
// 2. 2.0/meta-strong 신설 (Pretendard SemiBold 12 / lh 150%) — FilterPill·FilterButton·
//    ActiveFilterChip 라벨(코드 --text-meta + 600)이 쓰는 조합인데 스타일이 없었다.
// 3. 스타일 안 걸린 텍스트 노드를 실측 일치하는 2.0 스타일로 링크.
//    11px 잔재(스케일 밖)는 12px 스타일로 올린다. 13px는 스케일 밖이면서 코드도 13이라
//    건드리지 않고 콘솔에 목록만 남긴다(코드 쪽 결정 필요).
//
// idempotent — 여러 번 돌려도 같은 결과.

const P = s => ({ family: 'Pretendard', style: s })

/* ── 0. 폰트 로드 ─────────────────────────────────────────── */
try {
  for (const s of ['Bold', 'SemiBold', 'Medium', 'Regular']) await figma.loadFontAsync(P(s))
  console.log('완료: 폰트 로드')
} catch (e) {
  console.log('실패: 폰트 로드 —', e.message)
  throw e
}

/* ── 1. 신규 텍스트 스타일 ─────────────────────────────────── */
// [이름, fontName, size, lineHeight%, letterSpacing, 설명]
const NEW_STYLES = [
  ['2.0/badge', P('Bold'), 10, 100, 0,
    '배지·오버레이 칩 숫자 — 코드 --text-badge(10) + 700. 포스터 위 최소 라벨.'],
  ['2.0/meta-strong', P('SemiBold'), 12, 150, 0,
    '필터 칩·토글 라벨 — 코드 --text-meta(12) + 600. meta(Regular)의 강조판.'],
]

const styleIds = {}
try {
  const existing = await figma.getLocalTextStylesAsync()
  for (const st of existing) styleIds[st.name] = st.id

  for (const [name, font, size, lh, ls, desc] of NEW_STYLES) {
    let st = existing.find(s => s.name === name)
    const isNew = !st
    if (!st) { st = figma.createTextStyle(); st.name = name }
    st.fontName = font
    st.fontSize = size
    st.lineHeight = { unit: 'PERCENT', value: lh }
    st.letterSpacing = { unit: 'PIXELS', value: ls }
    st.description = desc
    styleIds[name] = st.id
    console.log(`완료: 스타일 ${isNew ? '생성' : '갱신'} — ${name} (${font.style} ${size}/${lh}%)`)
  }
} catch (e) {
  console.log('실패: 스타일 등록 —', e.message)
  throw e
}

/* ── 2. 무스타일 텍스트 → 스타일 링크 ──────────────────────── */
// key: `${size}/${fontStyle}` → 링크할 스타일 이름
// 11px은 2.0 스케일(10·12·14·16·20·24)에 없는 잔재 — 12px 스타일로 승격한다.
const MAP = {
  '10/Bold':       '2.0/badge',
  '10/Medium':     '2.0/label',
  '10/Regular':    '2.0/label',        // 도큐먼트 캡션 — Regular→Medium 승격
  '11/Regular':    '2.0/meta',         // 11 잔재 → 12
  '11/Medium':     '2.0/note',
  '11/SemiBold':   '2.0/meta-strong',
  '12/Regular':    '2.0/meta',
  '12/Medium':     '2.0/note',
  '12/SemiBold':   '2.0/meta-strong',
}
// 손대지 않을 것: KIMM(디스플레이·맵 라벨), 14px 이상(이미 스타일 있음), 13px(스케일 밖 + 코드도 13)
const SKIP_FAMILIES = ['KIMM_Bold', 'KIMM', 'Libre Baskerville', 'Inter']

const linked = {}
const skipped13 = []
const unmapped = {}

const isMixed = v => v === figma.mixed

async function visit(node, trail) {
  if (node.type === 'TEXT') {
    try {
      if (node.textStyleId && !isMixed(node.textStyleId)) return   // 이미 스타일 있음
      if (isMixed(node.fontName) || isMixed(node.fontSize)) return // 혼합 서식 — 사람이 볼 것
      const fam = node.fontName.family
      const sty = node.fontName.style
      const size = node.fontSize
      if (SKIP_FAMILIES.includes(fam)) return

      const key = `${size}/${sty}`
      if (size === 13) { skipped13.push(`${trail} · "${(node.characters || '').slice(0, 14)}" ${key}`); return }

      const target = MAP[key]
      if (!target) {
        if (size <= 13) unmapped[key] = (unmapped[key] || 0) + 1
        return
      }
      const id = styleIds[target]
      if (!id) { unmapped[`${key} (대상 ${target} 없음)`] = 1; return }

      await node.setTextStyleIdAsync(id)
      linked[`${key} → ${target}`] = (linked[`${key} → ${target}`] || 0) + 1
    } catch (e) {
      console.log(`실패: 노드 링크 ${trail} —`, e.message)
    }
    return
  }
  if ('children' in node) {
    for (const c of node.children) await visit(c, `${trail} > ${node.name}`)
  }
}

try {
  const pages = figma.root.children.filter(p => p.name === 'Design System fixed')
  if (!pages.length) throw new Error('페이지 "Design System fixed" 없음')
  for (const p of pages) {
    await p.loadAsync()
    for (const c of p.children) await visit(c, p.name)
  }
  console.log('완료: 링크 —', JSON.stringify(linked, null, 1))
} catch (e) {
  console.log('실패: 링크 순회 —', e.message)
  throw e
}

/* ── 3. 리포트 ────────────────────────────────────────────── */
const total = Object.values(linked).reduce((a, b) => a + b, 0)
console.log(`\n요약: ${total}개 텍스트에 스타일 링크`)
if (Object.keys(unmapped).length) console.log('매핑 없음(확인 필요):', JSON.stringify(unmapped, null, 1))
if (skipped13.length) {
  console.log(`\n13px ${skipped13.length}곳 — 스케일(10·12·14·16·20·24) 밖이라 스타일 안 만듦.`)
  console.log('코드도 13 하드코딩(FAB pill 13/600, Chip dropdown 13/500, FilterChip 13). 코드를 12나 14로 내리는 결정이 먼저다:')
  for (const s of skipped13) console.log('  ·', s)
}
figma.notify(`텍스트 스타일 정리 완료 — ${total}곳 링크`)
