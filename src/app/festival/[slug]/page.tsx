import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeUrl } from '@/lib/seo/safeUrl'
import { movieRowToMovie } from '@/lib/supabase/movieRow'
import type { FestivalDetail } from '@/types/festival'
import { FestivalDetailClient } from './FestivalDetailClient'

export const revalidate = 3600

const FESTIVAL_SELECT = `
  id, name, slug, start_date, end_date, region, city, venue_text, banner_url, link_url, description, is_active,
  festival_theaters(
    id, theater_id, venue_text, sort_order,
    theaters(id,name,lat,lng,address,city,phone,website,instagram_url,screen_count,seat_count,parking,restaurant,accessibility,rating,created_at,updated_at)
  ),
  festival_movies(
    id, movie_id, movie_title_snapshot, sort_order,
    movies(id,title,original_title,year,poster_url,genre,director,nation,kmdb_id,tmdb_id,rating)
  ),
  festival_timetables(id, image_url, day_date, label, sort_order)
`

async function fetchFestival(slug: string): Promise<FestivalDetail | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('festivals')
    .select(FESTIVAL_SELECT)
    .eq('slug', slug)
    .single()

  if (!data) return null

  const row = data as unknown as {
    id: string; name: string; slug: string; start_date: string; end_date: string
    region: string; city: string; venue_text: string | null; banner_url: string | null
    link_url: string | null; description: string | null; is_active: boolean
    festival_theaters: {
      id: string; theater_id: string | null; venue_text: string | null; sort_order: number
      theaters: Record<string, unknown> | null
    }[]
    festival_movies: {
      id: string; movie_id: string | null; movie_title_snapshot: string; sort_order: number
      movies: Record<string, unknown> | null
    }[]
    festival_timetables: { id: string; image_url: string; day_date: string | null; label: string | null; sort_order: number }[]
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    startDate: row.start_date,
    endDate: row.end_date,
    region: row.region,
    city: row.city,
    venueText: row.venue_text,
    bannerUrl: row.banner_url,
    linkUrl: safeUrl(row.link_url) ?? null,
    description: row.description,
    isActive: row.is_active,
    theaters: [...row.festival_theaters]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({
        id: t.id,
        festivalId: row.id,
        theaterId: t.theater_id,
        venueText: t.venue_text,
        sortOrder: t.sort_order,
        theater: t.theaters ? {
          id: String(t.theaters.id),
          name: String(t.theaters.name),
          lat: Number(t.theaters.lat),
          lng: Number(t.theaters.lng),
          address: String(t.theaters.address),
          city: String(t.theaters.city),
          phone: t.theaters.phone ? String(t.theaters.phone) : undefined,
          website: safeUrl(t.theaters.website as string | undefined),
          instagramUrl: safeUrl(t.theaters.instagram_url as string | undefined),
          screenCount: t.theaters.screen_count as number | undefined,
          seatCount: t.theaters.seat_count as number | undefined,
          amenities: {
            parking: Boolean(t.theaters.parking),
            restaurant: Boolean(t.theaters.restaurant),
            accessibility: Boolean(t.theaters.accessibility),
          },
          rating: t.theaters.rating as number | undefined,
          createdAt: String(t.theaters.created_at),
          updatedAt: String(t.theaters.updated_at),
        } : null,
      })),
    movies: [...row.festival_movies]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({
        id: m.id,
        festivalId: row.id,
        movieId: m.movie_id,
        movie: m.movies ? movieRowToMovie(m.movies) : null,
        movieTitleSnapshot: m.movie_title_snapshot,
        sortOrder: m.sort_order,
      })),
    timetables: [...row.festival_timetables]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tt) => ({
        id: tt.id,
        festivalId: row.id,
        imageUrl: tt.image_url,
        dayDate: tt.day_date,
        label: tt.label,
        sortOrder: tt.sort_order,
      })),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const festival = await fetchFestival(slug)
  if (!festival) return { title: '영화볼지도' }

  const title = `${festival.name} | 영화볼지도`
  const description = festival.description
    ? festival.description.slice(0, 110)
    : `${festival.city}에서 열리는 ${festival.name}. 상영작·상영관 정보`

  return {
    title,
    description,
    alternates: { canonical: `/festival/${slug}` },
    openGraph: festival.bannerUrl
      ? { title, description, url: `/festival/${slug}`, images: [{ url: festival.bannerUrl }] }
      : { title, description, url: `/festival/${slug}` },
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

  return (
    <Suspense>
      <FestivalDetailClient festival={festival} />
    </Suspense>
  )
}
