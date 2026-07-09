/**
 * 주요 감독 필모그래피 프리시드 (KMDB 감독검색 기반).
 * 실행: npx tsx --env-file=.env.local scripts/seed-director-filmographies.ts
 *
 * 각 감독을 KMDB 감독검색(한글명, 철자 변형 포함)으로 조회해 필모를 가져오고,
 * kmdb_id 기준 중복 제거 후 importAdminExternalMovie로 임포트(포스터/장르 포함).
 * 멱등: importAdminExternalMovie가 kmdb_id로 dedup(있으면 update).
 * KMDB 감독검색은 listCount 30 상한이라 startCount로 페이지네이션해 필모 전체를 가져온다.
 */
import { searchKmdbByDirector } from '../src/lib/admin/kmdb'
import { importAdminExternalMovie } from '../src/lib/admin/store'

// 각 감독의 한글명(+철자 변형). 변형은 KMDB 표기가 불확실한 경우 다중 조회용.
const DIRECTORS: { label: string; names: string[] }[] = [
  { label: '스티븐 스필버그', names: ['스티븐 스필버그'] },
  { label: '마틴 스코세지', names: ['마틴 스코세지', '마틴 스콜세지', '마틴 스코시즈'] },
  { label: '리들리 스콧', names: ['리들리 스콧'] },
  { label: '제임스 카메론', names: ['제임스 카메론', '제임스 캐머런'] },
  { label: '크리스토퍼 놀란', names: ['크리스토퍼 놀란'] },
  { label: '쿠엔틴 타란티노', names: ['쿠엔틴 타란티노', '쿠엔틴 타란티노'] },
  { label: '코엔 형제', names: ['조엘 코엔', '에단 코엔', '코엔 형제'] },
  { label: '팀 버튼', names: ['팀 버튼'] },
  { label: '웨스 앤더슨', names: ['웨스 앤더슨'] },
  { label: '데이비드 핀처', names: ['데이비드 핀처'] },
  { label: '폴 토마스 앤더슨', names: ['폴 토마스 앤더슨'] },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let total = 0
  const perDirector: string[] = []

  for (const dir of DIRECTORS) {
    const seen = new Map<string, any>()
    for (const name of dir.names) {
      // 30편 페이지 단위로 결과가 30 미만이 될 때까지 순회 (안전 상한 5페이지=150편)
      for (let page = 0; page < 5; page++) {
        let results: any[] = []
        try {
          results = (await searchKmdbByDirector(name, page * 30)) as any[]
        } catch (e: any) {
          console.log(`  [${name} p${page}] 조회 오류: ${e.message}`)
          break
        }
        for (const m of results) {
          const key = `${m.movieId}|${m.movieSeq}`
          if (!seen.has(key)) seen.set(key, m)
        }
        await sleep(150)
        if (results.length < 30) break
      }
    }

    let imported = 0
    for (const m of seen.values()) {
      try {
        await importAdminExternalMovie(m)
        imported++
      } catch (e: any) {
        console.log(`    임포트 실패 ${m.title}: ${e.message}`)
      }
      await sleep(60)
    }
    total += imported
    perDirector.push(`  ${dir.label}: ${imported}편`)
    console.log(`✅ ${dir.label}: ${imported}편`)
  }

  console.log(`\n=== 완료 ===`)
  console.log(perDirector.join('\n'))
  console.log(`총 ${total}편 임포트(중복 update 포함)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
