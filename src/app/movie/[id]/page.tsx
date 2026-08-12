import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getMovieDetail } from '@/lib/catalog/getMovieDetail'
import { toMovieSchema } from '@/lib/seo/toMovieSchema'
import { toScreeningEventSchema } from '@/lib/seo/toScreeningEventSchema'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { getMovieShowtimesForSsr } from '@/lib/catalog/getMovieShowtimesCached'
import { MovieDetailClient } from './MovieDetailClient'
import { ogImageUrl } from '@/lib/og/cards'
import type { MovieTheaterEntry } from '@/lib/supabase/queries'

// 주의: 아래 페이지 컴포넌트가 searchParams(?theater=)를 읽기 때문에 이 라우트는
// 실제로는 ISR이 아니라 동적 렌더다(빌드 라우트 표에 ƒ로 찍힌다) — 이 값은 현재
// 무시된다. searchParams 의존을 걷어내야 비로소 정적 셸+CDN 캐시가 붙는다.
export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export async function generateStaticParams() {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('movies').select('id')
  return (data ?? []).map((m) => ({ id: m.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const movie = await getMovieDetail(id)

  if (!movie) return { title: '영화볼지도' }

  const title = `${movie.title} | 영화볼지도`
  const description = movie.synopsis?.slice(0, 110) ?? `${movie.title} 상영 정보`
  const url = `/movie/${id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [ogImageUrl({ type: 'movie', id })],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl({ type: 'movie', id })],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ theater?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const movie = await getMovieDetail(id)
  /* 삭제된 영화 id로 들어오면 지금까지 빈 상세 페이지를 200으로 돌려줬다
     (Search Console soft 404). 존재하지 않으면 명시적으로 없는 페이지로 처리한다. */
  if (!movie) notFound()

  const showtimes: MovieTheaterEntry[] = await getMovieShowtimesForSsr(id)

  const schema = toMovieSchema(movie, BASE_URL)
  const screeningEventSchemas = toScreeningEventSchema(movie, showtimes, BASE_URL)

  /* "○○ 어디서 봐요?"가 영화 페이지로 오는 가장 흔한 질의 — 그 문답을 스키마로도 낸다.
     본문(클라이언트 렌더 + ScreeningEvent 스키마)에 실제로 있는 정보만 담는다. */
  const theaterNames = [...new Set(showtimes.map((t) => t.theaterName))]
  const nearestDate = showtimes
    .flatMap((t) => t.dateGroups.map((g) => g.date))
    .sort()[0]
  const faqSchema = toFaqSchema([
    {
      question: `${movie.title}는 어디서 볼 수 있나요?`,
      answer: theaterNames.length > 0
        ? `전국 독립·예술영화관 ${theaterNames.length}곳에서 상영 중입니다: ${theaterNames.slice(0, 15).join(', ')}${theaterNames.length > 15 ? ' 등' : ''}. 극장별 상영 시간과 예매 링크는 영화볼지도에서 확인할 수 있습니다.`
        : `현재 전국 독립·예술영화관에 잡힌 상영 일정이 없습니다. 영화볼지도는 상영 시간표를 매일 갱신하므로 새 상영이 열리면 확인할 수 있습니다.`,
    },
    {
      question: `${movie.title}의 가장 빠른 상영은 언제인가요?`,
      answer: nearestDate
        ? `${nearestDate}에 상영이 있습니다. 회차별 시간은 영화볼지도의 극장 페이지에서 확인하세요.`
        : `예정된 상영이 없습니다.`,
    },
  ])
  const breadcrumbSchema = toBreadcrumbSchema([
    { name: '영화볼지도', path: '/' },
    { name: movie.title },
  ], BASE_URL)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {screeningEventSchemas.map((eventSchema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <MovieDetailClient
        movieId={id}
        theaterId={sp.theater}
        initialData={movie}
        initialShowtimes={showtimes}
      />
    </>
  )
}
