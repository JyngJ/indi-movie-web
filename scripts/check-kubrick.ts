import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await sb.from('movies').select('title, director').contains('director', ['스탠리 큐브릭'])
  console.log('Kubrick movies:', data)
}
main()
