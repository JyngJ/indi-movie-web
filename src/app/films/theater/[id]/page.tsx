import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTheaterDetail, getTheaterTodayMovieTitles } from '@/lib/catalog/getTheaterDetail'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { getTheaterScreenings } from '@/lib/seo/getTheaterScreenings'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { getRegionFromCity } from '@/lib/regions'
import { TheaterSeoContent } from '@/components/seo/TheaterSeoContent'
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
  /* 시간표는 클라이언트가 그려 서버 HTML이 비어 있었다 — 크롤러·답변형 AI가 읽을
     같은 내용을 서버에서 렌더한다 (지역 페이지와 같은 방식) */
  const seoData = await getTheaterScreenings(id)

  const region = getRegionFromCity(theater.city ?? '')
  const breadcrumbSchema = toBreadcrumbSchema([
    { name: '영화볼지도', path: '/' },
    { name: `${region} 독립영화관`, path: `/films/area/${encodeURIComponent(region)}` },
    { name: theater.name },
  ], BASE_URL)

  const todayMovies = seoData.days.find((d) => d.date === seoData.date)?.movies ?? []
  /* 본문(TheaterSeoContent)에 실제로 있는 문답만 스키마로도 낸다 */
  const faqSchema = toFaqSchema([
    {
      question: `${theater.name}에서 오늘 무슨 영화를 상영하나요?`,
      answer: todayMovies.length > 0
        ? `${todayMovies.map((m) => `${m.movieTitle} (${m.times.join(', ')})`).join(', ')}을 상영합니다.`
        : `오늘은 등록된 상영이 없습니다. 영화볼지도는 상영 시간표를 매일 갱신합니다.`,
    },
    {
      question: `${theater.name}은 어디에 있나요?`,
      answer: `${theater.address}에 있습니다.`,
    },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <TheaterSeoContent theater={theater} data={seoData} />
      <Suspense>
        <FilmsTheaterDetailClient theater={theater} />
      </Suspense>
    </>
  )
}
