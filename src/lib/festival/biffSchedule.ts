// ─────────────────────────────────────────────
// 부산국제영화제(biff.kr) 날짜별 상영시간표 HTML → 회차 행 — 순수 함수.
//
// 입력: https://www.biff.kr/kor/html/schedule/date.asp?day1=<일> 의 HTML 한 장.
// 페이지는 상영관(관 단위) 한 줄마다 회차 칸을 늘어놓는다:
//
//   <div class="sch_li"><div class="sch_li_tit">CGV센텀시티 6관</div>
//     <div class="sch_it sch_it1"><span class="code en" data-scode="004">004</span>
//       <div class="film_tit"><p class="time en">09:20</p>
//         <a href="/kor/html/program/prog_view.asp?idx=89329&c_idx=432">
//           <span class="film_tit_kor">아버지의 방</span> …
//       <div class="grade"> … <span class="ico_grade ico_gv">GV</span>
//     <div class="sch_it sch_it2 blank_wrap">…  ← 빈 칸
//
// 섹션 이름은 칸에 없고 링크의 c_idx로만 나온다. 같은 페이지 상단 메뉴의
// prog_list.asp?c_idx=… 링크가 번호 ↔ 이름 표라서 그걸 먼저 읽는다.
// 묶음상영(단편 두 편 이상)은 제목이 "A + B"로 한 줄에 나오고 링크는 편마다 따로 달린다.
// ─────────────────────────────────────────────

export const BIFF_BASE_URL = 'https://www.biff.kr'

/** 상영이 아니라 행사(토크·클래스)인 회차의 섹션 표기 */
export const EVENT_SECTION = '행사'

export interface BiffScreening {
  /** ISO date "YYYY-MM-DD" */
  screeningDate: string
  /** "HH:MM" */
  startTime: string
  venueLabel: string
  screenLabel: string | null
  title: string
  section: string | null
  /** 상영코드 "004" — 영화제 안에서 유일하다 */
  screeningCode: string
  hasGv: boolean
  /** 첫 편의 biff.kr 작품(행사) 페이지 — 예매 버튼이 거기 있다 */
  programUrl: string | null
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// 진짜 태그만 지운다. 행사 제목은 "<범죄도시> 시리즈"처럼 작품명 꺾쇠를 이스케이프 없이 싣는다.
function stripTags(html: string): string {
  return decodeEntities(html.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\/?>/g, '')).replace(/\s+/g, ' ').trim()
}

/** 상단 메뉴에서 섹션 번호 ↔ 이름 표를 읽는다 — `prog_list.asp?c_idx=442` → "경쟁" */
export function parseBiffSectionMap(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /prog_list\.asp\?c_idx=(\d+)['"][^>]*>(?:\s*<span>)?([^<]+)</g
  for (const match of html.matchAll(re)) {
    const name = stripTags(match[2])
    if (name && !out[match[1]]) out[match[1]] = name
  }
  return out
}

interface VenueRule {
  prefix: string
  venue: string
}

// biff.kr 표기 → 영화제 상영관 이름(scripts/add-biff31-festival.ts의 VENUES와 같은 이름).
// 표기는 "CGV센텀시티 6관"처럼 극장 이름 뒤에 관 이름이 붙는다. 극장 부분만 떼어 이름을 맞추고
// 나머지는 관 이름으로 남긴다. 규칙에 없는 곳은 표기를 그대로 극장 이름으로 쓴다.
const VENUE_RULES: VenueRule[] = [
  { prefix: '영화의전당', venue: '영화의전당' },
  { prefix: 'CGV센텀시티', venue: 'CGV 센텀시티' },
  { prefix: 'CGV 센텀시티', venue: 'CGV 센텀시티' },
  { prefix: '롯데시네마 센텀시티', venue: '롯데시네마 센텀시티' },
  { prefix: '소향씨어터', venue: '동서대학교 소향씨어터' },
  { prefix: '영화진흥위원회 표준시사실', venue: '영화진흥위원회 표준시사실' },
  { prefix: '부산시청자미디어센터', venue: '부산시청자미디어센터' },
  { prefix: '신세계백화점 센텀시티점', venue: '신세계백화점 센텀시티점' },
  { prefix: '동서대학교-경남정보대학교', venue: '동서대학교 센텀캠퍼스' },
]

/** "CGV센텀시티 6관" → { venue: "CGV 센텀시티", screen: "6관" } */
export function splitBiffVenue(raw: string): { venue: string; screen: string | null } {
  const label = raw.replace(/\s+/g, ' ').trim()
  for (const rule of VENUE_RULES) {
    if (!label.startsWith(rule.prefix)) continue
    const rest = label.slice(rule.prefix.length).trim()
    return { venue: rule.venue, screen: rest || null }
  }
  return { venue: label, screen: null }
}

/**
 * 날짜별 시간표 한 장을 회차 목록으로.
 * @param date 이 페이지의 날짜 ISO "YYYY-MM-DD" — 페이지 안에는 연도가 없어서 호출부가 준다
 * @param sectionMap parseBiffSectionMap 결과. 비어 있으면 섹션을 null로 둔다
 */
export function parseBiffScheduleDay(
  html: string,
  date: string,
  sectionMap: Record<string, string> = {},
): BiffScreening[] {
  const out: BiffScreening[] = []

  for (const row of html.split('<div class="sch_li">').slice(1)) {
    const titleMatch = row.match(/<div class="sch_li_tit">([\s\S]*?)<\/div>/)
    if (!titleMatch) continue
    const { venue, screen } = splitBiffVenue(stripTags(titleMatch[1]))

    for (const cell of row.split(/<div class="sch_it /).slice(1)) {
      const code = cell.match(/data-scode="([^"]+)"/)?.[1]
      const time = cell.match(/class="time en">\s*(\d{1,2}:\d{2})/)?.[1]
      const titleHtml = cell.match(/class="film_tit_kor">([\s\S]*?)<\/(?:span|p)>/)?.[1]
      if (!code || !time || !titleHtml) continue

      const href = cell.match(/href\s*=\s*"(\/kor\/[^"]+)"/)?.[1] ?? null
      const sectionId = href?.match(/c_idx=(\d+)/)?.[1]
      // 마스터 클래스·액터스 하우스 같은 행사는 작품 페이지(prog_view)가 아니라 행사 페이지로 걸린다
      const isEvent = !!href && !href.includes('prog_view.asp')

      out.push({
        screeningDate: date,
        startTime: time.padStart(5, '0'),
        venueLabel: venue,
        screenLabel: screen,
        title: stripTags(titleHtml),
        section: isEvent ? EVENT_SECTION : sectionId ? sectionMap[sectionId] ?? null : null,
        screeningCode: code.trim(),
        hasGv: /class="ico_grade ico_gv"/.test(cell),
        programUrl: href ? `${BIFF_BASE_URL}${decodeEntities(href)}` : null,
      })
    }
  }

  return out
}
