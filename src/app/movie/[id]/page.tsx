import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { MovieDetail } from '@/types/api'
import { Toast } from '@/components/primitives'
import { notFound } from 'next/navigation'
import { getMovieDetail } from '@/lib/catalog/getMovieDetail'
import { toMovieSchema } from '@/lib/seo/toMovieSchema'
import { toScreeningEventSchema } from '@/lib/seo/toScreeningEventSchema'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { toMovieDescription } from '@/lib/seo/toMovieDescription'
import { getMovieShowtimesForSsr } from '@/lib/catalog/getMovieShowtimesCached'
import { SeoShowtimesSection } from '@/components/seo/SeoShowtimesSection'
import { MovieDetailClient } from './MovieDetailClient'
import { ogImageUrl } from '@/lib/og/cards'
import type { MovieTheaterEntry } from '@/lib/supabase/queries'

/* 매 요청 SSR이던 화면이다(force-dynamic). 검색 유입 1위 경로라 요청 수 × 렌더가
   그대로 Vercel Fluid Active CPU로 나갔다 — 2026-09 무료 한도(4h)를 넘겼다.
   DB는 이미 캐시 뒤에 있어서(getMovieDetail·getMovieShowtimesForSsr) 요청마다 드는 건
   렌더 비용뿐이었다. 그래서 ISR로 돌린다.
   주기는 next.config의 CDN 캐시(s-maxage=300)와 맞춘다 — 두 값이 어긋나면 어느 쪽이 신선도를 정하는지 알기 어려워진다.
   회차별 OG 카드가 필요한 공유 링크는 /movie/[id]/s/[showtimeId]가 맡는다(쿼리를 읽지
   않아야 이 페이지가 정적으로 남는다). */
export const revalidate = 300

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const movie = await getMovieDetail(id)

  if (!movie) notFound()

  /* 검색 유입의 대다수가 "영화제목 정보 / 상영시간표 / 예매" 질의인데(Search Console),
     제목이 "제목 | 영화볼지도"뿐이라 노출 대비 CTR이 바닥이었다(고노출 제목 페이지 0.4%대).
     제목·설명에 검색 의도 단어(상영시간표·예매·상영관 수)를 실어 스니펫을 질의에 맞춘다.
     상영 정보는 캐시된 래퍼라 본문 렌더와 쿼리를 공유한다(중복 조회 없음). */
  const showtimes = await getMovieShowtimesForSsr(id)
  const theaterNames = [...new Set(showtimes.map((t) => t.theaterName))]

  const title = `${movie.title} 상영시간표·예매 | 영화볼지도`
  /* 설명은 감독·연도·국가·장르로 먼저 편을 특정한다 — 시놉시스가 없는 11%가
     예전엔 서로 똑같은 문장이 돼 네이버 "동일 설명문" 진단에 걸렸다. */
  const description = toMovieDescription({
    title: movie.title,
    year: movie.year,
    director: movie.director,
    nation: movie.nation,
    genre: movie.genre,
    runtimeMinutes: movie.runtimeMinutes,
    synopsis: movie.synopsis,
    theaterNames,
  })
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
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const movie = await getMovieDetail(id)
  /* 삭제된 영화 id로 들어오면 지금까지 빈 상세 페이지를 200으로 돌려줬다
     (Search Console soft 404). 존재하지 않으면 명시적으로 없는 페이지로 처리한다.
     loading.tsx를 두면 스트리밍이 200으로 먼저 시작돼 이 notFound()가 상태코드를
     못 바꾸므로, 존재 확인은 Suspense 밖에서 끝내고 시간표 조회만 안에서 기다린다. */
  if (!movie) notFound()

  return (
    <Suspense fallback={<Toast message="불러오는 중…" visible />}>
      {/* ?theater= 유입 경로 기록과 뒤로가기 목적지는 클라이언트가 주소에서 직접 읽는다 —
          서버가 쿼리를 읽는 순간 이 페이지가 다시 동적으로 굳는다 */}
      <MovieBody id={id} movie={movie} />
    </Suspense>
  )
}

export async function MovieBody({
  id, movie, initialSelection,
}: {
  id: string
  movie: MovieDetail
  /** 회차 공유 링크(/movie/[id]/s/[showtimeId])로 들어온 경우의 초기 선택 */
  initialSelection?: { date: string; theaterId: string; showtimeId: string }
}) {
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
        // writing-audit-ignore — SEO 메타·스키마 문구는 문어체 유지
        ? `전국 독립·예술영화관 ${theaterNames.length}곳에서 상영 중입니다: ${theaterNames.slice(0, 15).join(', ')}${theaterNames.length > 15 ? ' 등' : ''}. 극장별 상영 시간과 예매 링크는 영화볼지도에서 확인할 수 있습니다.`
        : `지금은 전국 독립·예술영화관에 예정된 상영 일정이 없어요. 상영 시간표는 매일 갱신되니 새 상영이 열리면 여기서 확인할 수 있어요.`,
    },
    {
      question: `${movie.title}의 가장 빠른 상영은 언제인가요?`,
      answer: nearestDate
        // writing-audit-ignore — SEO 메타·스키마 문구는 문어체 유지
        ? `${nearestDate}에 상영이 있습니다. 회차별 시간은 영화볼지도의 극장 페이지에서 확인하세요.`
        : `예정된 상영이 없어요`,
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
        movie={movie}
        initialShowtimes={showtimes}
        initialSelection={initialSelection}
      />
      <SeoShowtimesSection movieTitle={movie.title} entries={showtimes} />
    </>
  )
}
