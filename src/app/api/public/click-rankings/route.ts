// 최근 7일 PostHog 집계 랭킹 — 예매 클릭 / 상세 조회
// CDN 캐시(s-maxage 6h)로 PostHog 쿼리 비용을 흡수한다. cron 불필요.
// 프로덕션에는 POSTHOG_PERSONAL_API_KEY(query:read) / POSTHOG_PROJECT_ID 환경변수 필요.

export const dynamic = 'force-dynamic'

interface HogQLResponse {
  results: [string, number][]
}

async function hogql(query: string): Promise<[string, number][]> {
  const token = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!token || !projectId) return []

  const res = await fetch(`https://app.posthog.com/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
  if (!res.ok) return []
  const data = (await res.json()) as HogQLResponse
  return data.results ?? []
}

/** 최근 7일 '예매하러 가기' 클릭 수 — movie_id별 */
const BOOKING_QUERY = `
  SELECT properties.movie_id AS movie_id, count() AS cnt
  FROM events
  WHERE event = 'booking clicked'
    AND timestamp >= now() - INTERVAL 7 DAY
    AND isNotNull(properties.movie_id)
  GROUP BY movie_id
  ORDER BY cnt DESC
  LIMIT 20
`.trim()

/** 최근 7일 영화 상세 페이지뷰 — /movie/:id + /films/movie/:id */
const VIEWS_QUERY = `
  SELECT replaceRegexpOne(properties.$pathname, '^(/films)?/movie/', '') AS movie_id, count() AS cnt
  FROM events
  WHERE event = '$pageview'
    AND (properties.$pathname LIKE '/movie/%' OR properties.$pathname LIKE '/films/movie/%')
    AND timestamp >= now() - INTERVAL 7 DAY
  GROUP BY movie_id
  ORDER BY cnt DESC
  LIMIT 20
`.trim()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function toRanking(rows: [string, number][]) {
  return rows
    .filter(([id]) => UUID_RE.test(String(id)))
    .map(([movieId, count]) => ({ movieId: String(movieId), count: Number(count) }))
}

export async function GET() {
  const [booking, views] = await Promise.all([hogql(BOOKING_QUERY), hogql(VIEWS_QUERY)])

  return Response.json({
    booking: toRanking(booking),
    views: toRanking(views),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  })
}
