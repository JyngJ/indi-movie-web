import type { Movie } from '@/types/api'

export function toMovieSchema(movie: Movie, baseUrl: string) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    url: `${baseUrl}/movie/${movie.id}`,
  }

  if (movie.originalTitle) schema.alternateName = movie.originalTitle
  if (movie.year) schema.datePublished = String(movie.year)
  if (movie.synopsis) schema.description = movie.synopsis
  if (movie.posterUrl) schema.image = movie.posterUrl

  if (movie.runtimeMinutes) {
    schema.duration = `PT${movie.runtimeMinutes}M`
  }

  if (movie.director.length > 0) {
    schema.director = movie.director.map((name) => ({
      '@type': 'Person',
      name,
    }))
  }

  if (movie.genre.length > 0) {
    schema.genre = movie.genre
  }

  if (movie.nation) {
    schema.countryOfOrigin = {
      '@type': 'Country',
      name: movie.nation,
    }
  }

  return schema
}
