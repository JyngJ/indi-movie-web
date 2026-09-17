import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Toast } from '@/components/primitives'
import { getMovieDetail } from '@/lib/catalog/getMovieDetail'
import { getMovieShowtimesForSsr } from '@/lib/catalog/getMovieShowtimesCached'
import { ogImageUrl } from '@/lib/og/cards'
import { MovieBody } from '../../page'

/** 회차 공유 링크 — /movie/[id]/s/[showtimeId]
 *
 *  예전에는 `/movie/[id]?date=&theater=&showtime=`이었다. 쿼리를 읽으려면 페이지가
 *  요청마다 동적으로 굳어야 해서, 영화 상세 전체가 매 요청 SSR로 돌고 있었다
 *  (Vercel Fluid Active CPU 한도 초과의 주범). 회차를 경로로 올리면 이 화면만
 *  회차별로 캐시되고, 본 상세(/movie/[id])는 정적으로 남는다.
 *
 *  날짜·극장은 회차 id로 찾는다 — 공유 링크에 셋을 다 실을 이유가 없다.
 *  검색 대상은 본 상세 하나여야 하므로 canonical을 그쪽으로 걸고 색인에서 뺀다. */
export const revalidate = 300

async function locate(id: string, showtimeId: string) {
  const showtimes = await getMovieShowtimesForSsr(id)
  for (const entry of showtimes) {
    for (const group of entry.dateGroups) {
      const st = group.showtimes.find((s) => s.id === showtimeId)
      if (st) return { entry, date: group.date, st }
    }
  }
  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; showtimeId: string }>
}): Promise<Metadata> {
  const { id, showtimeId } = await params
  const movie = await getMovieDetail(id)
  if (!movie) notFound()

  const found = await locate(id, showtimeId)
  const canonical = `/movie/${id}`

  /* 회차를 못 찾으면(지난 회차·시간표 갱신으로 사라짐) 영화 이름만으로 돌려준다 —
     카카오·슬랙이 이미 긁어 간 카드가 깨지는 것보다 낫다. */
  const title = found
    ? `${movie.title} · ${found.entry.theaterName} ${found.st.showTime.slice(0, 5)} | 영화볼지도`
    : `${movie.title} 상영시간표·예매 | 영화볼지도`
  const description = found
    // writing-audit-ignore — SEO 메타 문구는 문어체 유지
    ? `${found.date} ${found.st.showTime.slice(0, 5)} ${found.entry.theaterName}. 좌석과 예매 링크를 영화볼지도에서 확인하세요.`
    : `${movie.title}의 상영 시간표와 예매 정보를 영화볼지도에서 확인하세요.`

  const image = ogImageUrl({ type: 'movie', id, showtime: showtimeId })

  return {
    title,
    description,
    openGraph: { title, description, url: `/movie/${id}/s/${showtimeId}`, type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: { canonical },
    robots: { index: false, follow: true },
  }
}

export default async function MovieShowtimeSharePage({
  params,
}: {
  params: Promise<{ id: string; showtimeId: string }>
}) {
  const { id, showtimeId } = await params
  const movie = await getMovieDetail(id)
  if (!movie) notFound()

  const found = await locate(id, showtimeId)
  /* 회차가 사라졌으면 본 상세로 보낸다 — 선택할 수 없는 회차를 띄워 두면 빈 카드만 남는다 */
  if (!found) redirect(`/movie/${id}`)

  return (
    <Suspense fallback={<Toast message="불러오는 중…" visible />}>
      <MovieBody
        id={id}
        movie={movie}
        initialSelection={{ date: found.date, theaterId: found.entry.theaterId, showtimeId }}
      />
    </Suspense>
  )
}
