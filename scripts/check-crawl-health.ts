import { createClient } from '@supabase/supabase-js'
import { notifyDiscordCrawlStale } from '../src/lib/crawl/notify-discord'

/** 크롤 크론(01/07/13시)의 최대 정상 간격은 12시간 — 한 회차 누락까지 버퍼를 두고 잡는다 */
const STALE_HOURS = Number(process.env.CRAWL_STALE_HOURS ?? 15)

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 최근 크롤 런 확인
  const { data: runs } = await supabase.from('crawl_runs')
    .select('source_name, status, created_count, error, started_at')
    .order('started_at', { ascending: false })
    .limit(5)
  console.log('=== 최근 크롤 런 ===')
  console.log(JSON.stringify(runs, null, 2))

  // enabled 소스 수
  const { count: enabledCount } = await supabase.from('crawl_sources')
    .select('id', { count: 'exact', head: true })
    .eq('enabled', true)
  console.log('\n활성 소스 수:', enabledCount)

  // unhealthy 소스
  const { data: unhealthy } = await supabase.from('crawl_sources')
    .select('id, theater_name, health, listing_url')
    .eq('health', 'unhealthy')
    .eq('enabled', true)
  console.log('\nunhealthy 소스:', JSON.stringify(unhealthy, null, 2))

  // 크롤러가 죽었는지 확인 — "돌긴 하는데 매번 실패"도 잡아야 하므로 성공(completed) 기준으로 신선도를 잰다.
  // 최근 실행 자체(상태 무관)만 보면 소스 전멸·인증 만료처럼 "돌지만 항상 실패"하는 가장 흔한 고장 모드를 놓친다.
  const { data: lastSuccess } = await supabase.from('crawl_runs')
    .select('started_at')
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastSuccessAt = lastSuccess?.started_at ?? null
  const hoursSinceLastSuccess = lastSuccessAt
    ? (Date.now() - new Date(lastSuccessAt).getTime()) / 3600_000
    : Infinity

  console.log(`\n마지막 성공 크롤: ${lastSuccessAt ?? '기록 없음'} (${hoursSinceLastSuccess === Infinity ? '∞' : hoursSinceLastSuccess.toFixed(1)}시간 전)`)

  if (hoursSinceLastSuccess > STALE_HOURS) {
    console.log(`STALE 감지 (임계값 ${STALE_HOURS}시간) — Discord 알림 발송`)
    await notifyDiscordCrawlStale(hoursSinceLastSuccess, lastSuccessAt)
  }
}

main()
