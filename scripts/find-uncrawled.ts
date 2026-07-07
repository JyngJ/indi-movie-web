import { createClient } from '@supabase/supabase-js'

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: theaters } = await sb.from('theaters').select('id, name')
  const { data: sources } = await sb.from('crawl_sources').select('id, theater_name, parser, enabled')
  
  if (!theaters || !sources) return

  const sourceMap = sources.reduce((acc, s) => {
    acc[s.theater_name] = acc[s.theater_name] || []
    acc[s.theater_name].push(s)
    return acc
  }, {} as any)

  console.log(`Total theaters: ${theaters.length}`)
  console.log(`Total crawl sources: ${sources.length}`)

  let noSource = []
  let onlyDisabled = []
  let onlyOcr = []

  for (const t of theaters) {
    const tSources = sourceMap[t.name]
    if (!tSources || tSources.length === 0) {
      noSource.push(t.name)
    } else {
      const active = tSources.filter((s: any) => s.enabled)
      if (active.length === 0) {
        onlyDisabled.push(t.name)
      } else {
        const onlyOcrSource = active.every((s: any) => s.parser === 'ocr' || s.parser === 'boardImageOcr' || s.parser === 'screenshotOcr')
        if (onlyOcrSource) {
          onlyOcr.push(t.name)
        }
      }
    }
  }

  console.log('\n--- No Crawl Source at all ---')
  console.log(noSource.join(', '))
  
  console.log('\n--- All Sources Disabled ---')
  console.log(onlyDisabled.join(', '))

  console.log('\n--- Only OCR Sources (Manual) ---')
  console.log(onlyOcr.join(', '))

  // Let's also check theaters that have active sources but have 0 candidates recently
  const { data: runs } = await sb.from('crawl_runs').select('source_name, status, created_count').order('started_at', { ascending: false }).limit(200)
  
  if (runs) {
    const recentStatus = runs.reduce((acc, r) => {
      if (!acc[r.source_name]) acc[r.source_name] = []
      acc[r.source_name].push(r)
      return acc
    }, {} as any)

    let failing = []
    for (const [name, nameRuns] of Object.entries(recentStatus)) {
      const arr = nameRuns as any[]
      const recent = arr.slice(0, 3)
      const allZero = recent.every(r => r.created_count === 0 || r.status === 'failed')
      if (allZero && !onlyOcr.includes(name) && !onlyDisabled.includes(name)) {
         failing.push(`${name} (Last error: ${recent[0].error || '0 count'})`)
      }
    }
    console.log('\n--- Continuously Failing / 0 Count (Last 3 runs) ---')
    console.log(failing.join('\n'))
  }
}
run().catch(console.error)
