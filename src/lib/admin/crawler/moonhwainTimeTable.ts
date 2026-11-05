import { decodeHtmlEntity, normalizeWhitespace, stripHtml } from './utils'

/* 문화인(moonhwain) 예매를 쓰는 작은영화관 중 일부는 `/reservation/01.html` 대신
 * `/homePy/timeTable/index.html?b_id=…&selDate=YYYY-MM-DD` 시간표 화면만 연다
 * (고흥작은영화관 · 알프스시네마, 2026-11 확인). 예전에는 이 둘을 범용 표 파서(tableText)에
 * 걸어 두어 시간표가 자바스크립트로 그려지는 극장 소개 페이지를 읽었고, 매번 0건이었다. */

export interface MoonhwainTimeTableRow {
  movieTitle: string
  screenName: string
  /** HH:MM */
  showTime: string
  /** 예매 창 번호 — 지난 회차·마감 회차는 링크가 없어 비어 있다 */
  ssIdx?: string
  endTime?: string
  seatAvailable?: number
}

/** 상영일 선택 상자에 있는 날짜(YYYY-MM-DD) */
export function parseMoonhwainTimeTableDates(html: string): string[] {
  const select = html.match(/<select[^>]*id=["']selDate["'][\s\S]*?<\/select>/)?.[0] ?? ''
  return Array.from(new Set(Array.from(select.matchAll(/<option[^>]*value=["'](\d{4}-\d{2}-\d{2})["']/g)).map((m) => m[1])))
}

export function parseMoonhwainTimeTableDay(rawHtml: string): MoonhwainTimeTableRow[] {
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '')
  const tbody = html.match(/<div class="schedule">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? ''
  const rows: MoonhwainTimeTableRow[] = []

  for (const tr of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = Array.from(tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m) => m[1])
    if (cells.length < 4) continue
    const movieTitle = normalizeWhitespace(decodeHtmlEntity(stripHtml(cells[0])))
    // "1관 (고흥작은영화관)" — 괄호 속 극장 이름은 뺀다
    const screenName = normalizeWhitespace(decodeHtmlEntity(stripHtml(cells[2]))).replace(/\s*\([^)]*\)$/, '') || '상영관 확인 필요'
    if (!movieTitle) continue

    for (const li of cells[3].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) {
      const booking = li[1].match(/wRsv\('[\d-]+'\s*,\s*'(\d+)'\)/)
      const span = li[1].match(/<span[^>]*l_name="(\d+)석"[^>]*wr_name="(\d{1,2}:\d{2})"[^>]*>[^<]*?(\d{1,2}:\d{2})\s*<\/span>/)
      const time = span?.[3] ?? stripHtml(li[1]).match(/(\d{1,2}:\d{2})/)?.[1]
      if (!time) continue
      rows.push({
        movieTitle,
        screenName,
        showTime: time.padStart(5, '0'),
        ssIdx: booking?.[1],
        endTime: span?.[2]?.padStart(5, '0'),
        seatAvailable: span ? Number(span[1]) : undefined,
      })
    }
  }

  return rows
}
