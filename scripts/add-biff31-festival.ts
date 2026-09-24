/**
 * 제31회 부산국제영화제(biff.kr) — 영화제 + 상영관 + 상영 시간표 등록
 *
 *   npx tsx scripts/add-biff31-festival.ts            # dry-run(기본) — biff.kr은 읽고 DB엔 안 쓴다
 *   npx tsx scripts/add-biff31-festival.ts --apply    # 실제 저장
 *
 * 회기: 2026-10-06(화) ~ 10-15(목)
 *
 * 상영관은 2026-09-19에 공개된 biff.kr 날짜별 상영시간표(/kor/html/schedule/date.asp)에
 * 실제로 등장하는 8곳이다. 회차는 같은 페이지 10장(개막일~폐막일)을 순서대로 읽어
 * festival_screenings에 통째로 갈아끼운다 — 시간표가 바뀌면 다시 실행하면 된다.
 *
 * ⚠ CGV·롯데시네마는 우리가 평소 회차를 모으지 않는 멀티플렉스다. theaters에 넣으면 지도에
 * 핀이 서지만 극장 상세의 상영 시간표는 비어 있다 — 영화제 상세가 isMultiplexVenue로
 * "영화제 회차는 이 페이지 시간표에 있다"고 안내한다(src/lib/festival/venue.ts). 영화제가
 * 끝나도 핀은 남으니, 정리하려면 지우는 게 아니라 회차 소스를 붙이는 쪽으로 판단할 것.
 *
 * 사전 조건: docs/SUPABASE_FESTIVAL_SCREENINGS.sql · docs/SUPABASE_FESTIVAL_MEDIA.sql을
 * Supabase SQL 편집기에서 먼저 실행.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { crawlerHeaders } from '../src/lib/admin/crawler/utils'
import { parseBiffRuntime, parseBiffScheduleDay, parseBiffSectionMap, type BiffScreening } from '../src/lib/festival/biffSchedule'

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
  // 공식 포스터는 세로라 banner_url(가로 배너 자리)이 아니라 poster_url에 둔다.
  // 원본(biff.kr, 3000×4499 PNG 10MB)을 600×900 JPG로 줄여 사이트에 올렸다 — 핫링크하면 변환마다 10MB를 받는다.
  banner_url: null,
  poster_url: '/images/festivals/biff31-poster.jpg',
  shortcut_image_url: '/images/festivals/biff31-shortcut.png',
  link_url: 'https://www.biff.kr/kor/',
  // 설명은 두지 않는다 — 기간·장소·공식 사이트가 상단에 이미 있고, 예매 안내는 회차 선택 카드가 맡는다
  description: null,
  is_active: true,
}

/**
 * 작품 상세를 한 번씩만 읽어 러닝타임을 붙인다. 행사 페이지는 러닝타임이 없어 건너뛴다.
 * 시간표와 같은 예절로 동시 요청 없이 1초 간격 — 작품 230편 안팎이라 4분쯤 걸린다.
 */
