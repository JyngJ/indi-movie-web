import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { toFestivalSchema } from '@/lib/seo/toFestivalSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { festivalMetaDescription, festivalSeoTitle } from '@/lib/seo/festivalSeo'
import { FestivalSeoContent } from '@/components/seo/FestivalSeoContent'
import { FestivalDetailClient } from './FestivalDetailClient'
import { fetchFestival } from './fetchFestival'

export const revalidate = 3600

/* 동적 경로는 generateStaticParams가 없으면 revalidate를 걸어도 요청마다 렌더된다(Next 16).
   2026-10 운영 응답이 `private, no-store` + MISS였다 — ISR이 한 번도 안 걸려 있었다.
   빈 배열은 "빌드 때는 안 그리고 첫 방문에 그려 캐시"라는 뜻이다(1h 주기·크롤 후 태그 무효화).
   한글이 들어가는 경로(감독·지역)에는 쓰지 말 것 — 캐시 태그 헤더에 raw 한글이 실려 500이 난다
   (films/area/[region]/page.tsx 주석). */
export function generateStaticParams() {
  return []
}

// 구조화 데이터 주소 — canonical·sitemap과 같은 푸니코드로(한글 도메인은 JSON-LD에서 모양이 갈린다)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const festival = await fetchFestival(slug)
  if (!festival) return { title: '영화볼지도' }

  // 검색 의도("부산국제영화제 시간표")에 맞춰 제목에 상영 시간표·극장 수를, 설명에 기간·회차를 싣는다
  const title = `${festivalSeoTitle(festival)} | 영화볼지도`
  const description = festivalMetaDescription(festival)

  // 공유 이미지는 가로 배너가 우선 — 없으면 세로 포스터. 루트 경로는 metadataBase가 절대 주소로 바꾼다
  const ogImage = festival.bannerUrl ?? festival.posterUrl
  return {
    title,
    description,
    alternates: { canonical: `/festival/${slug}` },
    openGraph: ogImage
      ? { title, description, url: `/festival/${slug}`, images: [{ url: ogImage }] }
      : { title, description, url: `/festival/${slug}` },
    // 루트 레이아웃의 기본 트위터 카드 이미지가 남지 않게 페이지 이미지로 덮는다
    twitter: ogImage ? { title, description, images: [ogImage] } : { title, description },
  }
}

export default async function FestivalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const festival = await fetchFestival(slug)
  if (!festival) notFound()

  const festivalSchema = toFestivalSchema(festival, BASE_URL)
  // 화면 브레드크럼(영화제 › 이름)과 같은 경로 — 영화제는 상영작 탭에 모여 있다
  const breadcrumbSchema = toBreadcrumbSchema(
    [{ name: '영화볼지도', path: '/' }, { name: '영화제', path: '/films' }, { name: festival.name }],
    BASE_URL,
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(festivalSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FestivalSeoContent festival={festival} />
      <Suspense>
        <FestivalDetailClient festival={festival} />
      </Suspense>
    </>
  )
}
