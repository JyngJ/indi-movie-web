import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getTheaterDetail, getTheaterTodayMovieTitles } from '@/lib/catalog/getTheaterDetail'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { TheaterDetailClient } from './TheaterDetailClient'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export async function generateStaticParams() {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('theaters').select('id')
  return (data ?? []).map((t) => ({ id: t.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const theater = await getTheaterDetail(id)
  if (!theater) return { title: '영화볼지도' }

  const title = `${theater.name} | 영화볼지도`
  const todayTitles = await getTheaterTodayMovieTitles(theater.id)
  const description = todayTitles.length > 0
    ? `${theater.name}에서 이번 주 상영 중: ${todayTitles.join(', ')}. 시간표와 예매 정보를 지도에서 확인하세요.`
    : `${theater.name} 상영 정보. ${theater.address}`
  const url = `${BASE_URL}/theater/${theater.id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      /* opengraph-image.tsx가 1200×630을 생성하므로 큰 카드로 */
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function TheaterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const theater = await getTheaterDetail(id)
  if (!theater) notFound()

  const schema = toTheaterSchema(theater, BASE_URL)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <TheaterDetailClient theater={theater} />
    </>
  )
}
