/**
 * Search Console 실적 조회 — GSC 화면을 열지 않고 터미널에서 바로 읽는다.
 * 실행: npm run seo:gsc -- [옵션]
 *
 *   --query <문자열>   검색어 부분 일치 (예: 독립영화관)
 *   --page  <문자열>   페이지 URL 부분 일치 (예: /films/area/)
 *   --days  <숫자>     조회 기간, 기본 28
 *   --by    <차원>     query | page | date, 기본 query
 *   --limit <숫자>     행 수, 기본 20
 *
 * 예) 서울 지역 페이지가 노출되기 시작했는지
 *   npm run seo:gsc -- --page /films/area/ --by query
 */
import {
  querySearchAnalytics,
  dateRange,
  DATA_LAG_DAYS,
  DEFAULT_SITE_URL,
  type Dimension,
} from '../src/lib/seo/searchConsole'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const DIMENSIONS: Dimension[] = ['query', 'page', 'date']

function pad(s: string, width: number): string {
  // 한글은 터미널에서 두 칸을 먹어서 문자 수로 맞추면 열이 어긋난다
  const w = [...s].reduce((n, ch) => n + (/[ᄀ-ᇿ　-〿가-힯＀-￯]/.test(ch) ? 2 : 1), 0)
  return s + ' '.repeat(Math.max(0, width - w))
}

function truncate(s: string, max: number): string {
  return [...s].length > max ? `${[...s].slice(0, max - 1).join('')}…` : s
}

async function main() {
  const by = (arg('by') ?? 'query') as Dimension
  if (!DIMENSIONS.includes(by)) {
    console.error(`--by는 ${DIMENSIONS.join(' | ')} 중 하나예요 (받은 값: ${by})`)
    process.exit(1)
  }

  const days = Number(arg('days') ?? 28)
  const limit = Number(arg('limit') ?? 20)
  const query = arg('query')
  const page = arg('page')
  const { startDate, endDate } = dateRange(days)

  const filterLabel = [
    query ? `검색어 «${query}»` : null,
    page ? `페이지 «${page}»` : null,
  ].filter(Boolean).join(' · ') || '전체'

  console.log(`\n▌Search Console 실적 — ${process.env.GSC_SITE_URL ?? DEFAULT_SITE_URL}`)
  console.log(`  기간 ${startDate} ~ ${endDate} (${days}일, 데이터 지연 ${DATA_LAG_DAYS}일 반영)`)
  console.log(`  필터 ${filterLabel} · 기준 ${by}\n`)

  const rows = await querySearchAnalytics({
    startDate, endDate, dimensions: [by], query, page, rowLimit: limit,
  })

  if (rows.length === 0) {
    console.log('  노출된 행이 없어요. 필터를 넓히거나 기간을 늘려 보세요.\n')
    return
  }

  const keyWidth = by === 'page' ? 58 : 34
  console.log(`  ${pad(by, keyWidth)}${pad('클릭', 8)}${pad('노출', 9)}${pad('CTR', 8)}순위`)
  console.log(`  ${'─'.repeat(keyWidth + 30)}`)

  for (const row of rows) {
    const key = by === 'page'
      ? truncate(row.keys[0].replace(/^https?:\/\/[^/]+/, ''), keyWidth - 2)
      : truncate(row.keys[0], keyWidth - 2)
    console.log(
      `  ${pad(key, keyWidth)}${pad(String(row.clicks), 8)}${pad(String(row.impressions), 9)}` +
      `${pad(`${(row.ctr * 100).toFixed(1)}%`, 8)}${row.position.toFixed(1)}`,
    )
  }

  const totals = rows.reduce(
    (acc, r) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions }),
    { clicks: 0, impressions: 0 },
  )
  console.log(`  ${'─'.repeat(keyWidth + 30)}`)
  console.log(`  ${pad(`합계 ${rows.length}행`, keyWidth)}${pad(String(totals.clicks), 8)}${totals.impressions}\n`)
}

main().catch((err: unknown) => {
  console.error(`\n조회 실패: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
