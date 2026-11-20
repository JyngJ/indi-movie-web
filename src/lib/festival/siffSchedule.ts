// ─────────────────────────────────────────────
// 서울독립영화제(siff.kr) 상영시간표 HTML → 회차 행 — 순수 함수.
//
// 입력: https://siff.kr/screening/timetable/ 한 장. 회기 전체(날짜 탭 10개)가 한 페이지에 다 들어 있다:
//
//   <section class="ff-timetable__day" id="ff-day-1126" data-date="20261126">
//     <section class="ff-timetable__venue">
//       <h2 class="… ff-timetable__venue-name"><span class="ff-lang ff-lang--ko">CGV압구정(본관) 3관</span>…
//       <ul class="ff-timetable__grid">
//         <li class="ff-timetable__card"><p class="ff-timetable__time"><time>12:30</time> – <time>14:07</time></p>
//           <h3 class="ff-timetable__name"><span class="ff-lang ff-lang--ko">본선 단편경쟁 3</span>…
//           <p class="ff-timetable__films"><a class="ff-timetable__film" href="…/films/…/"><span class="ff-lang ff-lang--ko">콜라와 오차</span>…</a> / …
//           <li class="ff-timetable__badge ff-timetable__badge--event" title="감독 or 게스트와의 만남">
//         <li class="ff-timetable__card ff-timetable__card--empty …"></li>   ← 빈 칸
//
// - 심야상영은 시작 시각 앞에 "익일"(ff-timetable__next)이 붙는다 — 그 날짜 탭의 다음 날 회차다.
// - 마스터클래스·포럼처럼 작품 링크가 없는 칸은 행사다. 이름 아래 줄이 행사 제목이다.
// - 상영코드가 없다. 회차는 (날짜, 시각, 상영관, 관)으로 구분한다.
// ─────────────────────────────────────────────

/** 상영이 아니라 행사(토크·포럼·클래스)인 회차의 섹션 표기 — biffSchedule과 같은 값 */
export const SIFF_EVENT_SECTION = '행사'

/** 손님이 무대에 오르는 회차로 치는 행사 배지 — GV · 시네토크 · 스페셜토크 */
const GUEST_BADGES = ['감독 or 게스트와의 만남', '시네토크', '스페셜토크']

export interface SiffScreening {
  /** ISO date "YYYY-MM-DD" */
  screeningDate: string
  /** "HH:MM" */
  startTime: string
  runtimeMin: number | null
  venueLabel: string
  screenLabel: string | null
  title: string
  section: string | null
  hasGv: boolean
  /** 첫 편의 siff.kr 작품 페이지. 행사는 null */
  programUrl: string | null
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\/?>/g, '')).replace(/\s+/g, ' ').trim()
}

/** 한국어 표기 칸(ff-lang--ko)만 — 영어 표기가 바로 옆 형제로 붙어 있다 */
function koText(html: string): string {
  const match = html.match(/<span class="ff-lang ff-lang--ko">([\s\S]*?)<\/span><span class="ff-lang ff-lang--en"/)
  return stripTags(match ? match[1] : html)
}

interface VenueRule {
  prefix: string
  venue: string
}

// siff.kr 표기 → 영화제 상영관 이름(scripts/add-siff52-festival.ts의 VENUES와 같은 이름).
// 신관·본관은 같은 건물(압구정로30길 45)이라 극장 하나로 묶고, 동 이름은 관 이름에 남긴다.
const VENUE_RULES: VenueRule[] = [
  { prefix: 'CGV압구정', venue: 'CGV 압구정' },
  { prefix: 'CGV 압구정', venue: 'CGV 압구정' },
  { prefix: 'CGV청담씨네시티', venue: 'CGV 청담씨네시티' },
  { prefix: 'CGV 청담씨네시티', venue: 'CGV 청담씨네시티' },
]

