import { createClient } from '@supabase/supabase-js'
async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { count: theaters } = await supabase.from('theaters').select('*', { count: 'exact', head: true })
  const { count: sources } = await supabase.from('crawl_sources').select('*', { count: 'exact', head: true })
  const { count: enabled } = await supabase.from('crawl_sources').select('*', { count: 'exact', head: true }).eq('enabled', true)
  const { count: healthy } = await supabase.from('crawl_sources').select('*', { count: 'exact', head: true }).eq('enabled', true).eq('health', 'healthy')
  const { count: movies } = await supabase.from('movies').select('*', { count: 'exact', head: true })
  const { count: candidates } = await supabase.from('showtime_candidates').select('*', { count: 'exact', head: true })
  const { count: showtimes } = await supabase.from('showtimes').select('*', { count: 'exact', head: true })
  console.log({ theaters, sources, enabled, healthy, movies, candidates, showtimes })
}
main()
