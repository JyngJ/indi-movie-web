import type { MovieDetail } from '@/types/api'
import type { MovieTheaterEntry } from '@/lib/supabase/queries'
import { toMovieSchema } from '@/lib/seo/toMovieSchema'
import { toScreeningEventSchema } from '@/lib/seo/toScreeningEventSchema'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { getMovieShowtimesForSsr } from '@/lib/catalog/getMovieShowtimesCached'
import { SeoShowtimesSection } from '@/components/seo/SeoShowtimesSection'
import { MovieDetailClient } from './MovieDetailClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

/* 본 상세(page.tsx)와 회차 공유 링크(s/[showtimeId])가 같은 본문을 쓴다.
   페이지 파일은 Next가 정한 export만 허용해서 여기로 뺐다. */
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
