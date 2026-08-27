import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMovieDetail } from '@/lib/catalog/getMovieDetail'
import { FilmsMovieDetailClient } from './FilmsMovieDetailClient'
import { ogImageUrl } from '@/lib/og/cards'
import { truncateSnippet } from '@/lib/seo/truncateSnippet'
import { Toast } from '@/components/primitives'

// NOTE: ISR(정적 셸)로 두면 클라이언트 하이드레이션이 멈추는 문제(포스터 로딩 정지·
// 회차 무한 로딩·effects 미실행)가 있어 동적 렌더로 강제. 원인 규명 후 ISR 복원 검토.
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> },
): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const movie = await getMovieDetail(id)
  if (!movie) notFound()

  const title = `${movie.title} | 영화볼지도`
  const description = truncateSnippet(movie.synopsis, 110) ?? `${movie.title} 상영 정보`
  /* 회차까지 골라서 공유한 링크(?showtime=)면 카드에 그 회차를 싣는다 */
  const showtime = typeof query.showtime === 'string' ? query.showtime : undefined
  const images = [ogImageUrl({ type: 'movie', id, showtime })]

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
    alternates: { canonical: `/movie/${id}` },
  }
}

export default async function FilmsMovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  /* loading.tsx를 두면 스트리밍이 200으로 먼저 시작돼 뒤의 notFound()가 상태코드를
     못 바꾼다(삭제된 영화가 '200 + noindex'로 남음). 존재 확인은 Suspense 밖에서. */
  const movie = await getMovieDetail(id)
  if (!movie) notFound()

  return (
    <Suspense fallback={<Toast message="불러오는 중…" visible />}>
      <FilmsMovieDetailClient movie={movie} />
    </Suspense>
  )
}
