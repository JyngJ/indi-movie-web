import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeUrl } from '@/lib/seo/safeUrl'
import type { Theater } from '@/types/api'
import { FilmsTheaterDetailClient } from './FilmsTheaterDetailClient'

export const revalidate = 3600

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const theater = await fetchTheater(id)
  if (!theater) return { title: '영화볼지도' }

  const title = `${theater.name} | 영화볼지도`
  const description = `${theater.name} 상영 영화 및 시간표. ${theater.address}`

  return {
    title,
    description,
    alternates: { canonical: `/theater/${id}` },
  }
}

export default async function FilmsTheaterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const theater = await fetchTheater(id)
  if (!theater) notFound()

  return (
    <Suspense>
      <FilmsTheaterDetailClient theater={theater} />
    </Suspense>
  )
}
