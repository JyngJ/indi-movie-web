import { ipAddress } from '@vercel/functions'
import { buildBucketKey, UNKNOWN_CLIENT_BUCKET } from './policies'
import { consumeRateLimit } from './store'
import type { RateLimitPolicy } from './types'

/**
 * 클라이언트 IP. Vercel 뒤에서는 x-forwarded-for를 플랫폼이 채우므로 헤더를 신뢰할 수 있다.
 * 로컬 개발이나 헤더가 없는 요청에서는 undefined가 나온다.
 */
function clientId(request: Request): string {
  const fromVercel = ipAddress(request)
  if (fromVercel) return fromVercel

  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first || UNKNOWN_CLIENT_BUCKET
}

/**
 * 정책 위반이면 429 Response를, 통과면 null을 돌려준다.
 *
 * 카운터 조회 자체가 실패하면 **통과시킨다(fail-open)**. 이 가드가 붙은 곳은 제보·설문 같은
 * 사용자 입력 경로라, DB가 흔들릴 때 정상 제출까지 막으면 공격자가 아니라 사용자만 잃는다.
 */
export async function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
): Promise<Response | null> {
  let result
  try {
    result = await consumeRateLimit({
      bucketKey: buildBucketKey(policy.name, clientId(request)),
      windowSeconds: policy.windowSeconds,
      limit: policy.limit,
    })
  } catch (error) {
    console.error(`[rate-limit] ${policy.name} 확인 실패 — 통과 처리`, error)
    return null
  }

  if (result.allowed) return null

  return Response.json(
    {
      error: {
        code: 'RATE_LIMITED',
        message: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        // 429는 절대 CDN에 남으면 안 된다 — 남으면 같은 캐시 키를 쓰는 다른 사용자까지 막힌다.
        'Cache-Control': 'no-store',
      },
    },
  )
}
