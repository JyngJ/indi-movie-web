import { MovieDetailClient } from './MovieDetailClient'

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
