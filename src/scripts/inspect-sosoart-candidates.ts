import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

async function main() {
  const supabase = createSupabaseAdminClient()

  const { data: candidates, error: candError } = await supabase
    .from('showtime_candidates')
    .select('id, theater_name, movie_title, status, matched_movie_id, matched_theater_id, show_date, show_time, warnings')
    .ilike('theater_name', '%소소아트%')
    .or('movie_title.ilike.%경멸%,movie_title.ilike.%시크릿%')
    .order('show_date')

  if (candError) throw candError
  console.log('=== showtime_candidates (소소아트시네마 / 경멸 · 시크릿) ===')
  console.log(JSON.stringify(candidates, null, 2))

  const { data: contempt, error: e1 } = await supabase
    .from('movies')
    .select('id, title, original_title, year, director, kmdb_id')
    .ilike('title', '%경멸%')
  if (e1) throw e1
  console.log('\n=== movies 매칭: 경멸 ===')
  console.log(JSON.stringify(contempt, null, 2))

  const { data: secretAgent, error: e2 } = await supabase
    .from('movies')
    .select('id, title, original_title, year, director, kmdb_id')
    .ilike('title', '%시크릿 에이전트%')
  if (e2) throw e2
  console.log('\n=== movies 매칭: 시크릿 에이전트 ===')
  console.log(JSON.stringify(secretAgent, null, 2))
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
