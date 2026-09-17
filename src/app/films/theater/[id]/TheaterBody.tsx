import { Suspense } from 'react'
import type { Theater } from '@/types/api'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { getTheaterScreenings } from '@/lib/seo/getTheaterScreenings'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { resolveTheaterRegion } from '@/lib/regions'
import { TheaterSeoContent } from '@/components/seo/TheaterSeoContent'
import { FilmsTheaterDetailClient } from './FilmsTheaterDetailClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

/* 본 상세(page.tsx)와 회차 공유 링크(s/[showtimeId])가 같은 본문을 쓴다.
   페이지 파일은 Next가 정한 export만 허용해서 여기로 뺐다. */
export async function TheaterBody({
  id, theater, initialSelection,
}: {
  id: string
  theater: Theater
  /** 회차 공유 링크(/films/theater/[id]/s/[showtimeId])로 들어온 경우의 초기 선택 */
  initialSelection?: { date: string; showtimeId: string; movieTitle: string }
}) {
  const schema = toTheaterSchema(theater, BASE_URL)
  /* 시간표는 클라이언트가 그려 서버 HTML이 비어 있었다 — 크롤러·답변형 AI가 읽을
     같은 내용을 서버에서 렌더한다 (지역 페이지와 같은 방식) */
  const seoData = await getTheaterScreenings(id)

  /* city가 빈 극장이 9곳 있어 '기타'로 빠졌고, breadcrumb이 REGIONS에 없는
     /films/area/기타(404)를 가리켰다 — 주소 폴백이 있는 리졸버를 쓴다. */
  const region = resolveTheaterRegion(theater.city, theater.address)
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
        // writing-audit-ignore — SEO 메타·스키마 문구는 문어체 유지
        ? `${todayMovies.map((m) => `${m.movieTitle} (${m.times.join(', ')})`).join(', ')}을 상영합니다.`
        : `오늘은 등록된 상영이 없어요. 상영 시간표는 매일 갱신돼요.`,
    },
    {
      question: `${theater.name}은 어디에 있나요?`,
      // writing-audit-ignore — SEO 메타·스키마 문구는 문어체 유지
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
        <FilmsTheaterDetailClient theater={theater} initialSelection={initialSelection} />
      </Suspense>
    </>
  )
}
