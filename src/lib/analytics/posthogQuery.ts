/** 서버·스크립트 전용 PostHog HogQL 조회 (개인 API 키). 브라우저에서 부르지 말 것. */
export const POSTHOG_PROD_HOST = 'www.xn--hq1bv8o5phw2d7wt.com'
export const POSTHOG_EXCLUDE_INTERNAL = '(person.properties.$internal_or_test_user is null or person.properties.$internal_or_test_user != true)'

/**
 * timeoutMs — 스크립트는 기본 120초. 사용자 요청 경로(공개 API)는 반드시 짧게 준다:
 * 2026-11-25 PostHog 쿼리가 10초대 TIMEOUT_EXCEEDED로 1분 넘게 응답을 붙잡았다.
 */
export async function hogql(query: string, { timeoutMs = 120000 }: { timeoutMs?: number } = {}): Promise<unknown[][]> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY, project = process.env.POSTHOG_PROJECT_ID
  if (!key || !project) throw new Error('POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID missing')
  const res = await fetch(`https://us.posthog.com/api/projects/${project}/query/`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }), signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status} ${(await res.text()).slice(0, 300)}`)
  return ((await res.json()) as { results: unknown[][] }).results
}
