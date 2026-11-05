import { RECOMMENDATION_MODEL } from '@/lib/recommendation/config'
import { loadNeighbors } from '@/lib/recommendation/neighborRepository'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const MAX_IDS = 20

/** 영화 id 목록의 추천 이웃. 영화끼리의 점수만 돌려준다 — 누가 봤는지는 담지 않는다. */
export async function GET(request: Request) {
  const ids = [...new Set((new URL(request.url).searchParams.get('ids') ?? '').split(',').filter(id => UUID.test(id)))].slice(0, MAX_IDS)
  if (!ids.length) return Response.json({})
  try {
    const table = await loadNeighbors(RECOMMENDATION_MODEL.version, ids)
    return Response.json(Object.fromEntries(table), {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return Response.json({ error: 'neighbors unavailable' }, { status: 500 })
  }
}
