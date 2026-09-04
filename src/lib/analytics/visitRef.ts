/**
 * /p 유입 쿠키(`vref`)의 값 규약.
 *
 * 값에 발급 시각을 함께 실어 `pf.1756900000000` 꼴로 심는다. 쿠키의 Max-Age만
 * 믿을 수 없기 때문이다 — Max-Age를 90일에서 30분으로 줄여도(#311) 그 전에
 * 심긴 90일짜리 쿠키는 브라우저에 그대로 남아, 이후 모든 방문이 계속 pf로
 * 태깅됐다. 실제로 8/22 수정 뒤에도 9/2까지 본인 방문이 포폴 유입으로 집계됐다.
 *
 * 발급 시각이 없는 옛 값(`pf`)은 만료된 것으로 본다. 그래야 이미 눌어붙은
 * 쿠키가 /p 재방문 없이도 스스로 사라진다.
 */

/** 태깅 창 — PostHog 세션 정의와 같은 길이라 "방문 1회"만 pf로 잡힌다. */
export const VISIT_REF_TTL_MS = 30 * 60 * 1000

export function formatVisitRef(ref: string, issuedAt: number) {
  return `${ref}.${issuedAt}`
}

/**
 * 쿠키 값에서 살아있는 유입 태그를 꺼낸다.
 * 발급 시각이 없거나, 미래이거나, TTL을 넘겼으면 null.
 */
export function parseVisitRef(value: string | null | undefined, now: number): string | null {
  if (!value) return null

  const separator = value.lastIndexOf('.')
  if (separator <= 0) return null

  const ref = value.slice(0, separator)
  const issuedAt = Number(value.slice(separator + 1))
  if (!ref || !Number.isFinite(issuedAt)) return null

  const age = now - issuedAt
  if (age < 0 || age > VISIT_REF_TTL_MS) return null

  return ref
}
