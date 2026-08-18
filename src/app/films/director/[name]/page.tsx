import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { FilmsDirectorDetailClient } from './FilmsDirectorDetailClient'
import { DirectorSeoContent } from '@/components/seo/DirectorSeoContent'
import { getDirectorScreenings } from '@/lib/seo/getDirectorScreenings'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { ogImageUrl } from '@/lib/og/cards'
import { Toast } from '@/components/primitives'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params
  const directorName = decodeURIComponent(name)
  const title = `${directorName} 감독 영화 상영시간표 | 영화볼지도`
  /* 상영 편수를 문장에 넣는다 — 답변형 AI는 구체적 수치가 든 문장을 인용한다 */
  const data = await getDirectorScreenings(directorName)
  if (data.films.length === 0) notFound()
  const nowShowing = new Set(data.screenings.map((s) => s.movieId)).size
  const description = nowShowing > 0
    ? `${directorName} 감독 작품 ${data.films.length}편 중 ${nowShowing}편이 전국 독립·예술영화관에서 상영 중입니다. 극장별 상영 시간과 예매 정보를 확인하세요.`
    : `${directorName} 감독 작품 ${data.films.length}편과 전국 독립·예술영화관 상영 정보. 새 상영이 열리면 영화볼지도에서 확인하세요.`
  const images = [ogImageUrl({ type: 'director', name: directorName })]
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
    alternates: { canonical: `/films/director/${name}` },
  }
}

export default async function FilmsDirectorDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const directorName = decodeURIComponent(name)
  /* 목록·상영정보는 클라이언트가 그리지만, 그 결과가 서버 HTML엔 남지 않는다.
     크롤러와 답변형 AI가 읽을 같은 내용을 서버에서 한 번 더 렌더한다. */
  const seoData = await getDirectorScreenings(directorName)
  /* 감독명은 URL에서 그대로 오므로 아무 문자열이나 페이지가 생긴다.
     작품이 하나도 없으면 존재하지 않는 감독이다 — 빈 페이지를 색인 대상으로
     남기면 임의 문자열마다 thin page가 무한히 생성된다.
     loading.tsx는 두지 않는다 — 있으면 스트리밍이 200으로 먼저 시작돼 이 notFound()가
     상태코드를 못 바꾸고 '200 + noindex'로 남는다. */
  if (seoData.films.length === 0) notFound()

  const breadcrumbSchema = toBreadcrumbSchema([
    { name: '영화볼지도', path: '/' },
    { name: `${directorName} 감독` },
  ], BASE_URL)

  const nowShowing = [...new Map(seoData.screenings.map((s) => [s.movieId, s])).values()]
  const theaterNames = [...new Set(seoData.screenings.map((s) => s.theaterName))]
  /* 본문(DirectorSeoContent)에 실제로 있는 문답만 스키마로도 낸다 */
  const faqSchema = toFaqSchema([
    {
      question: `${directorName} 감독 영화는 어디서 볼 수 있나요?`,
      answer: nowShowing.length > 0
        ? `${theaterNames.join(', ')}에서 상영합니다. 각 극장의 상영 시간과 예매 링크는 영화볼지도 극장 페이지에서 확인할 수 있습니다.`
        : `현재 전국 독립·예술영화관에 잡힌 ${directorName} 감독 작품의 상영 일정은 없습니다. 영화볼지도는 상영 시간표를 매일 갱신하므로 새 상영이 열리면 확인할 수 있습니다.`,
    },
    {
      question: `${directorName} 감독의 작품은 몇 편인가요?`,
      answer: `영화볼지도에 등록된 ${directorName} 감독의 작품은 ${seoData.films.length}편입니다.`,
    },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <DirectorSeoContent directorName={directorName} data={seoData} />
      <Suspense fallback={<Toast message="데이터 불러오는 중…" visible />}>
        <FilmsDirectorDetailClient directorName={directorName} />
      </Suspense>
    </>
  )
}
