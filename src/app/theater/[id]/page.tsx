import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toTheaterSchema } from '@/lib/seo/toTheaterSchema'
import { safeUrl } from '@/lib/seo/safeUrl'
import type { Theater } from '@/types/api'
import { TheaterDetailClient } from './TheaterDetailClient'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

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
  const description = `${theater.name} 상영 정보. ${theater.address}`
  const url = `/theater/${theater.id}`

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
