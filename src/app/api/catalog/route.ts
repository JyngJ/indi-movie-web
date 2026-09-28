import { getCatalog } from '@/lib/catalog/store'
import { SHOWTIME_API_CACHE } from '@/lib/http/cachePolicy'

const CACHE_CONTROL = SHOWTIME_API_CACHE

export async function GET() {
  try {
    return Response.json(await getCatalog(), {
      headers: { 'Cache-Control': CACHE_CONTROL },
    })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'CATALOG_LOAD_ERROR',
          message: error instanceof Error ? error.message : '상영 정보를 불러오지 못했습니다.',
        },
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
