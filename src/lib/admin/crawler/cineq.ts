import { decodeHtmlEntity, normalizeWhitespace, stripHtml } from './utils'

/* 씨네Q 상영 시간표(`POST /Theater/MovieTable2`)를 읽는 순수 함수.
 *
 * 2026-11 씨네Q가 시간표 화면을 바꿨다. PlayDate를 `YYYYMMDD`로만 받고(예전 `YYYY-MM-DD`는
 * 빈 화면을 200으로 돌려준다), 영화 묶음도 `each-movie-title` + `<h3>`에서
 * `each-movie-time` + `div.title`로 바뀌었다. 예전 파서는 오류 없이 0건을 내며
 * 신도림 페이지를 비워 두고 있었다. */

export interface CineQShowtime {
  movieTitle: string
  screenName: string
  /** YYYY-MM-DD */
  showDate: string
  /** HH:MM */
  showTime: string
  endTime: string
  seatAvailable: number | null
  seatTotal: number | null
  movieCode: string
  screenPlanId: string
  /** 조조 · 기획전 같은 회차 표시 */
  attributes: string[]
}

/** 2026-11-06 → 20261106 */
export function toCineQPlayDate(isoDate: string) {
  return isoDate.replace(/-/g, '')
}

function fromCompactDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function padTime(value: string) {
  const [h, m] = value.split(':')
  return `${h.padStart(2, '0')}:${m}`
}

export function parseCineQMovieTable(html: string): CineQShowtime[] {
  const showtimes: CineQShowtime[] = []

  for (const movieBlock of html.split('class="each-movie-time"').slice(1)) {
    const rawTitle = movieBlock.match(/<div class="title">([\s\S]*?)<\/div>/)?.[1] ?? ''
    // 앞의 관람등급 배지(<span class="rate-15">15</span>)는 제목이 아니다
    const movieTitle = normalizeWhitespace(decodeHtmlEntity(stripHtml(rawTitle.replace(/<span[^>]*>[\s\S]*?<\/span>/g, ''))))
    if (!movieTitle) continue

    for (const screenBlock of movieBlock.split('class="screen"').slice(1)) {
      const rawScreen = screenBlock.match(/<div class="screen-name"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''
      // "4 관" · "(씨네필)9 관" — 관 앞 공백만 붙인다
      const screenName = normalizeWhitespace(decodeHtmlEntity(stripHtml(rawScreen.replace(/<br\s*\/?>/gi, ' ')))).replace(/\s+관$/, '관') || '상영관 확인 필요'

      for (const timeBlock of screenBlock.split(/<div class="time"(?=[\s>])/).slice(1)) {
        const playDate = timeBlock.match(/data-playdate="(\d{8})"/)?.[1]
        const movieCode = timeBlock.match(/data-moviecode="([^"]+)"/)?.[1] ?? ''
        const screenPlanId = timeBlock.match(/data-screenplanid="([^"]+)"/)?.[1] ?? ''
        const time = timeBlock.match(/<a[^>]*>\s*(\d{1,2}:\d{2})\s*<span class="to">\s*~\s*(\d{1,2}:\d{2})/)
        if (!playDate || !time) continue
        const seats = timeBlock.match(/class="seats-status">\s*(\d+)\s*\/\s*(\d+)\s*</)
        const attributes = Array.from(timeBlock.matchAll(/class="timetable-attrib-[^"]*"[^>]*>([^<]+)</g)).map((m) => m[1].trim())

        showtimes.push({
          movieTitle,
          screenName,
          showDate: fromCompactDate(playDate),
          showTime: padTime(time[1]),
          endTime: padTime(time[2]),
          seatAvailable: seats ? Number(seats[1]) : null,
          seatTotal: seats ? Number(seats[2]) : null,
          movieCode,
          screenPlanId,
          attributes,
        })
      }
    }
  }

  return showtimes
}
