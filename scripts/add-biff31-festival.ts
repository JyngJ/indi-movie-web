/**
 * 제31회 부산국제영화제(biff.kr) — 영화제 + 상영관 등록
 *
 *   npx tsx scripts/add-biff31-festival.ts            # dry-run(기본)
 *   npx tsx scripts/add-biff31-festival.ts --apply    # 실제 저장
 *
 * 회기: 2026-10-06(화) ~ 10-15(목)
 *
 * ⚠ 상영관 목록은 2026-09-08 기준 "잠정"이다. biff.kr의 상영관 운영 안내
 * (page_num=10899)·상영시간표(11057)가 아직 빈 페이지라, 역대영화제 아카이브의
 * 30회(2025) 상영관을 그대로 옮겼다. 공식 발표가 나오면 VENUES를 고치고 다시 실행한다
 * (slug·이름 기준 upsert라 반복 실행이 안전하다).
 *
 * ⚠ CGV·롯데시네마는 우리가 회차를 모으지 않는 멀티플렉스다. theaters에 넣으면 지도에
 * 핀이 서지만 상영 시간표는 비어 있다 — 상세 화면이 isMultiplexVenue로 안내를 띄운다
 * (src/lib/festival/venue.ts). 영화제가 끝나도 핀은 남으니, 정리하려면 지우는 게 아니라
 * 회차 소스를 붙이는 쪽으로 판단할 것.
 *
 * 사전 조건: docs/SUPABASE_FESTIVAL_SCREENINGS.sql을 Supabase SQL 편집기에서 먼저 실행.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim()
  }
}

const APPLY = process.argv.includes('--apply')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const FESTIVAL = {
  name: '제31회 부산국제영화제',
  slug: 'biff31',
  start_date: '2026-10-06',
  end_date: '2026-10-15',
  region: '부산',
  city: '부산',
  venue_text: '영화의전당 · 센텀시티 일대',
  link_url: 'https://www.biff.kr/kor/',
  description:
    '아시아 최대 규모의 국제영화제. 영화의전당을 중심으로 센텀시티 일대 극장에서 열려요.\n'
    + '상영 시간표와 예매는 영화제 공식 사이트에서 안내해요.',
  is_active: true,
}

interface Venue {
  name: string
  /** 좌표·주소를 못 찾았을 때 쓸 검색어 — 극장 이름만으로는 안 잡히는 곳이 있다 */
  searchQuery?: string
  screenCount?: number
}

// 순서 = 화면에 보이는 순서(sort_order). 영화의전당이 주 상영관이라 맨 앞.
const VENUES: Venue[] = [
  { name: '영화의전당', screenCount: 4 },
  { name: 'CGV 센텀시티', searchQuery: 'CGV 센텀시티', screenCount: 7 },
  { name: '롯데시네마 센텀시티', searchQuery: '롯데시네마 센텀시티', screenCount: 5 },
  { name: '영화진흥위원회 표준시사실', searchQuery: '영화진흥위원회 부산', screenCount: 1 },
  // 30회 공식 표기는 "신한카드홀"이었는데 홀 이름이 스폰서를 따라 바뀐다(현재 우리은행홀).
  // 해마다 바뀌는 홀 이름 대신 건물 이름으로 등록한다.
  { name: '동서대학교 소향씨어터', searchQuery: '소향씨어터', screenCount: 1 },
  { name: '부산시청자미디어센터', searchQuery: '부산시청자미디어센터', screenCount: 1 },
]

