/**
 * 제52회 서울독립영화제(siff.kr) — 영화제 + 상영관 + 상영 시간표 등록
 *
 *   npx tsx scripts/add-siff52-festival.ts            # dry-run(기본) — siff.kr은 읽고 DB엔 안 쓴다
 *   npx tsx scripts/add-siff52-festival.ts --apply    # 실제 저장
 *
 * 회기: 2026-11-25(수) ~ 12-04(금)
 *
 * 상영관은 siff.kr 상영관 페이지(/screening/venue/)에 올라온 CGV 두 곳이다. 압구정 신관·본관은
 * 같은 건물(압구정로30길 45)이라 극장 하나로 등록하고 동 이름은 관 이름에 남긴다.
 * 회차는 상영시간표 한 장(/screening/timetable/, 회기 전체가 한 페이지)을 읽어
 * festival_screenings에 통째로 갈아끼운다 — 시간표가 바뀌면 다시 실행하면 된다.
 *
 * ⚠ CGV는 우리가 평소 회차를 모으지 않는 멀티플렉스다 — scripts/add-biff31-festival.ts 머리말 참고.
 *
 * 포스터·바로가기 이미지는 두지 않는다. 공식 세로 포스터 원본이 사이트에 없고(정사각 SNS 이미지뿐),
 * 이용허락 근거 없는 이미지를 새로 들이지 않는다는 규칙(AGENTS.md 광고·이미지 권리)을 따른다.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { crawlerHeaders } from '../src/lib/admin/crawler/utils'
import { parseSiffTimetable, type SiffScreening } from '../src/lib/festival/siffSchedule'

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
  name: '제52회 서울독립영화제',
  slug: 'siff52',
  start_date: '2026-11-25',
  end_date: '2026-12-04',
  region: '서울',
  city: '서울',
  venue_text: 'CGV 압구정 · CGV 청담씨네시티',
  banner_url: null,
  poster_url: null,
  shortcut_image_url: null,
  link_url: 'https://siff.kr/',
  description: null,
  is_active: true,
}

interface Venue {
  name: string
  /** 좌표·주소를 못 찾았을 때 쓸 검색어 — 극장 이름만으로는 안 잡히는 곳이 있다 */
  searchQuery?: string
  screenCount?: number
}

// 순서 = 화면에 보이는 순서(sort_order). 개·폐막식이 열리는 압구정이 주 상영관.
// 이름은 src/lib/festival/siffSchedule.ts의 VENUE_RULES가 만드는 이름과 같아야 회차가 상영관에 붙는다.
const VENUES: Venue[] = [
  // 신관 ART1관 · ART2관 · 4관 + 본관 3관
  { name: 'CGV 압구정', searchQuery: 'CGV 압구정', screenCount: 4 },
  // 3관(컴포트석) · 프리미엄관
  { name: 'CGV 청담씨네시티', searchQuery: 'CGV 청담씨네시티', screenCount: 2 },
]

const TIMETABLE_URL = 'https://siff.kr/screening/timetable/'

