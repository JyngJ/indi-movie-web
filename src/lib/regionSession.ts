/**
 * 세션 시작 시 지역 필터 정하기 — 순수 함수 (UI·스토리지 무관).
 *
 * 우선순위: 이번 세션에 이미 있는 값 > 로그인 사용자가 마지막에 고른 지역(DB) > 접속 위치.
 * - 'wait': 아직 판단할 수 없다(로그인 확인 중, 위치 미확보). 마커를 세우지 말고 다시 부른다.
 * - 'skip': 이번 세션엔 손대지 않는다.
 */
export type SessionRegionDecision =
  | { kind: 'wait' }
  | { kind: 'skip' }
  | { kind: 'assign'; regionId: string; source: 'restore' | 'location' }

export interface SessionRegionInput {
  /** sessionStorage의 현재 지역 필터 */
  stored: string | null
  /** 로그인 확인이 끝났는지 */
  authResolved: boolean
  /** 로그인 사용자의 마지막 지역 (users.preferred_city). 비로그인이면 null */
  preferred: string | null
  /** 접속 위치로 추정한 지역 */
  located: string | null
  isValidRegion: (id: string) => boolean
}

export function decideSessionRegion(input: SessionRegionInput): SessionRegionDecision {
  if (input.stored !== null) return { kind: 'skip' }
  if (!input.authResolved) return { kind: 'wait' }
  if (input.preferred && input.isValidRegion(input.preferred)) {
    return { kind: 'assign', regionId: input.preferred, source: 'restore' }
  }
  if (input.located && input.isValidRegion(input.located)) {
    return { kind: 'assign', regionId: input.located, source: 'location' }
  }
  return { kind: 'wait' }
}
