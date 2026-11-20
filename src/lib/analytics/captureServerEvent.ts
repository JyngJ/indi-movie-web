/**
 * 서버·배치에서 PostHog로 집계 이벤트 1건을 보낸다. 사람과 연결하지 않는다
 * (사람 프로필·위치를 만들지 않음). 실패해도 호출한 작업을 멈추지 않는다 — false만 돌려준다.
 * 토큰(`NEXT_PUBLIC_POSTHOG_TOKEN`)이 없으면 보내지 않는다.
 */
export async function captureServerEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
  timestamp: string = new Date().toISOString(),
): Promise<boolean> {
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
  if (!token) return false
  try {
    const host = new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com')
    if (host.protocol !== 'https:') return false
    const response = await fetch(new URL('/i/v0/e/', host), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        api_key: token, event, distinct_id: distinctId, timestamp,
        properties: { ...properties, $process_person_profile: false, $geoip_disable: true, $ip: '0.0.0.0' },
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
