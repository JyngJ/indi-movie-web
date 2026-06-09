import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toMovieSchema } from '@/lib/seo/toMovieSchema'
import { MovieDetailClient } from './MovieDetailClient'
import type { MovieDetail } from '@/lib/supabase/queries'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

async function fetchMovieFull(id: string): Promise<MovieDetail | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('movies')
    .select(`
      id, title, original_title, year, poster_url, genre, director,
      nation, kmdb_id, tmdb_id, rating,
      movie_details (
        synopsis,
        runtime_minutes,
        certification,
        cast_members
      )
    `)
    .eq('id', id)
    .single()

  if (!data) return null

  const row = data as Record<string, unknown>
  const details = row.movie_details as Record<string, unknown> | null

  return {
    id: String(row.id),
    title: String(row.title),
    originalTitle: row.original_title ? String(row.original_title) : undefined,
    year: Number(row.year),
    posterUrl: row.poster_url ? String(row.poster_url) : undefined,
    genre: (row.genre as string[] | null) ?? [],
    director: (row.director as string[] | null) ?? [],
    nation: row.nation ? String(row.nation) : undefined,
    kmdbId: row.kmdb_id ? String(row.kmdb_id) : undefined,
    tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
    rating: row.rating ? Number(row.rating) : undefined,
    synopsis: details?.synopsis ? String(details.synopsis) : undefined,
    runtimeMinutes: details?.runtime_minutes ? Number(details.runtime_minutes) : undefined,
    certification: details?.certification ? String(details.certification) : undefined,
    cast: (details?.cast_members as MovieDetail['cast'] | null) ?? [],
  }
}

export async function generateStaticParams() {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('movies').select('id')
  return (data ?? []).map((m) => ({ id: m.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const movie = await fetchMovieFull(id)

  if (!movie) return { title: '영화볼지도' }

  const title = `${movie.title} | 영화볼지도`
  const description = movie.synopsis?.slice(0, 110) ?? `${movie.title} 상영 정보`
  const url = `/movie/${id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      ...(movie.posterUrl && {
        images: [{ url: movie.posterUrl, alt: `${movie.title} 포스터` }],
      }),
    },
    twitter: {
      card: movie.posterUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(movie.posterUrl && { images: [movie.posterUrl] }),
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ theater?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const movie = await fetchMovieFull(id)

  const schema = movie ? toMovieSchema(movie, BASE_URL) : null

  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <MovieDetailClient movieId={id} theaterId={sp.theater} initialData={movie ?? undefined} />
    </>
  )
}
