// Elevation Model 프레임 PNG 내보내기 (Scripter용) — 2026-08-19
// 디자인 시스템 사이트 Elevation 페이지에 피그마 도식을 그대로 싣기 위한 2x 내보내기.
// idempotent — 돌릴 때마다 같은 이름으로 덮어쓴다.

const BASE = 'http://127.0.0.1:8765'
const TARGET = 'Elevation Model'

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', body })
  try { res.trailer && res.trailer.catch(() => {}) } catch { /* 무시 */ }
  return res
}

let found = null
for (const page of figma.root.children) {
  await page.loadAsync()
  for (const n of page.findAll(x => x.name === TARGET && (x.type === 'FRAME' || x.type === 'GROUP'))) {
    found = n
    break
  }
  if (found) break
}

if (!found) {
  console.log(`실패: '${TARGET}' 프레임을 못 찾음`)
} else {
  const bytes = await found.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } })
  await post(`${BASE}/png?name=${encodeURIComponent('elevation-model@2x')}`, bytes)
  console.log(`완료: ${TARGET} ${found.width}x${found.height} → elevation-model@2x.png (2x)`)
}
