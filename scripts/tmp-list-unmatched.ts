import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data, error } = await sb
    .from('showtime_candidates')
    .select('id, movie_title, release_year, theater_name, matched_movie_id, matched_theater_id, show_date, status')
    .or('matched_movie_id.is.null,matched_theater_id.is.null')
    .order('show_date', { ascending: false })
    .limit(5000)
  if (error) { console.error(JSON.stringify(error)); process.exit(1) }
  console.log('total unmatched rows:', data!.length)
  const m = new Map<string, {n:number, dates:Set<string>, noMovie:number, noTheater:number, theaters:Set<string>, years:Set<string>, statuses:Set<string>}>()
  for (const c of data!) {
    const k = c.movie_title ?? '(null)'
    const e = m.get(k) ?? { n:0, dates:new Set<string>(), noMovie:0, noTheater:0, theaters:new Set<string>(), years:new Set<string>(), statuses:new Set<string>() }
    e.n++
    if (c.show_date) e.dates.add(c.show_date)
    if (!c.matched_movie_id) e.noMovie++
    if (!c.matched_theater_id) e.noTheater++
    if (c.theater_name) e.theaters.add(c.theater_name)
    if (c.release_year) e.years.add(String(c.release_year))
    if (c.status) e.statuses.add(c.status)
    m.set(k, e)
  }
  const rows = [...m.entries()].sort((a,b)=>b[1].n-a[1].n)
  for (const [t,e] of rows) {
    const ds = [...e.dates].sort()
    console.log(`${String(e.n).padStart(4)} | noMovie:${e.noMovie} noTheater:${e.noTheater} | ${ds[0]}~${ds[ds.length-1]} | yr:${[...e.years].join('/')||'-'} | st:${[...e.statuses].join('/')} | ${t}  @ ${[...e.theaters].slice(0,3).join(', ')}`)
  }
  console.log('distinct titles:', rows.length)
}
main()
