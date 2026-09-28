import { getMovieDetail } from '@/lib/catalog/getMovieDetail'
import { SHOWTIME_API_CACHE } from '@/lib/http/cachePolicy'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const movie = await getMovieDetail(id)

  if (!movie) return Response.json(null, { status: 404 })

  return Response.json(movie, {
    headers: {
      'Cache-Control': SHOWTIME_API_CACHE,
    },
  })
}
