import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Theater } from '@/types/api'
import { Toast } from '@/components/primitives'
import { getTheaterDetail, getTheaterTodayMovieTitles } from '@/lib/catalog/getTheaterDetail'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { getTheaterScreenings } from '@/lib/seo/getTheaterScreenings'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { toBreadcrumbSchema } from '@/lib/seo/toBreadcrumbSchema'
import { resolveTheaterRegion } from '@/lib/regions'
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
  if (!theater) notFound()

  /* 제목이 "극장명 | 영화볼지도"뿐이라 검색 의도어("상영시간표"·"예매")가 하나도
     없었다 — 영화 상세에 이미 적용한 것과 같은 처리(#301). 지역명은 "전남 독립영화관"
     같은 질의를 받는 키워드라 함께 싣되, 매핑에 없는 도시('기타')면 뺀다. */
  const region = resolveTheaterRegion(theater.city, theater.address)
  const regionLabel = region === '기타' ? null : region
  const title = regionLabel
    ? `${theater.name} 상영시간표·예매 — ${regionLabel} 독립영화관 | 영화볼지도`
    : `${theater.name} 상영시간표·예매 | 영화볼지도`

  /* 상영이 없는 극장은 설명이 "극장명 상영 정보. 주소"(약 25자)뿐이라 스니펫이
     비어 보였다(Bing 웹마스터 'Meta descriptions too short' 7건). 두 갈래 모두
     페이지에 실제로 있는 정보(회차·예매 링크·위치·갱신 주기)로 채운다. */
  const todayTitles = await getTheaterTodayMovieTitles(theater.id)
  const where = regionLabel ? `${regionLabel} 독립·예술영화관` : '독립·예술영화관'
  const description = todayTitles.length > 0
    // writing-audit-ignore — SEO 메타·스키마 문구는 문어체 유지
    ? `${theater.name}(${where}) 이번 주 상영작: ${todayTitles.join(', ')}. 회차별 상영 시간과 예매 링크, 극장 위치·길찾기를 영화볼지도에서 확인하세요. 시간표는 매일 갱신됩니다.`
    // writing-audit-ignore — SEO 메타·스키마 문구는 문어체 유지
    : `${theater.name}(${where}) 상영시간표와 극장 정보. 주소는 ${theater.address}입니다. 지금은 등록된 상영이 없지만 영화볼지도는 전국 독립영화관 시간표를 매일 갱신하므로, 새 상영이 열리면 회차와 예매 링크를 바로 확인할 수 있습니다.`
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
  /* loading.tsx를 두면 스트리밍이 200으로 먼저 시작돼 뒤의 notFound()가 상태코드를
     못 바꾼다 — 죽은 극장이 '200 + noindex'로 남아 크롤러가 계속 재수집했다.
     존재 확인은 Suspense 밖에서 끝내고(진짜 404), 느린 시간표 조회만 안에서 기다린다. */
  const theater = await getTheaterDetail(id)
  if (!theater) notFound()

  return (
    <Suspense fallback={<Toast message="불러오는 중…" visible />}>
      <TheaterBody id={id} theater={theater} />
    </Suspense>
  )
}

async function TheaterBody({ id, theater }: { id: string; theater: Theater }) {
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
        <FilmsTheaterDetailClient theater={theater} />
      </Suspense>
    </>
  )
}
