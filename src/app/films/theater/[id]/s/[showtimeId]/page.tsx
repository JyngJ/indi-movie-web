import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Toast } from '@/components/primitives'
import { getTheaterDetail } from '@/lib/catalog/getTheaterDetail'
import { getShowtimeById } from '@/lib/catalog/getShowtimeById'
import { ogImageUrl } from '@/lib/og/cards'
import { TheaterBody } from '../../TheaterBody'

/** 회차 공유 링크 — /films/theater/[id]/s/[showtimeId]
 *  영화 상세의 같은 경로와 한 쌍이다. 쿼리(`?date=&showtime=`)로 회차를 싣던 시절엔
 *  OG 카드를 굽느라 극장 상세 전체가 매 요청 렌더로 굳었다. */
export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; showtimeId: string }>
}): Promise<Metadata> {
  const { id, showtimeId } = await params
  const theater = await getTheaterDetail(id)
  if (!theater) notFound()

  const st = await getShowtimeById(showtimeId)
  const canonical = `/films/theater/${id}`
  const time = st?.time?.slice(0, 5)

  /* 회차를 못 찾으면(지난 회차·시간표 갱신으로 사라짐) 극장 이름만으로 돌려준다 */
  const title = st && st.theaterId === id
    ? `${st.movieTitle} · ${theater.name} ${time} | 영화볼지도`
    : `${theater.name} 상영시간표·예매 | 영화볼지도`
  const description = st && st.theaterId === id
    // writing-audit-ignore — SEO 메타 문구는 문어체 유지
    ? `${st.date} ${time} ${theater.name}에서 ${st.movieTitle}. 좌석과 예매 링크를 영화볼지도에서 확인하세요.`
    // writing-audit-ignore — SEO 메타 문구는 문어체 유지
    : `${theater.name}의 상영 시간표와 예매 정보를 영화볼지도에서 확인하세요.`

  const image = ogImageUrl({ type: 'theater', id, showtime: showtimeId })

  return {
    title,
    description,
    openGraph: { title, description, url: `/films/theater/${id}/s/${showtimeId}`, type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: { canonical },
    robots: { index: false, follow: true },
  }
}

export default async function TheaterShowtimeSharePage({
  params,
}: {
  params: Promise<{ id: string; showtimeId: string }>
}) {
  const { id, showtimeId } = await params
  const theater = await getTheaterDetail(id)
  if (!theater) notFound()

  const st = await getShowtimeById(showtimeId)
  /* 다른 극장의 회차거나 사라진 회차면 극장 상세로 보낸다 */
  if (!st || st.theaterId !== id) redirect(`/films/theater/${id}`)

  return (
    <Suspense fallback={<Toast message="불러오는 중…" visible />}>
      <TheaterBody
        id={id}
        theater={theater}
        initialSelection={{ date: st.date, showtimeId, movieTitle: st.movieTitle }}
      />
    </Suspense>
  )
}
