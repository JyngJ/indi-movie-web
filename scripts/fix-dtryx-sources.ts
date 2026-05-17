/**
 * Dtryx 기반 극장들의 crawl_sources 업데이트
 * - listing_url을 www.dtryx.com API URL로 변경
 * - parser를 dtryxReservationApi로 변경
 *
 * 실행: npx tsx --env-file=.env.local scripts/fix-dtryx-sources.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const DTRYX_CGID = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'

function dtryxUrl(brandCd: string, cinemaCd: string) {
  return `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=${brandCd}&CinemaCd=${cinemaCd}`
}

const fixes = [
  {
    id: '라이카시네마-homepage',
    listing_url: dtryxUrl('spacedog', '000072'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx spacedog 브랜드 (CinemaCd=000072)',
  },
  {
    id: '에무시네마-homepage',
    listing_url: dtryxUrl('indieart', '000069'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx indieart 브랜드 (CinemaCd=000069)',
  },
  {
    id: '서울영화센터-homepage',
    listing_url: dtryxUrl('seoulcc', '000160'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx seoulcc 브랜드 (CinemaCd=000160)',
  },
  {
    id: '아트하우스-모모-homepage',
    listing_url: dtryxUrl('indieart', '000067'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx indieart 브랜드 (CinemaCd=000067)',
  },
  {
    id: '씨네큐브-광화문-homepage',
    listing_url: dtryxUrl('cinecube', '000003'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx cinecube 브랜드 (CinemaCd=000003)',
  },
  {
    id: '더숲-아트시네마-homepage',
    listing_url: dtryxUrl('indieart', '000065'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx indieart 브랜드 (CinemaCd=000065)',
  },
  {
    id: '아리랑시네센터-homepage',
    listing_url: dtryxUrl('etc', '000088'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx etc 브랜드 (CinemaCd=000088)',
  },
  {
    id: '아트나인-homepage',
    listing_url: dtryxUrl('etc', '000162'),
    parser: 'dtryxReservationApi',
    notes: 'Dtryx etc 브랜드 (CinemaCd=000162)',
  },
]

async function main() {
  console.log(`모드: ${apply ? '실제 적용 (--apply)' : 'dry-run'}`)
  console.log('')

  let ok = 0, fail = 0

  for (const fix of fixes) {
    process.stdout.write(`  ${fix.id} ... `)

    if (!apply) {
      console.log(`[dry-run] parser=${fix.parser} url=${fix.listing_url}`)
      ok++
      continue
    }

    const { error } = await supabase
      .from('crawl_sources')
      .update({ listing_url: fix.listing_url, parser: fix.parser, notes: fix.notes })
      .eq('id', fix.id)

    if (error) {
      console.log(`실패: ${error.message}`)
      fail++
    } else {
      console.log('✓')
      ok++
    }
  }

  console.log('')
  console.log(`완료 — 성공: ${ok} / 실패: ${fail}`)
  if (!apply) console.log('\n실제 적용: npx tsx --env-file=.env.local scripts/fix-dtryx-sources.ts --apply')
}

main().catch(console.error)
