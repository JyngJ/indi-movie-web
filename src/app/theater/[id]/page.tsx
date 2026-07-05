import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { safeUrl } from '@/lib/seo/safeUrl'
import { formatLocalDate } from '@/lib/date'
import type { Theater } from '@/types/api'
import { TheaterDetailClient } from './TheaterDetailClient'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

/** 오늘 상영 중인 영화 제목 최대 3개 — 메타 description용 */
async function fetchTodayMovieTitles(theaterId: string): Promise<string[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('showtimes')
    .select('movie_id, movies(title)')
    .eq('theater_id', theaterId)
    .eq('is_active', true)
    .eq('show_date', formatLocalDate(new Date()))
    .order('show_time', { ascending: true })
    .limit(20)

  const titles: string[] = []
  for (const row of data ?? []) {
    const movie = row.movies as unknown as { title?: string } | null
    if (movie?.title && !titles.includes(movie.title)) titles.push(movie.title)
    if (titles.length >= 3) break
  }
  return titles
}

async function fetchTheater(id: string): Promise<Theater | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('theaters')
    .select('id,name,lat,lng,address,city,phone,website,instagram_url,screen_count,seat_count,parking,restaurant,accessibility,rating,created_at,updated_at')
    .eq('id', id)
    .single()

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    lat: Number(data.lat),
    lng: Number(data.lng),
    address: data.address,
    city: data.city,
    phone: data.phone ?? undefined,
    website: safeUrl(data.website),
    instagramUrl: safeUrl(data.instagram_url),
    screenCount: data.screen_count,
    seatCount: data.seat_count ?? undefined,
    amenities: {
      parking: data.parking,
      restaurant: data.restaurant,
      accessibility: data.accessibility,
    },
    rating: data.rating ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

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
  const theater = await fetchTheater(id)
  if (!theater) return { title: '영화볼지도' }

  const title = `${theater.name} | 영화볼지도`
  const todayTitles = await fetchTodayMovieTitles(theater.id)
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
      card: 'summary',
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
  const theater = await fetchTheater(id)
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
