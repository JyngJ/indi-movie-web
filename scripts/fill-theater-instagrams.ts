/**
 * 극장 인스타그램 계정 보정
 * 실행: npx tsx --env-file=.env.local scripts/fill-theater-instagrams.ts
 * 적용: npx tsx --env-file=.env.local scripts/fill-theater-instagrams.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const INSTAGRAM_BY_THEATER: Record<string, string> = {
  'KT&G 상상마당 시네마 홍대': 'https://www.instagram.com/sangsangcinema/',
  '김해문화의전당': 'https://www.instagram.com/gasc2005/',
  '더숲 아트시네마': 'https://www.instagram.com/deosup_artcinema/',
  '라이카시네마': 'https://www.instagram.com/laikacinema/',
  '모퉁이극장': 'https://www.instagram.com/cornertheater/',
  '무비랜드': 'https://www.instagram.com/movieland.archive/',
  '서울아트시네마': 'https://www.instagram.com/seoulartcinema_/',
  '서울영화센터': 'https://www.instagram.com/seoulfilmcenter/',
  '수원시미디어센터': 'https://www.instagram.com/suwon_media/',
  '시네마엠엠': 'https://www.instagram.com/cinemamm.official/',
  '씨네Q 신도림': 'https://www.instagram.com/cineq_sdr/',
  '씨네큐브 광화문': 'https://www.instagram.com/cinecube_kr/',
  '아트나인': 'https://www.instagram.com/artninecinema/',
  '아트하우스 모모': 'https://www.instagram.com/arthousemomo/',
  '에무시네마': 'https://www.instagram.com/emuartspace/',
  '오오극장': 'https://www.instagram.com/55cine/',
  '인디스페이스': 'https://www.instagram.com/indiespace_kr/',
  '멜리에스 빈티지 시네마': 'https://www.instagram.com/melies_vintage_cinema/',
  '씨네아트 리좀': 'https://www.instagram.com/cineartrhizome/',
  '전주디지털독립영화관': 'https://www.instagram.com/jeonjucinecomplex/',
  '자유로자동차극장': 'https://www.instagram.com/garagemovie_/',
  '경기인디시네마': 'https://www.instagram.com/ggfc.or.kr/',
}

const CLEAR_INSTAGRAM_THEATERS = new Set([
  '필름포럼',
])

async function main() {
  const apply = process.argv.includes('--apply')
  const overwrite = process.argv.includes('--overwrite')
  if (!apply) console.log('dry-run (--apply 로 실제 저장)\n')

  const { data: theaters, error } = await sb
    .from('theaters')
    .select('id, name, instagram_url')
    .order('name')

  if (error) throw error

  let updated = 0
  let skipped = 0
  const missing: string[] = []

  for (const theater of theaters ?? []) {
    if (CLEAR_INSTAGRAM_THEATERS.has(theater.name)) {
      if (!theater.instagram_url) {
        missing.push(theater.name)
        continue
      }
      console.log(`${apply ? 'clear' : 'would clear'}: ${theater.name} (${theater.instagram_url})`)
      if (apply) {
        const { error: clearError } = await sb
          .from('theaters')
          .update({ instagram_url: null })
          .eq('id', theater.id)

        if (clearError) throw clearError
      }
      updated++
      missing.push(theater.name)
      continue
    }

    const instagramUrl = INSTAGRAM_BY_THEATER[theater.name]
    if (!instagramUrl) {
      if (!theater.instagram_url) missing.push(theater.name)
      continue
    }

    if (theater.instagram_url && !overwrite) {
      console.log(`skip: ${theater.name} (${theater.instagram_url})`)
      skipped++
      continue
    }

    console.log(`${apply ? 'update' : 'would update'}: ${theater.name} -> ${instagramUrl}`)
    if (!apply) {
      updated++
      continue
    }

    const { error: updateError } = await sb
      .from('theaters')
      .update({ instagram_url: instagramUrl })
      .eq('id', theater.id)

    if (updateError) throw updateError
    updated++
  }

  console.log(`\n완료 — ${apply ? '반영' : '대상'}: ${updated} / 기존값 유지: ${skipped}`)
  if (missing.length) {
    console.log(`미확인/미보유: ${missing.length}`)
    for (const name of missing) console.log(`- ${name}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
