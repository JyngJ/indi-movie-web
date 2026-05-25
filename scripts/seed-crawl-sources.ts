/**
 * crawl_sources 테이블에 극장별 크롤링 소스 등록
 * 실행: npx tsx --env-file=.env.local scripts/seed-crawl-sources.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  // 1. theater id 조회
  const { data: theaters, error } = await supabase
    .from('theaters')
    .select('id, name')
  if (error) { console.error('theaters 조회 실패:', error.message); process.exit(1) }

  const byName = new Map(theaters!.map(t => [t.name as string, t.id as string]))

  const sources = [
    // ── 전용 파서 ──────────────────────────────────────────────────────
    {
      theaterName: '서울아트시네마',
      homepageUrl: 'https://www.cinematheque.seoul.kr',
      listingUrl: 'https://www.cinematheque.seoul.kr/bbs/content.php?co_id=timetable',
      parser: 'seoulArtTimetable',
      cadence: 'daily',
      notes: '전용 테이블 파서',
    },
    {
      theaterName: '무비랜드',
      homepageUrl: 'https://movieland.co',
      listingUrl: 'https://movieland.co/category/movies/now-showing',
      parser: 'movielandProductOptions',
      cadence: 'daily',
      notes: '상품별 옵션 파서',
    },
    {
      theaterName: '필름포럼',
      homepageUrl: 'http://filmforum.co.kr/',
      listingUrl: 'https://moviee.co.kr/Theater/Index?thsynid=130',
      parser: 'movieeTicketApi',
      cadence: 'daily',
      notes: '공식 사이트 WAF 차단 → Moviee 우회 (thsynid=130)',
    },
    {
      theaterName: 'KU시네마테크',
      homepageUrl: 'https://kucinema.net',
      listingUrl: 'https://moviee.co.kr/Movie/Ticket?tid=121',
      parser: 'movieeTicketApi',
      cadence: 'daily',
      notes: 'Moviee 예매 연동 (tid=121)',
    },
    {
      theaterName: '라이카시네마',
      homepageUrl: 'https://www.laikacinema.com',
      listingUrl: 'https://www.laikacinema.com/booking?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=spacedog&CinemaCd=000072',
      parser: 'dtryxReservationApi',
      cadence: 'daily',
      notes: 'Dtryx 기반 (BrandCd=spacedog, CinemaCd=000072)',
    },

    // ── HTML 파서 (사이트 구조 기반) ────────────────────────────────────
    {
      theaterName: '에무시네마',
      homepageUrl: 'https://www.emucinema.com',
      listingUrl: 'https://www.emucinema.com/schedule',
      parser: 'timelineCard',
      cadence: 'daily',
      notes: 'HTML 파서 — 구조 확인 후 파서 변경 필요할 수 있음',
    },
    {
      theaterName: '씨네큐브 광화문',
      homepageUrl: 'https://www.cinecube.co.kr',
      listingUrl: 'https://www.cinecube.co.kr/movie/schedule',
      parser: 'tableText',
      cadence: 'daily',
      notes: 'HTML 테이블 파서 — 구조 확인 필요',
    },
    {
      theaterName: 'KT&G 상상마당 시네마 홍대',
      homepageUrl: 'https://www.sangsangmadang.com',
      listingUrl: 'https://www.sangsangmadang.com/movie/list',
      parser: 'tableText',
      cadence: 'daily',
      notes: '홍대/대치 공통 목록 페이지 — 극장 구분 필요',
    },
    {
      theaterName: 'KT&G 상상마당 시네마 대치',
      homepageUrl: 'https://www.sangsangmadang.com',
      listingUrl: 'https://www.sangsangmadang.com/movie/list',
      parser: 'tableText',
      cadence: 'daily',
      notes: '홍대/대치 공통 목록 페이지 — 극장 구분 필요',
    },
    {
      theaterName: '아리랑시네센터',
      homepageUrl: 'https://cine.arirang.go.kr:8443/arirang/index.do',
      listingUrl: 'https://cine.arirang.go.kr:8443/arirang/index.do',
      parser: 'tableText',
      cadence: 'daily',
      notes: 'HTML 파서 — 구조 확인 필요',
    },
    {
      theaterName: '더숲 아트시네마',
      homepageUrl: 'https://thesoop.modoo.at',
      listingUrl: 'https://thesoop.modoo.at',
      parser: 'tableText',
      cadence: 'daily',
      notes: 'modoo 기반 — 구조 확인 필요',
    },
    {
      theaterName: '서울영화센터',
      homepageUrl: 'https://www.seoulfilmcenter.or.kr',
      listingUrl: 'https://www.seoulfilmcenter.or.kr/program/schedule',
      parser: 'tableText',
      cadence: 'daily',
      notes: 'HTML 파서 — 구조 확인 필요',
    },
    {
      theaterName: '아트하우스 모모',
      homepageUrl: 'https://artmomo.ewha.ac.kr',
      listingUrl: 'https://artmomo.ewha.ac.kr/movie',
      parser: 'tableText',
      cadence: 'daily',
      notes: 'HTML 파서 — 구조 확인 필요',
    },
    {
      theaterName: '오르페오',
      homepageUrl: 'https://www.orfeo.co.kr/',
      listingUrl: 'https://www.orfeo.co.kr/schedule',
      parser: 'jsonLdEvent',
      cadence: 'daily',
      notes: 'JSON-LD 또는 HTML 파서 — 구조 확인 필요',
    },
    {
      theaterName: '아트나인',
      homepageUrl: 'https://linktr.ee/artnine',
      listingUrl: 'https://linktr.ee/artnine',
      parser: 'tableText',
      cadence: 'manual',
      notes: 'Linktree 기반 — 상영시간표 URL 별도 확인 필요',
    },
    // 인디스페이스는 이미지 기반 시간표 → OCR 필요, 등록 보류
  ]

  console.log(`모드: ${apply ? '실제 적용 (--apply)' : 'dry-run'}`)
  console.log('')

  let ok = 0, skip = 0, fail = 0

  for (const s of sources) {
    const theaterId = byName.get(s.theaterName)
    if (!theaterId) {
      console.log(`⚠️  DB에 극장 없음: ${s.theaterName}`)
      skip++
      continue
    }

    const id = `${slugify(s.theaterName)}-homepage`
    process.stdout.write(`  ${s.theaterName} (${s.parser}) ... `)

    if (!apply) {
      console.log(`[dry-run] id=${id}`)
      ok++
      continue
    }

    const { error } = await supabase.from('crawl_sources').upsert({
      id,
      theater_id: theaterId,
      theater_name: s.theaterName,
      matched_theater_id: theaterId,
      homepage_url: s.homepageUrl,
      listing_url: s.listingUrl,
      parser: s.parser,
      enabled: true,
      cadence: s.cadence,
      health: 'healthy',
      notes: s.notes,
    }, { onConflict: 'id' })

    if (error) {
      console.log(`실패: ${error.message}`)
      fail++
    } else {
      console.log('✓')
      ok++
    }
  }

  console.log('')
  console.log(`완료 — 성공: ${ok} / 스킵: ${skip} / 실패: ${fail}`)
  if (!apply) console.log('\n실제 적용: npx tsx --env-file=.env.local scripts/seed-crawl-sources.ts --apply')
}

main().catch(console.error)