async function attachRuntimes(screenings: BiffScreening[]): Promise<void> {
  const urls = [...new Set(screenings
    .map((screening) => screening.programUrl)
    .filter((url): url is string => Boolean(url?.includes('/program/prog_view.asp'))))]
  const runtimeByUrl = new Map<string, number | null>()

  console.log(`  작품 러닝타임 ${urls.length}개 확인`)
  for (const [index, url] of urls.entries()) {
    const res = await fetch(url, {
      headers: crawlerHeaders(),
      signal: AbortSignal.timeout(15000),
    }).catch(() => null)
    const runtime = res?.ok ? parseBiffRuntime(await res.text()) : null
    runtimeByUrl.set(url, runtime)
    if ((index + 1) % 50 === 0 || index === urls.length - 1) {
      console.log(`    ${index + 1}/${urls.length}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  for (const screening of screenings) {
    screening.runtimeMin = screening.programUrl ? runtimeByUrl.get(screening.programUrl) ?? null : null
  }
}

interface Venue {
  name: string
  /** 좌표·주소를 못 찾았을 때 쓸 검색어 — 극장 이름만으로는 안 잡히는 곳이 있다 */
  searchQuery?: string
  screenCount?: number
  /** theaters에 등록하지 않고 이름만 남긴다 — 백화점 홀·강의실처럼 지도에 핀을 세울 극장이 아닌 곳 */
  nameOnly?: boolean
}

// 순서 = 화면에 보이는 순서(sort_order). 영화의전당이 주 상영관이라 맨 앞.
// 이름은 src/lib/festival/biffSchedule.ts의 VENUE_RULES가 만드는 이름과 같아야 회차가 상영관에 붙는다.
const VENUES: Venue[] = [
  // 하늘연극장 · 중극장 · 소극장 · 시네마테크 · 루프씨어터
  { name: '영화의전당', screenCount: 5 },
  // 1~6관 · IMAX관
  { name: 'CGV 센텀시티', searchQuery: 'CGV 센텀시티', screenCount: 7 },
  // 2~10관
  { name: '롯데시네마 센텀시티', searchQuery: '롯데시네마 센텀시티', screenCount: 9 },
  { name: '영화진흥위원회 표준시사실', searchQuery: '영화진흥위원회 부산', screenCount: 1 },
  // 홀 이름이 스폰서를 따라 바뀐다(30회 신한카드홀 → 31회 우리은행홀). 건물 이름으로 등록한다.
  { name: '동서대학교 소향씨어터', searchQuery: '소향씨어터', screenCount: 1 },
  { name: '부산시청자미디어센터', searchQuery: '부산시청자미디어센터', screenCount: 1 },
  // 액터스 하우스·마스터 클래스 같은 행사장
  { name: '신세계백화점 센텀시티점', nameOnly: true },
  { name: '동서대학교 센텀캠퍼스', nameOnly: true },
]

const SCHEDULE_URL = 'https://www.biff.kr/kor/html/schedule/date.asp'

/** biff.kr 날짜별 시간표를 하루씩 순서대로 읽는다 — 동시 요청 없이, 요청 사이 1초 쉰다 */
async function fetchSchedule(): Promise<BiffScreening[]> {
  const out: BiffScreening[] = []
  const start = new Date(`${FESTIVAL.start_date}T00:00:00Z`)
  const end = new Date(`${FESTIVAL.end_date}T00:00:00Z`)

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    const res = await fetch(`${SCHEDULE_URL}?day1=${d.getUTCDate()}`, {
      headers: crawlerHeaders(),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`시간표 요청 실패 ${iso}: HTTP ${res.status}`)
    const html = await res.text()
    const day = parseBiffScheduleDay(html, iso, parseBiffSectionMap(html))
    console.log(`  ${iso} — ${day.length}회차`)
    out.push(...day)
    await new Promise((r) => setTimeout(r, 1000))
  }
  return out
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
  if (venue.nameOnly) {
    console.log(`  이름만: ${venue.name}`)
    return null
  }

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
  await attachRuntimes(screenings)

  const known = new Set(VENUES.map((v) => v.name))
  const unknown = [...new Set(screenings.map((s) => s.venueLabel).filter((v) => !known.has(v)))]
  if (unknown.length > 0) {
    // 새 상영관이 생겼다 — 회차는 넣되 상영관 링크 없이 들어간다. VENUES·VENUE_RULES를 맞출 것.
    console.warn(`  ⚠ VENUES에 없는 상영관: ${unknown.join(', ')}`)
  }

  const codes = new Set<string>()
  for (const s of screenings) {
    if (codes.has(s.screeningCode)) throw new Error(`상영코드 중복: ${s.screeningCode} — 파서가 칸을 두 번 읽었다`)
    codes.add(s.screeningCode)
  }

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
      screening_code: s.screeningCode,
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
