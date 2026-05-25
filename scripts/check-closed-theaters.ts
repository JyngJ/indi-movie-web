import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const apply = process.argv.includes('--apply')

async function main() {
  console.log(`모드: ${apply ? '실제 삭제 (--apply)' : 'dry-run'}\n`)

  // 폐관 극장 목록
  const closedTheaters = ['중앙시네마']

  for (const name of closedTheaters) {
    console.log(`\n▶ ${name}`)

    const { data: sources } = await sb
      .from('crawl_sources')
      .select('id, theater_name, parser, enabled, listing_url')
      .eq('theater_name', name)
    console.log('  crawl_sources:', sources?.map(s => `${s.id} (${s.parser}, enabled=${s.enabled})`))

    const { data: theaters } = await sb
      .from('theaters')
      .select('id, name, city')
      .eq('name', name)
    console.log('  theaters:', theaters?.map(t => `${t.id} ${t.name} (${t.city})`))

    if (theaters && theaters.length > 0) {
      for (const theater of theaters) {
        const { count: showtimeCount } = await sb
          .from('showtimes')
          .select('*', { count: 'exact', head: true })
          .eq('theater_id', theater.id)
          .eq('is_active', true)
        console.log(`  활성 상영시간표: ${showtimeCount}건`)
      }
    }

    if (!apply) continue

    // 소스 삭제 (candidates, runs 포함)
    if (sources && sources.length > 0) {
      for (const src of sources) {
        await sb.from('showtime_candidates').delete().eq('source_id', src.id)
        await sb.from('crawl_runs').delete().eq('source_id', src.id)
        const { error } = await sb.from('crawl_sources').delete().eq('id', src.id)
        if (error) console.log(`  ❌ 소스 삭제 실패: ${error.message}`)
        else console.log(`  ✅ 소스 삭제: ${src.id}`)
      }
    }

    // 극장 삭제 (활성 상영시간표 없을 때만)
    if (theaters && theaters.length > 0) {
      for (const theater of theaters) {
        const { count } = await sb
          .from('showtimes')
          .select('*', { count: 'exact', head: true })
          .eq('theater_id', theater.id)
          .eq('is_active', true)
        if ((count ?? 0) > 0) {
          console.log(`  ⚠️  활성 상영 ${count}건 있어 극장 삭제 건너뜀`)
          continue
        }
        const { error } = await sb.from('theaters').delete().eq('id', theater.id)
        if (error) console.log(`  ❌ 극장 삭제 실패: ${error.message}`)
        else console.log(`  ✅ 극장 삭제: ${theater.name}`)
      }
    }
  }

  if (!apply) console.log('\n실제 삭제: npx tsx --env-file=.env.local scripts/check-closed-theaters.ts --apply')
}

main().catch(console.error)
