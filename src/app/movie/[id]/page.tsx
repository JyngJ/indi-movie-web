import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Toast } from '@/components/primitives'
import { notFound } from 'next/navigation'
import { getMovieDetail } from '@/lib/catalog/getMovieDetail'
import { toMovieDescription } from '@/lib/seo/toMovieDescription'
import { getMovieShowtimesForSsr } from '@/lib/catalog/getMovieShowtimesCached'
import { MovieBody } from './MovieBody'
import { ogImageUrl } from '@/lib/og/cards'

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
