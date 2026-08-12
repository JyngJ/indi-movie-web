import { Suspense } from 'react'
import type { Metadata } from 'next'
import { FilmsDirectorDetailClient } from './FilmsDirectorDetailClient'
import { DirectorSeoContent } from '@/components/seo/DirectorSeoContent'
import { getDirectorScreenings } from '@/lib/seo/getDirectorScreenings'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { ogImageUrl } from '@/lib/og/cards'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params
  const directorName = decodeURIComponent(name)
  const title = `${directorName} 감독 영화 상영시간표 | 영화볼지도`
  /* 상영 편수를 문장에 넣는다 — 답변형 AI는 구체적 수치가 든 문장을 인용한다 */
  const data = await getDirectorScreenings(directorName)
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
      <DirectorSeoContent directorName={directorName} data={seoData} />
      <Suspense>
        <FilmsDirectorDetailClient directorName={directorName} />
      </Suspense>
    </>
  )
}
