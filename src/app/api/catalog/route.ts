import { getCatalog } from '@/lib/catalog/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(await getCatalog())
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'CATALOG_LOAD_ERROR',
          message: error instanceof Error ? error.message : '상영 정보를 불러오지 못했습니다.',
        },
      },
      { status: 500 },
    )
  }
}
