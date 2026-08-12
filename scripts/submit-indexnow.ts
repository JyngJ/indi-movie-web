/**
 * IndexNow 수동 통보 — 배포 직후처럼 크롤 주기를 기다리지 않고 밀어넣고 싶을 때.
 * 실행: npm run seo:indexnow
 *
 * 상시 통보는 crawl:showtimes 파이프라인 끝에 붙어 자동으로 돈다.
 */
import { buildChangedUrls, submitToIndexNow, INDEXNOW_KEY } from '../src/lib/seo/indexNow'

async function main() {
  const urls = await buildChangedUrls()
  console.log(`통보 대상 ${urls.length}개 URL (키 파일: /${INDEXNOW_KEY}.txt)`)
  console.log(urls.slice(0, 5).map((u) => `  ${u}`).join('\n'))
  if (urls.length > 5) console.log(`  … 외 ${urls.length - 5}개`)

  const result = await submitToIndexNow(urls)
  if (result.ok) {
    console.log(`✅ ${result.submitted}개 통보 완료 (HTTP ${result.status})`)
  } else {
    console.error(`❌ 거부됨 (HTTP ${result.status}) — 키 파일이 사이트 루트에 공개돼 있는지 확인`)
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('IndexNow 통보 실패:', err)
  process.exit(1)
})
