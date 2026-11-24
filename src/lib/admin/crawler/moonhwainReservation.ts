// ================================
// 문화인(moonhwain) /reservation/01.html 시간표 — 날짜·제목 추출 (순수 함수)
// ================================

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 예매 가능한 날짜 목록.
 *
 * 예전 파서는 `<div class="day on">` 안의 `<a ... ss_date=…>`만 날짜로 봤다. 2026-11-24 전주 시네마타운
 * (jcinema.moonhwain.net:451) 화면은 날짜 칸이 지난 날짜(11/1~11/23)는 링크 없는 텍스트, 예매 가능한
 * 날짜(11/24~11/27)는 `<a href="?ss_date=YYYY-MM-DD">` 링크였고(운영자 브라우저 확인), 파서는 날짜를
 * 하나도 못 찾아 "상영 날짜를 찾지 못했습니다"로 실패했다. 11/20~23 수집이 44→33→22→11건으로 하루씩
 * 줄어든 것도 같은 원인이다 — "day on" 칸이 하루씩 줄었다.
 *
 * 이제 클래스 이름에 기대지 않고 페이지의 `ss_date=` 링크를 모두 날짜로 모은다.
 * 링크 없는 지난 날짜는 자연히 빠지고, 혹시 섞여 들어온 오늘 이전 날짜는 버린다.
 * 옛 마크업(`class="day on"` 칸의 `title="YYYY-MM-DD"`)도 계속 읽는다.
 */
export function parseMoonhwainReservationDates(html: string, todayIso: string): string[] {
  const dates = new Set<string>()
  for (const match of html.matchAll(/[?&](?:amp;)?ss_date=(\d{4}-\d{2}-\d{2})/g)) dates.add(match[1])
  for (const match of html.matchAll(/<div[^>]+class="[^"]*\bday\b[^"]*"[^>]*>\s*<a[^>]+title="(\d{4}-\d{2}-\d{2})"/g)) {
    dates.add(match[1])
  }
  return Array.from(dates)
    .filter((date) => ISO_DATE.test(date) && date >= todayIso)
    .sort()
}

/** 시간표 표에 예매 링크(wRsvMovie) 회차가 하나라도 있는지 — 날짜 링크 없이 오늘 표만 그린 화면 대비 */
export function hasMoonhwainSessions(html: string) {
  return /javascript:wRsvMovie\(/.test(html)
}

/**
 * 행의 영화 제목. 제목은 `<h4>`에 있다. 첫 칸에는 관람등급 숫자("15")가 별도 `<p>`로 붙어 있어
 * h4가 없는 화면에서 첫 칸 글자를 통째로 쓰면 "15 영화제목"이 된다 — 등급 칸은 빼고 읽는다.
 */
export function extractMoonhwainMovieTitle(rowHtml: string): string {
  const h4 = rowHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1]
  const raw = h4 ?? rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ''
  const withoutRating = raw.replace(/<p[^>]*>\s*(?:\d{1,2}|ALL|전체|청불|청소년\s*관람\s*불가)\s*<\/p>/gi, ' ')
  return withoutRating
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
