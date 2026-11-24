// ================================
// 문화인(moonhwain) /reservation/01.html 시간표 — 날짜·회차 추출 (순수 함수)
// ================================

/*
 * 2026-11-24 전주 시네마타운(jcinema.moonhwain.net:451) 실제 마크업(운영자 추출):
 *
 *   날짜 칸 (한 달 30칸)
 *     지난 날        <div class="day"><span title="2026-11-23">23<em class="week">월</em></span></div>
 *     오늘(선택)     <div class="day sel"><a href="?ss_date=2026-11-24" title="2026-11-24">24…</a></div>
 *     예매 열린 날   <div class="day on"><a href="?ss_date=2026-11-25" title="2026-11-25">25…</a></div>
 *     예매 없는 미래 <div class="day"><span title="2026-11-28">28…</span></div>
 *
 *   시간표 행
 *     <tr><td><p class="i_grade c_orange">15</p><h4><a href="/movie/detail.html?p_idx=3418&amp;ss_date=2026-11-24">제목</a></h4></td>
 *         <td>디지털</td><td class="center"><!--주석--> 5관 </td>
 *         <td class="time"><a href="javascript:wRsvMovie('jcinema','98339','');">10:00</a>…</td></tr>
 *
 * 예전 파서는 `.day.on`만 날짜로 봤다. 오늘 칸은 `sel`이라 빠졌고, 11/20~23에 44→33→22→11건으로
 * 하루씩 줄다가 예매 열린 날이 오늘 하나만 남은 11/24에 "상영 날짜를 찾지 못했습니다"가 됐다.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_CELL = /<div[^>]+class="(?:[^"]*\s)?day(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/div>/g

/**
 * 예매 가능한 날짜 = 날짜 칸 중 안쪽이 `<a>`(링크)인 칸. 클래스(day / day sel / day on)는 보지 않는다.
 * `<span>` 칸은 지난 날이거나 예매가 없는 미래라 뺀다 — title에 날짜가 있어도 읽지 않는다.
 * 날짜 값은 a의 title, 없으면 href의 ss_date. 오늘(KST) 이전은 버린다.
 *
 * 날짜 칸이 아예 없는 화면이면 페이지의 `?ss_date=` 링크로 대신한다. 이때 제목 링크
 * (/movie/detail.html?…&ss_date=)도 섞이지만 그 날짜는 지금 보고 있는 날이라 해가 없다.
 */
export function parseMoonhwainReservationDates(html: string, todayIso: string): string[] {
  const dates = new Set<string>()
  let sawDayCell = false
  for (const cell of html.matchAll(DAY_CELL)) {
    sawDayCell = true
    const anchor = cell[1].match(/<a\b[^>]*>/i)?.[0]
    if (!anchor) continue
    const date = anchor.match(/title="(\d{4}-\d{2}-\d{2})"/)?.[1]
      ?? anchor.match(/[?&](?:amp;)?ss_date=(\d{4}-\d{2}-\d{2})/)?.[1]
    if (date) dates.add(date)
  }
  if (!sawDayCell) {
    for (const match of html.matchAll(/[?&](?:amp;)?ss_date=(\d{4}-\d{2}-\d{2})/g)) dates.add(match[1])
  }
  return Array.from(dates)
    .filter((date) => ISO_DATE.test(date) && date >= todayIso)
    .sort()
}

/** 시간표 표에 예매 링크(wRsvMovie) 회차가 하나라도 있는지 — 날짜 칸 없이 오늘 표만 그린 화면 대비 */
export function hasMoonhwainSessions(html: string) {
  return /javascript:wRsvMovie\(/.test(html)
}

function htmlToText(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 행의 영화 제목. 제목은 `<h4>`(안에 상세 링크 `<a>`)에 있다. 첫 칸의 관람등급 `<p class="i_grade">15</p>`는
 * h4 밖이지만, h4가 없는 화면에서 첫 칸을 통째로 읽으면 "15 제목"이 되므로 등급 p는 늘 뺀다.
 */
export function extractMoonhwainMovieTitle(rowHtml: string): string {
  const h4 = rowHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1]
  const raw = h4 ?? rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ''
  const withoutRating = raw
    .replace(/<p[^>]*class="[^"]*i_grade[^"]*"[^>]*>[\s\S]*?<\/p>/gi, ' ')
    .replace(/<p[^>]*>\s*(?:\d{1,2}|ALL|전체|청불|청소년\s*관람\s*불가)\s*<\/p>/gi, ' ')
  return htmlToText(withoutRating)
}

export interface MoonhwainReservationRow {
  movieTitle: string
  /** 상영 타입(디지털 등) */
  screenType: string
  /** 상영관 — 앞의 HTML 주석은 뺀다 */
  screenName: string
  showTime: string
  /** wRsvMovie 첫 인자 — 극장 코드 */
  bId: string
  /** wRsvMovie 둘째 인자 — 회차 ID */
  inSsIdx: string
  /** wRsvMovie 셋째 인자 — 비어 있는 경우가 많다 */
  q: string
}

/** 시간표 표의 회차. 예매 링크(wRsvMovie)가 없는 행(머리·안내)은 건너뛴다 */
export function parseMoonhwainReservationDay(html: string): MoonhwainReservationRow[] {
  const rows: MoonhwainReservationRow[] = []
  for (const rowMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1]
    if (!/javascript:wRsvMovie\(/.test(row)) continue
    const movieTitle = extractMoonhwainMovieTitle(row)
    if (!movieTitle) continue
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1])
    const screenType = htmlToText(cells[1] ?? '')
    const screenName = htmlToText(cells[2] ?? '')
    for (const [, bId, inSsIdx, q, rawTime] of row.matchAll(
      /javascript:wRsvMovie\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\)[^>]*>\s*(\d{1,2}:\d{2})/g,
    )) {
      const [h, m] = rawTime.split(':')
      rows.push({ movieTitle, screenType, screenName, showTime: `${h.padStart(2, '0')}:${m}`, bId, inSsIdx, q })
    }
  }
  return rows
}
