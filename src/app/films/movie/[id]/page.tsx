import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MovieDetail } from '@/lib/supabase/queries'
import { FilmsMovieDetailClient } from './FilmsMovieDetailClient'

export const revalidate = 3600

async function fetchMovie(id: string): Promise<MovieDetail | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('movies')
    .select(`
      id, title, original_title, year, poster_url, genre, director,
      nation, kmdb_id, tmdb_id, rating,
      movie_details (synopsis, runtime_minutes, certification, cast_members)
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const movie = await fetchMovie(id)
  if (!movie) return { title: '영화볼지도' }

  const title = `${movie.title} | 영화볼지도`
  const description = movie.synopsis?.slice(0, 110) ?? `${movie.title} 상영 정보`

  return {
    title,
    description,
    openGraph: {
      title, description,
      ...(movie.posterUrl && { images: [{ url: movie.posterUrl, alt: `${movie.title} 포스터` }] }),
    },
    alternates: { canonical: `/movie/${id}` },
  }
}

export default async function FilmsMovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const movie = await fetchMovie(id)
  if (!movie) notFound()

  return (
    <Suspense>
      <FilmsMovieDetailClient movie={movie} />
    </Suspense>
  )
}
