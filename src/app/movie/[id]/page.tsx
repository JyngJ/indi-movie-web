import { MovieDetailClient } from './MovieDetailClient'

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <MovieDetailClient movieId={id} />
}
