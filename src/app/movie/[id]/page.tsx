import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MovieDetailClient } from './MovieDetailClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('movies')
    .select('title, original_title, poster_url, movie_details(synopsis)')
    .eq('id', id)
    .single()

  if (!data) return { title: '영화볼지도' }

  const title = `${data.title} | 영화볼지도`
  const details = data.movie_details as { synopsis?: string } | null
  const description = details?.synopsis?.slice(0, 110) ?? `${data.title} 상영 정보`
  const url = `/movie/${id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      ...(data.poster_url && { images: [{ url: data.poster_url }] }),
    },
    twitter: {
      card: data.poster_url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(data.poster_url && { images: [data.poster_url] }),
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
  return <MovieDetailClient movieId={id} theaterId={sp.theater} />
}
