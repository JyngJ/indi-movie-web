/** 라우트 하나에 적용할 레이트리밋 정책 — 순수 값 객체 */
export interface RateLimitPolicy {
  /** 버킷 키 접두사. 라우트마다 달라야 카운터가 섞이지 않는다. */
  name: string
  /** 윈도 길이(초) */
  windowSeconds: number
  /** 윈도당 허용 횟수 */
  limit: number
}

export interface RateLimitResult {
  allowed: boolean
  hitCount: number
  /** 429 Retry-After 헤더에 넣을 초 */
  retryAfterSeconds: number
}
