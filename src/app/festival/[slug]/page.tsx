import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeUrl } from '@/lib/seo/safeUrl'
import { truncateSnippet } from '@/lib/seo/truncateSnippet'
import { toFestivalSchema } from '@/lib/seo/toFestivalSchema'
import { FestivalSeoContent } from '@/components/seo/FestivalSeoContent'
import { movieRowToMovie } from '@/lib/supabase/movieRow'
import { festivalRowToFestival } from '@/lib/supabase/festivalRow'
import type { FestivalDetail, FestivalScreening } from '@/types/festival'
import { FestivalDetailClient } from './FestivalDetailClient'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

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

// 회차는 본 쿼리에 조인하지 않고 따로 읽는다. festival_screenings는 나중에 추가된 테이블이라
// (docs/SUPABASE_FESTIVAL_SCREENINGS.sql) 마이그레이션 전에 배포되면 조인이 통째로 실패해
// 영화제 상세가 404가 된다. 따로 읽으면 그 경우 회차만 비고 페이지는 그대로 뜬다.
const SCREENING_SELECT = `
  id, screening_date, start_time, runtime_min, festival_theater_id,
  venue_label, screen_label, movie_id, movie_title_snapshot,
  section, screening_code, has_gv, booking_url
`

interface ScreeningRow {
  id: string; screening_date: string; start_time: string; runtime_min: number | null
  festival_theater_id: string | null; venue_label: string; screen_label: string | null
  movie_id: string | null; movie_title_snapshot: string
  section: string | null; screening_code: string | null; has_gv: boolean; booking_url: string | null
}

async function fetchScreenings(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  festivalId: string,
): Promise<FestivalScreening[]> {
  const { data, error } = await supabase
    .from('festival_screenings')
    .select(SCREENING_SELECT)
    .eq('festival_id', festivalId)

  if (error || !data) return []

  return (data as unknown as ScreeningRow[]).map((sc) => ({
    id: sc.id,
    festivalId,
    screeningDate: sc.screening_date,
    startTime: sc.start_time,
    runtimeMin: sc.runtime_min,
    festivalTheaterId: sc.festival_theater_id,
    venueLabel: sc.venue_label,
    screenLabel: sc.screen_label,
    movieId: sc.movie_id,
    movieTitleSnapshot: sc.movie_title_snapshot,
    section: sc.section,
    screeningCode: sc.screening_code,
    hasGv: sc.has_gv,
    bookingUrl: safeUrl(sc.booking_url ?? undefined) ?? null,
  }))
}

async function fetchFestival(slug: string): Promise<FestivalDetail | null> {
  const supabase = createSupabaseServerClient()
  // createSupabaseServerClient()는 anon key라 RLS(is_active=true)가 이미 비활성 영화제를
  // 막아주지만, 쿼리 자체에도 명시해 서버 클라이언트가 나중에 service-role로 바뀌어도
  // (RLS 우회) 조용히 새지 않게 방어한다 — sitemap.ts의 is_active 필터와 같은 원칙.
  const { data } = await supabase
    .from('festivals')
    .select(FESTIVAL_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
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
    ...festivalRowToFestival(row),
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
    // 정렬은 화면에서 날짜·상영관을 고른 뒤에 한다(selectDayScreenings) — 여기선 읽은 순서 그대로
    screenings: await fetchScreenings(supabase, row.id),
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
  const description = truncateSnippet(festival.description, 110)
    ?? `${festival.city}에서 열리는 ${festival.name}. 상영작·상영관 정보`

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

  const festivalSchema = toFestivalSchema(festival, BASE_URL)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(festivalSchema) }}
      />
      <FestivalSeoContent festival={festival} />
      <Suspense>
        <FestivalDetailClient festival={festival} />
      </Suspense>
    </>
  )
}
