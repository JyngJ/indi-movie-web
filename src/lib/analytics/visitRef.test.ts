import { describe, expect, it } from 'vitest'
import { VISIT_REF_TTL_MS, formatVisitRef, parseVisitRef } from './visitRef'

const NOW = 1_756_900_000_000

describe('parseVisitRef', () => {
  it('발급 시각이 태깅 창 안이면 유입 태그를 돌려준다', () => {
    expect(parseVisitRef(formatVisitRef('pf', NOW - 1000), NOW)).toBe('pf')
  })

  it('발급 시각이 없는 옛 값은 만료로 본다', () => {
    // 90일 Max-Age 시절에 심겨 아직 살아 있는 쿠키. 이게 안 걸러져서
    // 수정 뒤에도 본인 방문이 포폴 유입으로 계속 잡혔다.
    expect(parseVisitRef('pf', NOW)).toBeNull()
  })

  it('태깅 창을 넘기면 만료로 본다', () => {
    expect(parseVisitRef(formatVisitRef('pf', NOW - VISIT_REF_TTL_MS - 1), NOW)).toBeNull()
  })

  it('창 경계는 포함한다', () => {
    expect(parseVisitRef(formatVisitRef('pf', NOW - VISIT_REF_TTL_MS), NOW)).toBe('pf')
  })

  it('미래에 발급된 값은 믿지 않는다', () => {
    expect(parseVisitRef(formatVisitRef('pf', NOW + 60_000), NOW)).toBeNull()
  })

  it('빈 값과 깨진 값은 만료로 본다', () => {
    expect(parseVisitRef('', NOW)).toBeNull()
    expect(parseVisitRef(null, NOW)).toBeNull()
    expect(parseVisitRef('pf.', NOW)).toBeNull()
    expect(parseVisitRef('.123', NOW)).toBeNull()
    expect(parseVisitRef('pf.abc', NOW)).toBeNull()
  })
})
