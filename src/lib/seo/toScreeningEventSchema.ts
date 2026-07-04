import type { MovieTheaterEntry } from '@/lib/catalog/getMovieTheaterShowtimes'

/** JSON-LD 크기 폭주 방지 — 가까운 날짜순 상한 */
export const MAX_SCREENING_EVENTS = 50

interface ScreeningEventMovie {
  id: string
  title: string
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * 극장별 상영시간표를 ScreeningEvent JSON-LD 배열로 변환한다.
 * 회차가 많을 수 있어 가까운 날짜·시간순으로 정렬 후 MAX_SCREENING_EVENTS개로 자른다.
 */
export function toScreeningEventSchema(
  movie: ScreeningEventMovie,
  entries: MovieTheaterEntry[],
  baseUrl: string,
): Record<string, unknown>[] {
  const movieUrl = `${baseUrl}/movie/${movie.id}`

  const flat = entries.flatMap((entry) =>
    entry.dateGroups.flatMap((group) =>
      group.showtimes.map((st) => ({
        theaterName: entry.theaterName,
        theaterAddress: entry.theaterAddress,
        date: group.date,
        time: st.showTime,
        endTime: st.endTime,
        bookingUrl: st.bookingUrl,
      })),
    ),
  )

  flat.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return flat.slice(0, MAX_SCREENING_EVENTS).map((show) => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'ScreeningEvent',
      name: movie.title,
      workPresented: {
        '@type': 'Movie',
        name: movie.title,
        url: movieUrl,
      },
      location: {
        '@type': 'MovieTheater',
        name: show.theaterName,
        address: show.theaterAddress,
      },
      startDate: `${show.date}T${show.time.slice(0, 5)}:00+09:00`,
    }

    if (show.endTime) {
      const end = show.endTime.slice(0, 5)
      // 자정 넘는 회차(예: 23:50 시작 → 01:40 종료)는 종료일이 다음날
      const endDate = end < show.time.slice(0, 5) ? addDaysIso(show.date, 1) : show.date
      schema.endDate = `${endDate}T${end}:00+09:00`
    }

    if (show.bookingUrl) {
      schema.offers = {
        '@type': 'Offer',
        url: show.bookingUrl,
      }
    }

    return schema
  })
}