/** "CGV압구정(신관) ART2관" → { venue: "CGV 압구정", screen: "신관 ART2관" } */
export function splitSiffVenue(raw: string): { venue: string; screen: string | null } {
  const label = raw.replace(/\s+/g, ' ').trim()
  for (const rule of VENUE_RULES) {
    if (!label.startsWith(rule.prefix)) continue
    const rest = label.slice(rule.prefix.length).replace(/^\(([^)]+)\)\s*/, '$1 ').trim()
    return { venue: rule.venue, screen: rest || null }
  }
  return { venue: label, screen: null }
}

/** "본선 단편경쟁 3" → "본선 단편경쟁" — 섹션 안 묶음 번호를 뗀다 */
export function siffSectionName(name: string): string {
  return name.replace(/\s+\d+$/, '').trim()
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function parseCard(card: string, tabDate: string, venue: string, screen: string | null): SiffScreening | null {
  const times = [...card.matchAll(/<time>\s*(\d{1,2}:\d{2})\s*<\/time>/g)].map((m) => m[1].padStart(5, '0'))
  const nameHtml = card.match(/<h3 class="ff-timetable__name">([\s\S]*?)<\/h3>/)?.[1]
  if (times.length === 0 || !nameHtml) return null

  const [start, end] = times
  const startsNextDay = /class="ff-timetable__next"/.test(card.split('</p>')[0])
  const runtime = end ? (toMinutes(end) - toMinutes(start) + 24 * 60) % (24 * 60) : null

  const name = koText(nameHtml)
  const filmsHtml = card.match(/<p class="ff-timetable__films">([\s\S]*?)<\/p>/)?.[1] ?? ''
  const films = [...filmsHtml.matchAll(/<a class="ff-timetable__film" href="([^"]+)">([\s\S]*?)<\/a>/g)]
  const badges = [...card.matchAll(/ff-timetable__badge--event" title="([^"]+)"/g)].map((m) => decodeEntities(m[1]))

  let title: string
  let section: string | null
  if (films.length > 0) {
    title = films.map((f) => koText(f[2])).join(' + ')
    section = siffSectionName(name)
  } else {
    // 작품 없는 칸 — 행사. 이름 아래 줄이 있으면 "마스터클래스 — 변영주X윤가은: …"
    const detail = filmsHtml ? koText(filmsHtml) : ''
    title = detail ? `${name} — ${detail}` : name
    section = SIFF_EVENT_SECTION
  }

  return {
    screeningDate: startsNextDay ? addDays(tabDate, 1) : tabDate,
    startTime: start,
    runtimeMin: runtime && runtime > 0 ? runtime : null,
    venueLabel: venue,
    screenLabel: screen,
    title,
    section,
    hasGv: badges.some((b) => GUEST_BADGES.includes(b)),
    programUrl: films[0] ? decodeEntities(films[0][1]) : null,
  }
}

/** 시간표 페이지 한 장 → 회기 전체 회차. 날짜는 탭의 data-date(YYYYMMDD)에서 읽는다 */
export function parseSiffTimetable(html: string): SiffScreening[] {
  const out: SiffScreening[] = []

  for (const day of html.split('<section class="ff-timetable__day"').slice(1)) {
    const ymd = day.match(/^[^>]*data-date="(\d{8})"/)?.[1]
    if (!ymd) continue
    const tabDate = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`

    for (const venueBlock of day.split('<section class="ff-timetable__venue">').slice(1)) {
      const venueHtml = venueBlock.match(/ff-timetable__venue-name">([\s\S]*?)<\/h2>/)?.[1]
      if (!venueHtml) continue
      const { venue, screen } = splitSiffVenue(koText(venueHtml))

      for (const card of venueBlock.split('<li class="ff-timetable__card').slice(1)) {
        if (card.startsWith(' ff-timetable__card--empty')) continue
        const row = parseCard(card, tabDate, venue, screen)
        if (row) out.push(row)
      }
    }
  }

  return out
}
