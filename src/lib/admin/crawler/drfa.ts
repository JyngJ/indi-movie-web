import { decodeHtmlEntity, normalizeWhitespace, stripHtml } from './utils'

/* DRFA 365예술극장(drfa.co.kr, XE PlannerXE 달력)을 읽는 순수 함수.
 *
 * 예전 파서는 연월을 페이지 첫 "YYYY년 M월" 문구에서 읽었다. 그런데 일정마다 붙는 소개 툴팁에
 * "1965년 12월 31일 네브래스카…" 같은 문장이 먼저 나와 11월 달력을 12월로 읽었고, 셀 안
 * 날짜 숫자도 다른 태그에 걸려 엇나가 2026-10 이후 0건이었다. 날짜는 각 날짜 칸의 id
 * (`day_schedule_container_2026-11-5`)에 그대로 들어 있으니 그걸 쓴다. */

/** 상영관 정원 — 시간표에는 남은 좌석만 나온다 */
export const DRFA_SEAT_TOTAL = 35

export interface DrfaShowtime {
  movieTitle: string
  /** 원제·제작연도 줄 — "Ko to tamo peva,1980" */
  originalTitle: string
  releaseYear?: number
  /** YYYY-MM-DD */
  showDate: string
  /** HH:MM (24시간) */
  showTime: string
  seatAvailable: number | null
  seatTotal: number | null
  detailUrl?: string
}

function to24h(time: string, period: string) {
  const [hStr, m] = time.split(':')
  let h = Number(hStr)
  const p = period.toLowerCase()
  if (p === 'pm' && h < 12) h += 12
  if (p === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m}`
}

export function parseDrfaCalendar(html: string): DrfaShowtime[] {
  const showtimes: DrfaShowtime[] = []
  const dayRe = /id=['"]day_schedule_container_(\d{4})-(\d{1,2})-(\d{1,2})['"]/g
  const days = Array.from(html.matchAll(dayRe))

  days.forEach((day, i) => {
    const showDate = `${day[1]}-${day[2].padStart(2, '0')}-${day[3].padStart(2, '0')}`
    const body = html.slice(day.index! + day[0].length, days[i + 1]?.index ?? html.length)

    for (const entry of body.split(/<div class=['"]drag['"]>/).slice(1)) {
      // 툴팁(title='…')의 줄거리는 건너뛰고 본문 span만 본다
      const visible = entry.replace(/title='[^']*'/g, '').replace(/title="[^"]*"/g, '')
      const head = visible.match(/<b>\s*(\d{1,2}:\d{2})\s*(am|pm)\s*<br\s*\/?>\s*<br\s*\/?>([\s\S]*?)<\/font/i)
      if (!head) continue
      const movieTitle = normalizeWhitespace(decodeHtmlEntity(stripHtml(head[3])))
      if (movieTitle.length < 2) continue

      const originalTitle = normalizeWhitespace(decodeHtmlEntity(stripHtml(
        visible.match(/<\/b>\s*<br\s*\/?>([^<]*)<br/i)?.[1] ?? '',
      )))
      const year = originalTitle.match(/(?:^|[,\s])((?:19|20)\d{2})\s*$/)?.[1]
      // "잔여좌석/23석" — 슬래시 뒤가 남은 좌석 수다(2026-11 실측: 날마다 19~35로 달라지고 35를 넘지 않는다)
      const remaining = visible.match(/잔여좌석[\s\S]*?<\/b>\s*\/\s*(\d+)\s*석/)?.[1]
      const detailUrl = entry.match(/href=['"]?(https?:\/\/drfa\.co\.kr\/TIMETABLE\/\d+)/)?.[1]

      showtimes.push({
        movieTitle,
        originalTitle,
        releaseYear: year ? Number(year) : undefined,
        showDate,
        showTime: to24h(head[1], head[2]),
        seatAvailable: remaining ? Number(remaining) : null,
        seatTotal: remaining ? DRFA_SEAT_TOTAL : null,
        detailUrl,
      })
    }
  })

  return showtimes
}
