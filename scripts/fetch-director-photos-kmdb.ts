/**
 * KMDB People API로 감독 프로필 사진 보완
 * photo_url 없는 감독 대상, KMDB kmdb_people2 컬렉션에서 검색.
 *
 * dry-run:  npx tsx --env-file=.env.local scripts/fetch-director-photos-kmdb.ts
 * 적용:     npx tsx --env-file=.env.local scripts/fetch-director-photos-kmdb.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const KMDB_BASE = 'https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp'
const SERVICE_KEY = process.env.KMDB_SERVICE_KEY ?? process.env.KMDB_API_KEY ?? ''

interface KmdbPeopleItem {
  directorNm?: string
  directorEnNm?: string
  filmoUrl?: string
  imgUrl?: string
  thumbUrl?: string
  repRoleNm?: string
  [k: string]: unknown
}

async function fetchKmdbDirectorPhoto(name: string): Promise<string | null> {
  const url = new URL(KMDB_BASE)
  url.searchParams.set('collection', 'kmdb_people2')
  url.searchParams.set('ServiceKey', SERVICE_KEY)
  url.searchParams.set('DIRECTOR', name)
  url.searchParams.set('listCount', '3')
  url.searchParams.set('detail', 'Y')
  url.searchParams.set('format', 'json')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json() as { Data?: Array<{ Result?: KmdbPeopleItem[] }> }
    const items: KmdbPeopleItem[] = data?.Data?.[0]?.Result ?? []

    // 이름 정확 매칭 우선, 없으면 첫 번째
    const match = items.find(i => i.directorNm === name) ?? items[0]
    const imgUrl = match?.imgUrl ?? match?.thumbUrl ?? null
    // KMDB imgUrl이 빈 문자열로 올 때 있음
    return imgUrl && imgUrl.trim() ? imgUrl.trim() : null
  } catch {
    return null
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run (--apply 로 실제 저장)\n')

  if (!SERVICE_KEY) {
    console.error('KMDB_SERVICE_KEY 환경변수 없음'); process.exit(1)
  }

  // photo_url 없는 감독만
  const { data: dirs, error } = await sb
    .from('directors')
    .select('name')
    .is('photo_url', null)
  if (error) { console.error(error.message); process.exit(1) }

  const targets = (dirs ?? []).map((d: { name: string }) => d.name).sort()
  console.log(`photo_url 없는 감독: ${targets.length}명\n`)

  const found: { name: string; url: string }[] = []
  const missing: string[] = []

  for (const name of targets) {
    process.stdout.write(`  ${name} ... `)
    const url = await fetchKmdbDirectorPhoto(name)
    if (url) {
      console.log(`✓ ${url.slice(0, 70)}`)
      found.push({ name, url })
    } else {
      console.log('없음')
      missing.push(name)
    }
    await new Promise(r => setTimeout(r, 120))
  }

  console.log(`\n결과: 찾음 ${found.length} / 없음 ${missing.length}`)
  if (missing.length) console.log('없음:', missing.join(', '))

  if (!apply || found.length === 0) return

  console.log('\n💾 저장 중...')
  const { error: uErr } = await sb
    .from('directors')
    .upsert(found.map(({ name, url }) => ({ name, photo_url: url })), { onConflict: 'name' })
  if (uErr) { console.error('저장 실패:', uErr.message); process.exit(1) }
  console.log(`✅ ${found.length}명 저장 완료`)
}

main().catch(console.error)
