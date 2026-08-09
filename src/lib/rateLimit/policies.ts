import type { RateLimitPolicy } from './types'

/**
 * 무인증 쓰기 라우트는 봇이 그대로 두들길 수 있고, 저장 후 Discord 웹훅까지 태우므로
 * DB 오염 + 웹훅 레이트리밋 소진이 동시에 일어난다. 사람이 실제로 낼 수 있는 횟수보다
 * 넉넉하되 자동화는 못 버티는 선으로 잡는다.
 */
export const RATE_LIMIT_POLICIES = {
  /** 제보 — 파일 업로드까지 붙어 가장 비싸다 */
  reports: { name: 'reports', windowSeconds: 600, limit: 5 },
  /** 영화/극장 추가 요청 */
  userRequests: { name: 'user-requests', windowSeconds: 600, limit: 10 },
  /** 재방문 설문 — 한 세션에 한 번이면 충분 */
  survey: { name: 'survey', windowSeconds: 600, limit: 5 },
  /**
   * 공개 상영시간표 창 조회. CDN이 앞에 있으므로 이 카운터는 **캐시 미스에서만** 는다.
   * 정상 사용자는 필터를 바꿔도 분당 수십 회를 넘기 어렵고, 쿼리스트링을 흔들어
   * 캐시를 무력화하는 공격만 이 선에 걸린다.
   */
  showtimesWindow: { name: 'showtimes-window', windowSeconds: 60, limit: 120 },
} as const satisfies Record<string, RateLimitPolicy>

/**
 * 클라이언트 IP를 못 구한 경우에 쓰는 공용 버킷 키.
 * IP별로 나눌 수 없으니 전부 한 버킷에 몰아 넣는다 — 정상 트래픽에서는 거의 비어 있고,
 * 헤더를 지운 채 들어오는 대량 요청만 여기서 함께 걸린다.
 */
export const UNKNOWN_CLIENT_BUCKET = 'unknown'

export function buildBucketKey(policyName: string, clientId: string): string {
  return `${policyName}:${clientId}`
}
