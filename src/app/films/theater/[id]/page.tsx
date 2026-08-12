import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTheaterDetail, getTheaterTodayMovieTitles } from '@/lib/catalog/getTheaterDetail'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { FilmsTheaterDetailClient } from './FilmsTheaterDetailClient'
import { ogImageUrl } from '@/lib/og/cards'

// 영화 상세와 동일: ISR 정적 셸 hydration 정지 버그 회피 — 동적 렌더 강제
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const theater = await getTheaterDetail(id)
  if (!theater) return { title: '영화볼지도' }

  const title = `${theater.name} | 영화볼지도`
  const todayTitles = await getTheaterTodayMovieTitles(theater.id)
  const description = todayTitles.length > 0
    ? `${theater.name}에서 이번 주 상영 중: ${todayTitles.join(', ')}. 시간표와 예매 정보를 지도에서 확인하세요.`
    : `${theater.name} 상영 정보. ${theater.address}`
  const url = `${BASE_URL}/films/theater/${id}`
  /* 회차까지 골라서 공유한 링크(?showtime=)면 카드에 그 회차를 싣는다 */
  const showtime = typeof query.showtime === 'string' ? query.showtime : undefined
  const images = [ogImageUrl({ type: 'theater', id, showtime })]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function FilmsTheaterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const theater = await getTheaterDetail(id)
  if (!theater) notFound()

  const schema = toTheaterSchema(theater, BASE_URL)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Suspense>
        <FilmsTheaterDetailClient theater={theater} />
      </Suspense>
    </>
  )
}
