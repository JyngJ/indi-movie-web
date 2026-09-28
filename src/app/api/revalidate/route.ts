import { revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * 상영 데이터가 바뀌었다고 알리는 엔드포인트 — 라즈베리파이 크롤러(crawl:showtimes)가
 * 수집을 마치면 부른다.
 *
 * 상세 페이지는 1시간 주기 ISR이다. 주기만 믿으면 크롤 직후 최대 1시간 옛 시간표가 보이고,
 * 주기를 짧게 잡으면 방문마다 다시 그려 CPU를 쓴다(2026-09 Fluid Active CPU 한도 초과).
 * 그래서 주기는 길게 두고, 데이터가 실제로 바뀐 순간에만 태그를 무효화한다.
 *
 * profile 'max' — 즉시 다시 그리지 않고 "묵음" 표시만 한다. 다음 방문이 옛 캐시를 받으면서
 * 뒤에서 새로 그리므로, 호출 한 번에 수천 페이지가 한꺼번에 재생성되지 않는다.
 */
const SHOWTIME_TAGS = [
  'movie-showtimes',        // getMovieShowtimesCached · getShowtimeById
  'theater-today-titles',   // getTheaterDetail (메타 description)
  'theater-screenings',     // seo/getTheaterScreenings
  'director-screenings',    // seo/getDirectorScreenings
  'screening-index',        // seo/getScreeningIndex
  'area-screenings',        // seo/getAreaScreenings
] as const

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 })
  }

  for (const tag of SHOWTIME_TAGS) revalidateTag(tag, 'max')
  return Response.json({ revalidated: SHOWTIME_TAGS })
}
