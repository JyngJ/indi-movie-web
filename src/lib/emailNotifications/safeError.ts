/**
 * 발송·통계 작업이 실패했을 때 로그에 남길 수 있는 만큼만 요약한다.
 *
 * 예전엔 주소·토큰이 새지 않게 에러를 통째로 버리고 "완료하지 못했어요"만 찍었다. 2026-10-23
 * 첫 정기 발송이 그렇게 실패했는데, 어느 단계에서 왜 실패했는지 로그로 알 길이 없었다.
 * 원인을 가리는 데 필요한 것(DB 에러 코드·메시지, 메일 실패 종류)만 남기고,
 * 값이 실릴 수 있는 details·hint와 주소·토큰처럼 보이는 문자열은 지운다.
 */
export interface SafeErrorSummary {
  kind: 'db' | 'mail' | 'error' | 'unknown'
  code?: string
  message?: string
}

const EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g
const TOKEN_LIKE = /[A-Za-z0-9_\-+/=.]{32,}/g

/* 숫자와 영문자가 섞인 32자 이상 덩어리만 토큰으로 본다 — 테이블·컬럼 이름
   (email_notification_deliveries 등)은 원인 판별에 필요하므로 지우지 않는다 */
function scrub(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(TOKEN_LIKE, (m) => (/\d/.test(m) && /[A-Za-z]/.test(m) ? '[redacted]' : m))
    .slice(0, 300)
}

export function safeErrorSummary(error: unknown): SafeErrorSummary {
  if (!error || typeof error !== 'object') return { kind: 'unknown' }
  const e = error as { name?: unknown; code?: unknown; message?: unknown; uncertain?: unknown }
  const message = typeof e.message === 'string' ? scrub(e.message) : undefined

  // Supabase(PostgREST) 에러 — code가 Postgres SQLSTATE(42P01 등)나 PGRST*이다
  if (typeof e.code === 'string' && /^([0-9A-Z]{5}|PGRST\d+)$/.test(e.code)) {
    return { kind: 'db', code: e.code, message }
  }
  if (typeof e.uncertain === 'boolean') return { kind: 'mail', message }
  return { kind: 'error', code: typeof e.name === 'string' ? e.name : undefined, message }
}
