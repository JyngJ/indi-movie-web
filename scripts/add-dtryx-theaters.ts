/**
 * Dtryx 기반 비서울 극장 + 씨네Q 추가
 * 실행: npx tsx --env-file=.env.local scripts/add-dtryx-theaters.ts
 * 적용: npx tsx --env-file=.env.local scripts/add-dtryx-theaters.ts --apply
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const CGID = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'

interface TheaterEntry {
  name: string
  city: string
  address: string
  lat: number
  lng: number
  website: string | null
  // crawl source
  cinemaCd: string | null   // null → 씨네Q 별도 처리
  brand: string | null
  parser: string
  listingUrl: string
  homepageUrl: string | null
}

const THEATERS: TheaterEntry[] = [
  // ── indieart 브랜드 ──────────────────────────────────────────────
  {
    name: '광주극장',
    city: '광주', address: '광주광역시 동구 충장로 1가 93-1',
    lat: 35.1483, lng: 126.9178,
    website: 'http://www.gwangjucinema.com',
    cinemaCd: '000066', brand: 'indieart', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=indieart&CinemaCd=000066`,
    homepageUrl: 'http://www.gwangjucinema.com',
  },
  {
    name: '씨네아트 리좀',
    city: '창원', address: '경상남도 창원시 마산합포구',
    lat: 35.1870, lng: 128.5750,
    website: null,
    cinemaCd: '000053', brand: 'indieart', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=indieart&CinemaCd=000053`,
    homepageUrl: null,
  },
  {
    name: '오오극장',
    city: '대구', address: '대구광역시 중구',
    lat: 35.8721, lng: 128.5967,
    website: null,
    cinemaCd: '000059', brand: 'indieart', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=indieart&CinemaCd=000059`,
    homepageUrl: null,
  },
  {
    name: '인디플러스포항',
    city: '포항', address: '경상북도 포항시',
    lat: 36.0190, lng: 129.3435,
    website: null,
    cinemaCd: '000057', brand: 'indieart', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=indieart&CinemaCd=000057`,
    homepageUrl: null,
  },
  {
    name: '전주디지털독립영화관',
    city: '전주', address: '전라북도 전주시 완산구',
    lat: 35.8166, lng: 127.1472,
    website: null,
    cinemaCd: '000061', brand: 'indieart', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=indieart&CinemaCd=000061`,
    homepageUrl: null,
  },
  {
    name: '헤이리시네마',
    city: '파주', address: '경기도 파주시 탄현면 헤이리예술마을',
    lat: 37.7635, lng: 126.7096,
    website: null,
    cinemaCd: '000071', brand: 'indieart', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=indieart&CinemaCd=000071`,
    homepageUrl: null,
  },

  // ── etc 브랜드 ───────────────────────────────────────────────────
  {
    name: '경기인디시네마',
    city: '수원', address: '경기도 수원시 영통구 도청로 10 (롯데아울렛 광교 4층)',
    lat: 37.2866, lng: 127.0563,
    website: null,
    cinemaCd: '000158', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000158`,
    homepageUrl: null,
  },
  {
    name: '금성시네마',
    city: '부여', address: '충청남도 부여군 부여읍 사비로100번길 12',
    lat: 36.2813, lng: 126.9116,
    website: null,
    cinemaCd: '000107', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000107`,
    homepageUrl: null,
  },
  {
    name: '김해문화의전당',
    city: '김해', address: '경상남도 김해시',
    lat: 35.2281, lng: 128.8893,
    website: null,
    cinemaCd: '000090', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000090`,
    homepageUrl: null,
  },
  {
    name: '멜리에스 빈티지 시네마',
    city: '광주', address: '경기도 광주시 행정타운로 143-9 2층',
    lat: 37.42677196, lng: 127.24360946,
    website: null,
    cinemaCd: '000161', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000161`,
    homepageUrl: null,
  },
  {
    name: '명화극장',
    city: '안산', address: '경기도 안산시 단원구 중앙대로 921 (동서코아 지하2층)',
    lat: 37.3168, lng: 126.8325,
    website: 'http://myounghwacinema.org',
    cinemaCd: '000116', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000116`,
    homepageUrl: 'http://myounghwacinema.org',
  },
  {
    name: '모퉁이극장',
    city: '부산', address: '부산광역시 중구 광복중앙로 13 3층',
    lat: 35.1005, lng: 129.0308,
    website: null,
    cinemaCd: '000097', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000097`,
    homepageUrl: null,
  },
  {
    name: '밀양시네마',
    city: '밀양', address: '경상남도 밀양시',
    lat: 35.4967, lng: 128.7483,
    website: null,
    cinemaCd: '000092', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000092`,
    homepageUrl: null,
  },
  {
    name: '수원시미디어센터',
    city: '수원', address: '경기도 수원시 팔달구 창룡대로 64',
    lat: 37.2819, lng: 127.0182,
    website: 'https://www.swmedia.or.kr',
    cinemaCd: '000149', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000149`,
    homepageUrl: 'https://www.swmedia.or.kr',
  },
  {
    name: '시네마엠엠',
    city: '목포', address: '전라남도 목포시 수강로4번길 19 2층',
    lat: 34.7869, lng: 126.3878,
    website: null,
    cinemaCd: '000146', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000146`,
    homepageUrl: null,
  },
  {
    name: '씨네인디U',
    city: '대전', address: '대전광역시 중구 계백로 1712',
    lat: 36.3210, lng: 127.4100,
    website: null,
    cinemaCd: '000098', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000098`,
    homepageUrl: null,
  },
  {
    name: '애관극장',
    city: '인천', address: '인천광역시 중구 신포로 15번길',
    lat: 37.4754, lng: 126.6219,
    website: 'https://www.aekwan.com',
    cinemaCd: '000100', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000100`,
    homepageUrl: 'https://www.aekwan.com',
  },
  {
    name: '자유로자동차극장',
    city: '파주', address: '경기도 파주시 탄현면 엘지로 697',
    lat: 37.8349, lng: 126.7355,
    website: 'http://carmovie.co.kr',
    cinemaCd: '000117', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000117`,
    homepageUrl: 'http://carmovie.co.kr',
  },
  {
    name: '제천시네마',
    city: '제천', address: '충청북도 제천시',
    lat: 37.1323, lng: 128.1913,
    website: null,
    cinemaCd: '000156', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000156`,
    homepageUrl: null,
  },
  {
    name: '천안인생극장',
    city: '천안', address: '충청남도 천안시',
    lat: 36.8150, lng: 127.1141,
    website: null,
    cinemaCd: '000083', brand: 'etc', parser: 'dtryxReservationApi',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=etc&CinemaCd=000083`,
    homepageUrl: null,
  },

  // ── 씨네Q (별도 시스템) ──────────────────────────────────────────
  {
    name: '씨네Q 신도림',
    city: '서울', address: '서울특별시 구로구 신도림동 448-6 테크노마트 12층',
    lat: 37.5097, lng: 126.8920,
    website: 'https://www.cineq.co.kr',
    cinemaCd: null, brand: null, parser: 'dtryxReservationApi',  // 실제 파서 확인 후 업데이트 필요
    listingUrl: 'https://www.cineq.co.kr/Theater/Movie?TheaterCode=1001',
    homepageUrl: 'https://www.cineq.co.kr',
  },
]

// DB에 이미 있지만 crawl_source 없는 서울 극장 → source만 추가
const MISSING_SOURCES = [
  { theaterName: '낭만극장',   cinemaCd: '000113', brand: 'etc' },
  { theaterName: '허리우드클래식', cinemaCd: '000115', brand: 'etc' },
]

async function main() {
  const apply = process.argv.includes('--apply')
  if (!apply) console.log('🔍 dry-run (--apply 로 실제 저장)\n')

  // 1. 기존 극장 이름 → id 맵
  const { data: existing } = await sb.from('theaters').select('id, name')
  const existingNames = new Set((existing ?? []).map((t: { name: string }) => t.name))
  const theaterIdByName = new Map((existing ?? []).map((t: { id: string; name: string }) => [t.name, t.id]))

  // 2. 기존 crawl_source 목록
  const { data: existingSources } = await sb.from('crawl_sources').select('theater_name, listing_url')
  const existingSourceUrls = new Set((existingSources ?? []).map((s: { listing_url: string }) => s.listing_url))

  let added = 0, skipped = 0, sourceAdded = 0

  for (const t of THEATERS) {
    let theaterId: string

    if (existingNames.has(t.name)) {
      theaterId = theaterIdByName.get(t.name)!
      console.log(`\n⏭  극장 이미 있음: ${t.name} → ${theaterId}`)
      skipped++
    } else {
      console.log(`\n➕ 추가: ${t.name} (${t.city})`)
      if (!apply) { added++; continue }

      const { data: theater, error: tErr } = await sb.from('theaters').insert({
        name: t.name, city: t.city, address: t.address,
        lat: t.lat, lng: t.lng, website: t.website,
      }).select('id').single()

      if (tErr) { console.log(`  ❌ 극장 생성 실패: ${tErr.message}`); continue }
      theaterId = theater.id
      console.log(`  ✅ 극장 생성: ${theaterId}`)
      added++
    }

    // crawl_source insert (씨네Q는 파서 미확정으로 스킵)
    if (!apply) continue
    if (t.cinemaCd && t.brand) {
      if (existingSourceUrls.has(t.listingUrl)) {
        console.log(`  ⏭  소스 이미 있음`)
      } else {
        const { error: sErr } = await sb.from('crawl_sources').insert({
          id: randomUUID(),
          theater_name: t.name,
          theater_id: theaterId,
          homepage_url: t.homepageUrl ?? t.listingUrl,
          listing_url: t.listingUrl,
          parser: t.parser,
          cadence: 'manual',
          enabled: true,
        })
        if (sErr) console.log(`  ❌ 소스 생성 실패: ${sErr.message}`)
        else { console.log(`  ✅ 소스 생성`); sourceAdded++ }
      }
    }
  }

  // 3. 기존 서울 극장 누락 소스 추가
  console.log('\n── 기존 극장 누락 crawl_source 추가 ──')
  for (const ms of MISSING_SOURCES) {
    const listingUrl = `https://www.dtryx.com/cinema/main.do?cgid=${CGID}&BrandCd=${ms.brand}&CinemaCd=${ms.cinemaCd}`
    if (existingSourceUrls.has(listingUrl)) {
      console.log(`⏭  소스 이미 있음: ${ms.theaterName}`)
      continue
    }
    const theater = (existing ?? []).find((t: { name: string }) => t.name === ms.theaterName)
    if (!theater) { console.log(`❌ 극장 못찾음: ${ms.theaterName}`); continue }

    console.log(`➕ 소스 추가: ${ms.theaterName}`)
    if (!apply) continue

    const { error } = await sb.from('crawl_sources').insert({
      id: randomUUID(),
      theater_name: ms.theaterName,
      theater_id: theater.id,
      homepage_url: listingUrl,
      listing_url: listingUrl,
      parser: 'dtryxReservationApi',
      cadence: 'manual',
      enabled: true,
    })
    if (error) console.log(`  ❌ 실패: ${error.message}`)
    else { console.log(`  ✅ 완료`); sourceAdded++ }
  }

  console.log(`\n완료 — 극장 추가: ${added} / 건너뜀: ${skipped} / 소스 추가: ${sourceAdded}`)
}

main().catch(console.error)
