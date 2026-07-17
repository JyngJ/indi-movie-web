// ================================
// 랜딩 A/B 테스트 — variant 배정 판단 (순수 로직)
// 스토리지 접근은 IStorageAdapter 주입으로 분리 — localStorage 직접 호출 금지
// ================================

import type { IStorageAdapter } from '@/lib/adapters/storage'
import { ONBOARDING_SEEN_KEY } from '@/lib/onboarding'

export type LandingVariant = 'control' | 'test'

export type AssignmentSource =
  | 'stored' // 이미 배정된 값을 스토리지에서 읽음
  | 'fresh' // 신규 배정 + 저장 성공
  | 'memory_fallback' // 신규 배정했으나 스토리지 쓰기 실패 → 인메모리 폴백
  | 'legacy_user' // 실험 배포 이전부터 있던 유저 — 실험 모집단 아님
  | 'legacy_v1' // v1(오염된 1차) 라운드에서 이미 배정받은 유저 — 리셋 후 실험 모집단에서 제외

export interface LandingVariantAssignment {
  variant: LandingVariant
  /** 랜덤 배정을 실제로 받은 실험 모집단인지 여부. 'legacy_user'/'legacy_v1'만 false. */
  isExperimentParticipant: boolean
  source: AssignmentSource
}

/**
 * 배정 플래그 키.
 * 버전 포함 — 향후 배정 로직(비율 등)을 바꿀 때 다음 버전으로 올려 새로 배정할 수 있다.
 * v1 → v2: 배정 이벤트 경계 버그(legacy 유저가 control에 섞이던 문제)로 3일치 데이터가
 * 오염돼 리셋. v1 배정자는 아래 LANDING_VARIANT_KEY_V1으로 감지해 실험에서 영구 제외한다.
 */
export const LANDING_VARIANT_KEY = 'landing_variant_v2'

/**
 * 폐기된 v1 배정 키.
 * 값은 더 이상 읽지 않고 **존재 여부만** legacy 판정에 사용한다 —
 * v1 라운드에서 이미 랜딩 처치를 받은 유저를 재추첨하지 않고 실험에서 제외하기 위함.
 * 삭제하지 않는다(삭제하면 이 판정 근거가 사라진다).
 */
const LANDING_VARIANT_KEY_V1 = 'landing_variant_v1'

/**
 * localStorage 쓰기 실패(사파리 프라이빗 모드/쿼터 초과 등) 시에만 세우는 인메모리 안전망.
 * `onboarding.ts`의 `sessionSeenOnWriteFailure`와 같은 이유 — 쓰기가 실패해도
 * 같은 세션 안에서 재호출될 때마다 재추첨되지 않도록(같은 사람이 세션 중 arm을 오가는 것 방지) 캐시해둔다.
 * 단, 스토리지가 그새 복구됐을 수 있으니 항상 스토리지의 `stored` 값보다는 후순위로 확인한다.
 */
let sessionAssignedFallback: LandingVariantAssignment | null = null

/**
 * 신규/기존 방문자를 가려 variant 배정 결과를 반환(필요 시 배정 후 영속화).
 * 우선순위: stored(v2 기배정) > memory_fallback(세션 내 폴백) > legacy_v1(v1 라운드 배정자)
 * > legacy_user(실험 이전 기존 유저) > fresh(신규 배정).
 * - 이미 v2 배정값이 있으면 그대로 반환(재추첨 안 함) — `source: 'stored'`.
 * - `landing_variant_v1`이 있으면 v1 라운드에서 이미 처치를 받은 유저 — 저장 없이
 *   `'control'`을 반환하고 `isExperimentParticipant: false`로 표시한다.
 * - `ONBOARDING_SEEN_KEY`만 있으면 실험 이전부터 있던 기존 유저 — 마찬가지로 비참가자.
 * - 모두 없으면 완전 신규 방문자 — 랜덤 배정 후 저장(`source: 'fresh'`),
 *   저장이 실패하면 인메모리에 캐시한다(`source: 'memory_fallback'`).
 */
export async function getOrAssignLandingVariant(
  storage: IStorageAdapter,
  random: () => number = Math.random,
): Promise<LandingVariantAssignment> {
  const existing = await storage.getItem(LANDING_VARIANT_KEY)
  if (existing === 'control' || existing === 'test') {
    return { variant: existing, isExperimentParticipant: true, source: 'stored' }
  }

  // 스토리지가 그새 복구됐을 수 있으니(쓰기 실패 → 이후 정상화) 인메모리 폴백보다 스토리지 값을 우선 신뢰
  if (sessionAssignedFallback) return sessionAssignedFallback

  const v1Assigned = await storage.getItem(LANDING_VARIANT_KEY_V1)
  if (v1Assigned !== null) {
    return { variant: 'control', isExperimentParticipant: false, source: 'legacy_v1' }
  }

  const onboardingSeen = await storage.getItem(ONBOARDING_SEEN_KEY)
  if (onboardingSeen !== null) {
    return { variant: 'control', isExperimentParticipant: false, source: 'legacy_user' }
  }

  const variant: LandingVariant = random() < 0.5 ? 'control' : 'test'
  const persisted = await storage.setItem(LANDING_VARIANT_KEY, variant)
  const assignment: LandingVariantAssignment = {
    variant,
    isExperimentParticipant: true,
    source: persisted ? 'fresh' : 'memory_fallback',
  }
  if (!persisted) sessionAssignedFallback = assignment
  return assignment
}
