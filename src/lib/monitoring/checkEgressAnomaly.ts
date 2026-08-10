const SUPABASE_PROJECT_REF = 'pkmgloiixwvhitqpcfyc'
const MANAGEMENT_API_BASE = 'https://api.supabase.com/v1'

/** 정상 트래픽 기준 넉넉히 잡은 상한 — 2026-08-09 스파이크(movies 5만건/일)를 훨씬 밑도는 값 */
const PATH_REQUEST_THRESHOLD = 5000

interface PathCount {
  path: string
  method: string
  cnt: number
}

/** SQL 리터럴로 안전하게 파싱되는 형식('YYYY-MM-DD HH:MM:SS+00')으로 변환 */
function toSqlTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace('T', ' ')}+00`
}

/** 최근 `windowHours` 시간 동안 REST 경로별 요청 수를 집계한다. */
async function fetchPathCounts(accessToken: string, windowHours: number): Promise<PathCount[]> {
  const end = new Date()
  const start = new Date(end.getTime() - windowHours * 60 * 60 * 1000)
  const startSql = toSqlTimestamp(start)
  const endSql = toSqlTimestamp(end)

  const sql = `select r.path as path, r.method as method, count(*) as cnt
from edge_logs
cross join unnest(metadata) as m
cross join unnest(m.request) as r
where timestamp >= timestamp '${startSql}' and timestamp < timestamp '${endSql}'
and r.path like '/rest/v1/%'
group by path, method
order by cnt desc
limit 20`

  const url = `${MANAGEMENT_API_BASE}/projects/${SUPABASE_PROJECT_REF}/analytics/endpoints/logs.all`
    + `?sql=${encodeURIComponent(sql)}`
    + `&iso_timestamp_start=${encodeURIComponent(start.toISOString())}`
    + `&iso_timestamp_end=${encodeURIComponent(end.toISOString())}`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Supabase Management API 요청 실패: ${res.status} ${await res.text().catch(() => '')}`)

  const body = await res.json() as { result: PathCount[] | null; error: string | null }
  if (body.error) throw new Error(`Supabase 로그 쿼리 실패: ${body.error}`)
  return body.result ?? []
}

export interface EgressAnomalyResult {
  windowHours: number
  checkedAt: string
  anomalies: PathCount[]
  topPaths: PathCount[]
}

/**
 * 최근 windowHours 동안 REST 경로별 요청 수를 훑어 비정상 스파이크를 찾는다.
 * 2026-08-09 movies 5만건/일 스파이크(원인 미확정) 재발 감지용 — /docs/RUNBOOK-crawler.md 참고.
 */
export async function checkEgressAnomaly(windowHours = 3): Promise<EgressAnomalyResult> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN 환경 변수가 설정되지 않았습니다.')

  const topPaths = await fetchPathCounts(accessToken, windowHours)
  const anomalies = topPaths.filter((p) => p.cnt >= PATH_REQUEST_THRESHOLD)

  return {
    windowHours,
    checkedAt: new Date().toISOString(),
    anomalies,
    topPaths: topPaths.slice(0, 5),
  }
}