/** 네이버 로컬 검색 — 이름으로 주소와 좌표를 함께 받는다(mapx/mapy는 10^7 스케일) */
async function naverLookup(query: string): Promise<{ address: string; lat: number; lng: number } | null> {
  const id = process.env.NAVER_CLIENT_ID
  const secret = process.env.NAVER_CLIENT_SECRET
  if (!id || !secret) return null

  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`,
    { headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret }, signal: AbortSignal.timeout(6000) },
  ).catch(() => null)
  if (!res?.ok) return null

  const data = await res.json() as { items?: Array<{ roadAddress?: string; address?: string; mapx: string; mapy: string }> }
  const item = data.items?.[0]
  if (!item?.mapx) return null

  const address = item.roadAddress || item.address
  if (!address) return null
  return { address, lat: parseInt(item.mapy) / 1e7, lng: parseInt(item.mapx) / 1e7 }
}

async function resolveTheaterId(venue: Venue): Promise<string | null> {
  const { data: existing } = await supabase
    .from('theaters')
    .select('id,name')
    .eq('name', venue.name)
    .maybeSingle()

  if (existing) {
    console.log(`  이미 등록됨: ${venue.name}`)
    return existing.id
  }

  const found = await naverLookup(venue.searchQuery ?? venue.name)
  if (!found) {
    console.warn(`  ⚠ 좌표를 못 찾음: ${venue.name} — theaters 등록을 건너뛴다(venue_text로만 남는다)`)
    return null
  }

  console.log(`  신규: ${venue.name} — ${found.address} (${found.lat}, ${found.lng})`)
  if (!APPLY) return null

  const { data: inserted, error } = await supabase
    .from('theaters')
    .insert({
      name: venue.name,
      address: found.address,
      city: '부산',
      lat: found.lat,
      lng: found.lng,
      screen_count: venue.screenCount ?? 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`  ✕ theaters 등록 실패: ${venue.name} — ${error.message}`)
    return null
  }
  return inserted.id
}

async function main() {
  console.log(`${FESTIVAL.name} 등록 (${APPLY ? '실제 저장' : 'dry-run — 저장하지 않음'})\n`)

  // ── 영화제 ────────────────────────────────────────────────
  const { data: existingFestival } = await supabase
    .from('festivals')
    .select('id')
    .eq('slug', FESTIVAL.slug)
    .maybeSingle()

  let festivalId = existingFestival?.id ?? null
  console.log(existingFestival ? '영화제: 기존 행 갱신' : '영화제: 신규 등록')

  if (APPLY) {
    const { data, error } = await supabase
      .from('festivals')
      .upsert(FESTIVAL, { onConflict: 'slug' })
      .select('id')
      .single()
    if (error) throw new Error(`festivals upsert 실패: ${error.message}`)
    festivalId = data.id
  }

  // ── 상영관 ────────────────────────────────────────────────
  console.log('\n상영관:')
  const links: Array<{ theaterId: string | null; venue: Venue; sortOrder: number }> = []
  for (const [index, venue] of VENUES.entries()) {
    const theaterId = await resolveTheaterId(venue)
    links.push({ theaterId, venue, sortOrder: index })
  }

  if (APPLY && festivalId) {
    // 상영관 구성은 발표 때마다 바뀐다 — 통째로 갈아끼워야 지난 회차의 잔재가 안 남는다
    await supabase.from('festival_theaters').delete().eq('festival_id', festivalId)
    const { error } = await supabase.from('festival_theaters').insert(
      links.map((l) => ({
        festival_id: festivalId,
        theater_id: l.theaterId,
        // theaters에 등록된 곳은 조인해서 이름을 가져오므로 venue_text를 비운다
        venue_text: l.theaterId ? null : l.venue.name,
        sort_order: l.sortOrder,
      })),
    )
    if (error) throw new Error(`festival_theaters insert 실패: ${error.message}`)
  }

  const linked = links.filter((l) => l.theaterId).length
  console.log(`\n상영관 ${links.length}곳 — 극장 연결 ${linked}곳 / 이름만 ${links.length - linked}곳`)
  console.log('상영 시간표(festival_screenings)는 영화제가 회차를 발표한 뒤에 별도로 넣는다 — 그때까지 상세 화면은 "공개 전" 안내를 띄운다.')
  if (!APPLY) console.log('\n실제 저장하려면 --apply를 붙여 다시 실행할 것')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
