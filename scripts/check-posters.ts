import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const { data } = await sb.from('movies').select('title,poster_url').not('poster_url', 'is', null).limit(15)
for (const m of (data ?? [])) {
  console.log(m.title)
  console.log('  ' + m.poster_url)
}
