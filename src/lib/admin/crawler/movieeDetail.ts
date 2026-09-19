import { extractListingHints, type ListingHints, type MovieeMovieRef } from '../matchReviewHints'
import { crawlerHeaders, fetchJson } from './utils'

/**
 * 무비이 영화 상세(러닝타임·장르·감독) — 동명 영화 검수 알림에서만 호출한다.
 * 회차 목록 API에는 이 필드가 없고, 크롤 때마다 영화별로 부르면 요청 수가 늘어 알림 시점으로 미룬다.
 * 필름포럼 등은 DIRECTOR를 비워 두는 경우가 많다.
 */
export async function fetchMovieeMovieHints(ref: MovieeMovieRef): Promise<ListingHints> {
  const params = new URLSearchParams({ tId: ref.tid, mId: ref.mId, gId: ref.gId ?? '' })
  const data = await fetchJson<{ ResData?: { Table?: Record<string, unknown>[] } }>(
    `${ref.origin}/api/TicketApi/GetMovieDatilInfo?${params}`,
    crawlerHeaders({
      accept: 'application/json, text/javascript, */*; q=0.01',
      'x-requested-with': 'XMLHttpRequest',
      referer: `${ref.origin}/Movie/Ticket?tid=${encodeURIComponent(ref.tid)}`,
    }),
  )
  return extractListingHints(data.ResData?.Table?.[0])
}