async function fetchSchedule(): Promise<SiffScreening[]> {
  const res = await fetch(TIMETABLE_URL, {
    headers: crawlerHeaders(),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`시간표 요청 실패: HTTP ${res.status}`)
  const screenings = parseSiffTimetable(await res.text())
  const byDate = new Map<string, number>()
  for (const s of screenings) byDate.set(s.screeningDate, (byDate.get(s.screeningDate) ?? 0) + 1)
  for (const [date, count] of [...byDate].sort()) console.log(`  ${date} — ${count}회차`)
  return screenings
}

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
      city: '서울',
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

  // 상영관 구성은 발표 때마다 바뀐다 — 통째로 갈아끼워야 지난 회차의 잔재가 안 남는다.
  // 회차가 festival_theater_id로 가리키므로 상영관을 먼저 지우면 회차 링크가 SET NULL로 끊긴다 —
  // 회차도 아래에서 같이 갈아끼우니 괜찮다.
  const festivalTheaterIdByName = new Map<string, string>()
  if (APPLY && festivalId) {
    await supabase.from('festival_theaters').delete().eq('festival_id', festivalId)
    const { data, error } = await supabase.from('festival_theaters').insert(
      links.map((l) => ({
        festival_id: festivalId,
        theater_id: l.theaterId,
        // theaters에 등록된 곳은 조인해서 이름을 가져오므로 venue_text를 비운다
        venue_text: l.theaterId ? null : l.venue.name,
        sort_order: l.sortOrder,
      })),
    ).select('id, sort_order')
    if (error) throw new Error(`festival_theaters insert 실패: ${error.message}`)
    for (const row of data ?? []) festivalTheaterIdByName.set(links[row.sort_order].venue.name, row.id)
  }

  const linked = links.filter((l) => l.theaterId).length
  console.log(`\n상영관 ${links.length}곳 — 극장 연결 ${linked}곳 / 이름만 ${links.length - linked}곳`)

  // ── 상영 시간표 ───────────────────────────────────────────
  console.log('\n상영 시간표:')
  const screenings = await fetchSchedule()

  const known = new Set(VENUES.map((v) => v.name))
  const unknown = [...new Set(screenings.map((s) => s.venueLabel).filter((v) => !known.has(v)))]
  if (unknown.length > 0) {
    // 새 상영관이 생겼다 — 회차는 넣되 상영관 링크 없이 들어간다. VENUES·VENUE_RULES를 맞출 것.
    console.warn(`  ⚠ VENUES에 없는 상영관: ${unknown.join(', ')}`)
  }

  // 상영코드가 없어 (날짜, 시각, 상영관, 관)으로 겹침을 본다 — 겹치면 파서가 칸을 두 번 읽은 것
  const keys = new Set<string>()
  for (const s of screenings) {
    const key = `${s.screeningDate} ${s.startTime} ${s.venueLabel} ${s.screenLabel ?? ''}`
    if (keys.has(key)) throw new Error(`회차 중복: ${key}`)
    keys.add(key)
  }
  const outside = screenings.filter((s) => s.screeningDate < FESTIVAL.start_date || s.screeningDate > FESTIVAL.end_date)
  // 폐막일 심야상영은 다음 날 새벽에 끝나지만 시작이 익일이면 회기 밖으로 나간다 — 알리기만 한다
  if (outside.length > 0) console.warn(`  ⚠ 회기 밖 날짜 ${outside.length}회차: ${outside.map((s) => s.screeningDate).join(', ')}`)

  console.log(`  합계 ${screenings.length}회차 · GV ${screenings.filter((s) => s.hasGv).length}회차`)

  if (APPLY && festivalId) {
    await supabase.from('festival_screenings').delete().eq('festival_id', festivalId)
    const rows = screenings.map((s) => ({
      festival_id: festivalId,
      screening_date: s.screeningDate,
      start_time: s.startTime,
      runtime_min: s.runtimeMin ?? null,
      festival_theater_id: festivalTheaterIdByName.get(s.venueLabel) ?? null,
      venue_label: s.venueLabel,
      screen_label: s.screenLabel,
      // 영화 매칭은 하지 않는다 — 제목만 같은 옛 영화에 잘못 붙는 게 비어 있는 것보다 나쁘다
      movie_id: null,
      movie_title_snapshot: s.title,
      section: s.section,
      screening_code: null,
      has_gv: s.hasGv,
      booking_url: s.programUrl,
    }))
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('festival_screenings').insert(rows.slice(i, i + 200))
      if (error) throw new Error(`festival_screenings insert 실패: ${error.message}`)
    }
    console.log(`  저장 ${rows.length}회차`)
  }

  if (!APPLY) console.log('\n실제 저장하려면 --apply를 붙여 다시 실행할 것')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
