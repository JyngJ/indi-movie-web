import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Theater } from '@/types/api'
import { Toast } from '@/components/primitives'
import { getTheaterDetail, getTheaterTodayMovieTitles } from '@/lib/catalog/getTheaterDetail'
import { resolveTheaterRegion } from '@/lib/regions'
import { TheaterBody } from './TheaterBody'
import { ogImageUrl } from '@/lib/og/cards'

/* 예전엔 `force-dynamic`이었다 — 직진입 hydration 스톨(#247, HANDOFF 3.9)의 완화책으로
   넣었던 것이다. 그런데 방문마다 서버 렌더가 돌아 Vercel Fluid Active CPU 한도를 넘겼고,
   #359가 붙인 CDN 캐시 헤더도 동적 페이지라 Next가 `no-store`로 덮어써 무력했다.
   2026-09-17 로컬 프로덕션 빌드로 재현을 다시 쟀다 — 직진입 45회(정상 25 + CPU 6배·
   400kbps 스로틀 20회)에서 스톨 0건. 그때 같이 넣은 완화들(htmlLimitedBots로 스트리밍
   메타 차단, localStorage/useSearchParams를 effect로 이동)이 남아 있어 그쪽이 실제
   원인이었을 가능성이 크다. 배포 후 프로덕션에서 같은 프로브로 재확인할 것 —
   되돌리려면 이 주석 자리에 `export const dynamic = 'force-dynamic'`을 되살리면 된다. */
export const revalidate = 300

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
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
  /* 회차까지 골라서 공유한 링크는 /films/theater/[id]/s/[showtimeId]가 맡는다 —
     여기서 쿼리를 읽으면 이 페이지가 다시 매 요청 렌더로 굳는다 */
  const images = [ogImageUrl({ type: 'theater', id })]

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
