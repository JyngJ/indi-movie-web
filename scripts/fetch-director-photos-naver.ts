/**
 * 네이버 이미지 검색으로 감독 프로필 사진 보완
 * photo_url 없는 감독 대상 · "{감독명} 감독" 검색 첫 결과 사용
 *
 * dry-run:  npx tsx --env-file=.env.local scripts/fetch-director-photos-naver.ts
 * 적용:     npx tsx --env-file=.env.local scripts/fetch-director-photos-naver.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const CLIENT_ID = process.env.NAVER_CLIENT_ID!
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!

interface NaverImageItem {
  title: string
  link: string
  thumbnail: string
  sizewidth: string
  sizeheight: string
}

async function fetchNaverImage(name: string): Promise<string | null> {
  const query = encodeURIComponent(`${name} 감독`)
  const url = `https://openapi.naver.com/v1/search/image?query=${query}&display=1&sort=sim`

  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json() as { items?: NaverImageItem[] }
    const item = data.items?.[0]
    if (!item?.link) return null

    // 너무 작은 이미지(아이콘류) 제외
    const w = parseInt(item.sizewidth ?? '0')
    const h = parseInt(item.sizeheight ?? '0')
    if (w < 100 || h < 100) return null

    return item.link
  } catch {
    return null
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run (--apply 로 실제 저장)\n')

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
    const url = await fetchNaverImage(name)
    if (url) {
      console.log(`✓ ${url.slice(0, 70)}`)
      found.push({ name, url })
    } else {
      console.log('없음')
      missing.push(name)
    }
    await new Promise(r => setTimeout(r, 80))
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
