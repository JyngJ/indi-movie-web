/**
 * 매칭 필요(unmatched) 후보들에 대해 autoMatch 재실행 — KMDB/씨네21에서 영화 찾아 DB 임포트 + 매칭
 * Usage: npx tsx --env-file=.env.local scripts/tmp-automatch-unmatched.ts [--limit N]
 */
import { createClient } from '@supabase/supabase-js'
import { autoMatchShowtimeCandidates } from '../src/lib/admin/store'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 5000

  const { data, error } = await sb
    .from('showtime_candidates')
    .select('id, movie_title, matched_movie_id, matched_theater_id, status')
    .or('matched_movie_id.is.null,matched_theater_id.is.null')
    .neq('status', 'approved')
    .neq('status', 'rejected')
    .order('show_date', { ascending: false })
    .limit(limit)
  if (error) { console.error(JSON.stringify(error)); process.exit(1) }

  const ids = data!.map(d => d.id as string)
  console.log(`대상 후보 ${ids.length}건`)

  const CHUNK = 600
  let matchedNeedsReview = 0, autoApproved = 0, unmatched = 0, writeFailed = 0
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const r = await autoMatchShowtimeCandidates(chunk)
    matchedNeedsReview += r.matchedNeedsReview.screenings; autoApproved += r.autoApproved.screenings; unmatched += r.unmatched.screenings; writeFailed += r.writeFailed.screenings
    console.log(`[${i + chunk.length}/${ids.length}] matchedNeedsReview=${r.matchedNeedsReview.screenings} autoApproved=${r.autoApproved.screenings} unmatched=${r.unmatched.screenings} writeFailed=${r.writeFailed.screenings}`)
  }
  console.log({ matchedNeedsReview, autoApproved, unmatched, writeFailed })
}
main()
