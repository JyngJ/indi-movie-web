// display/map-label 정리 (Scripter용) — 2026-08-19
//
// 1.0 텍스트 스타일 중 마지막 하나. KIMM Bold 11px, 지도 라벨용으로 만들었지만
// 코드에도 피그마에도 쓰는 곳이 0이다(2026-08-19 덤프 기준).
// 실제 지도 핀 라벨은 2.0/label(10) · 2.0/num/seat(12)로 이미 갈아탔다.
//
// 안전장치: 문서 전체를 훑어 이 스타일을 쓰는 텍스트 노드가 하나라도 있으면
// 삭제하지 않고 목록만 찍는다. 없을 때만 지운다.
// idempotent — 여러 번 돌려도 같은 결과.

const NAME = 'display/map-label'

let styles
try {
  styles = await figma.getLocalTextStylesAsync()
  console.log(`완료: 텍스트 스타일 ${styles.length}개 조회`)
} catch (e) {
  console.log('실패: 스타일 조회 —', e.message)
  throw e
}

const target = styles.find(s => s.name === NAME)
if (!target) {
  console.log(`건너뜀: '${NAME}' 없음 — 이미 정리된 상태`)
} else {
  try {
    await figma.loadAllPagesAsync()
  } catch (e) {
    console.log('실패: 페이지 로드 —', e.message)
    throw e
  }

  const users = []
  for (const page of figma.root.children) {
    for (const node of page.findAllWithCriteria({ types: ['TEXT'] })) {
      const id = node.textStyleId
      if (typeof id === 'string' && id === target.id) {
        users.push(`${page.name} / ${node.name}`)
      }
    }
  }

  if (users.length) {
    console.log(`중단: '${NAME}'을 쓰는 노드 ${users.length}곳 —`)
    for (const u of users.slice(0, 20)) console.log('  ·', u)
    console.log('먼저 2.0 스타일로 옮긴 뒤 다시 돌릴 것.')
  } else {
    target.remove()
    console.log(`완료: '${NAME}' 삭제 — 사용처 0`)
  }
}

console.log('끝. dump-state 다시 돌린 뒤 npm run ds:build 실행할 것.')
