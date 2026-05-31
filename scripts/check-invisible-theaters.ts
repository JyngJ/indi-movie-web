/**
 * 크롤은 되는데 지도에 안보이는 극장 목록
 * - enabled=true 소스에서 최근 크롤 성공 (created_count>0)
 * - 하지만 showtimes 테이블에 미래 상영 없음
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const today = new Date().toISOString().slice(0, 10)

  // 1) 최근 3일 내 크롤 성공 소스 (created_count > 0)
  const { data: recentRuns } = await supabase
    .from('crawl_runs')
    .select('source_id, source_name, created_count, started_at')
    .eq('status', 'completed')
    .gt('created_count', 0)
    .gte('started_at', new Date(Date.now() - 3 * 86400_000).toISOString())
    .order('started_at', { ascending: false })

  // source별 최신 실행만
  const latestBySource = new Map<string, typeof recentRuns extends (infer T)[] | null ? T : never>()
  for (const run of recentRuns ?? []) {
    if (!latestBySource.has(run.source_id)) latestBySource.set(run.source_id, run)
  }

  console.log(`\n최근 3일 내 수집 성공 소스: ${latestBySource.size}개\n`)

  // 2) 각 소스별 미래 showtimes 수 확인
  const invisible: Array<{ sourceName: string; sourceId: string; candidates: number; showtimes: number; matchedTheaterId: string | null }> = []

  for (const [sourceId, run] of latestBySource) {
    // matched_theater_id 확인
    const { data: src } = await supabase
      .from('crawl_sources')
      .select('matched_theater_id')
      .eq('id', sourceId)
      .single()

    const matchedTheaterId = src?.matched_theater_id ?? null

    // 미래 candidates 수
    let candQuery = supabase
      .from('showtime_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', sourceId)
      .gte('show_date', today)
      .neq('status', 'rejected')
    const { count: candCount } = await candQuery

    // 미래 showtimes 수 (theater_id로 조회)
    let stCount = 0
    if (matchedTheaterId) {
      const { count } = await supabase
        .from('showtimes')
        .select('*', { count: 'exact', head: true })
        .eq('theater_id', matchedTheaterId)
        .gte('show_date', today)
      stCount = count ?? 0
    }

    if ((candCount ?? 0) > 0 && stCount === 0) {
      invisible.push({
        sourceName: run.source_name,
        sourceId,
        candidates: candCount ?? 0,
        showtimes: stCount,
        matchedTheaterId,
      })
    }
  }

  if (invisible.length === 0) {
    console.log('✅ 모든 수집 중 극장이 지도에 표시되고 있습니다.')
    return
  }

  console.log(`⚠️  크롤 성공 중이지만 지도에 안보이는 극장: ${invisible.length}개\n`)
  console.log('극장명'.padEnd(24), '후보'.padEnd(6), 'showtimes', 'theater_id')
  console.log('─'.repeat(70))
  for (const t of invisible.sort((a, b) => b.candidates - a.candidates)) {
    const theaterId = t.matchedTheaterId ? t.matchedTheaterId.slice(0, 8) + '...' : '❌ 없음'
    console.log(t.sourceName.padEnd(24), String(t.candidates).padEnd(6), String(t.showtimes).padEnd(10), theaterId)
  }

  // 3) matched_theater_id 없는 것만 따로 표시
  const noTheater = invisible.filter(t => !t.matchedTheaterId)
  if (noTheater.length > 0) {
    console.log(`\n🔴 matched_theater_id 미설정 (theater 연결 필요): ${noTheater.length}개`)
    for (const t of noTheater) console.log(`   - ${t.sourceName} (source: ${t.sourceId.slice(0,8)})`)
  }

  // 4) theater 있지만 candidates만 있는 경우 (자동승인 안된 것)
  const hasTheaterNoCands = invisible.filter(t => t.matchedTheaterId)
  if (hasTheaterNoCands.length > 0) {
    console.log(`\n🟡 theater 연결됐지만 candidates가 승인 안된 경우: ${hasTheaterNoCands.length}개`)
    for (const t of hasTheaterNoCands) {
      // candidates 상태 분포 확인
      const { data: statusDist } = await supabase
        .from('showtime_candidates')
        .select('status, confidence')
        .eq('source_id', t.sourceId)
        .gte('show_date', today)
        .neq('status', 'rejected')
        .limit(20)

      const statuses = (statusDist ?? []).reduce((acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)

      const avgConf = statusDist && statusDist.length > 0
        ? (statusDist.reduce((s, c) => s + c.confidence, 0) / statusDist.length).toFixed(2)
        : 'N/A'

      const statusStr = Object.entries(statuses).map(([k, v]) => `${k}:${v}`).join(', ')
      console.log(`   - ${t.sourceName} | ${t.candidates}개 | ${statusStr} | avg_conf: ${avgConf}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
