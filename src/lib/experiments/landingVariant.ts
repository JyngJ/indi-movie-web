// ================================
// 랜딩 A/B 테스트 — variant 배정 판단 (순수 로직)
// 스토리지 접근은 IStorageAdapter 주입으로 분리 — localStorage 직접 호출 금지
// ================================

import type { IStorageAdapter } from '@/lib/adapters/storage'
import { ONBOARDING_SEEN_KEY } from '@/lib/onboarding'

export type LandingVariant = 'control' | 'test'

/**
 * 배정 플래그 키.
 * 버전 포함 — 향후 배정 로직(비율 등)을 바꿀 때 v2로 올려 새로 배정할 수 있다.
 */
export const LANDING_VARIANT_KEY = 'landing_variant_v1'

/**
 * localStorage 쓰기 실패(사파리 프라이빗 모드/쿼터 초과 등) 시에만 세우는 인메모리 안전망.
 * `onboarding.ts`의 `sessionSeenOnWriteFailure`와 같은 이유 — 쓰기가 실패해도
 * 같은 세션 안에서 재호출될 때마다 재추첨되지 않도록(같은 사람이 세션 중 arm을 오가는 것 방지) 캐시해둔다.
 */
let sessionAssignedVariant: LandingVariant | null = null

/**
 * 신규/기존 방문자를 가려 variant를 반환(필요 시 배정 후 영속화).
 * - 이미 배정된 값이 있으면 그대로 반환(재추첨 안 함).
 * - `ONBOARDING_SEEN_KEY`만 있고 배정 값이 없으면 실험 이전부터 있던 기존 유저 —
 *   저장 없이 `'control'`을 반환(소급 랜덤화 방지).
 * - 둘 다 없으면 신규 방문자 — 랜덤 배정 후 저장.
 */
export async function getOrAssignLandingVariant(
  storage: IStorageAdapter,
  random: () => number = Math.random,
): Promise<LandingVariant> {
  if (sessionAssignedVariant) return sessionAssignedVariant

  const existing = await storage.getItem(LANDING_VARIANT_KEY)
  if (existing === 'control' || existing === 'test') return existing

  const onboardingSeen = await storage.getItem(ONBOARDING_SEEN_KEY)
  if (onboardingSeen !== null) return 'control'

  const variant: LandingVariant = random() < 0.5 ? 'control' : 'test'
  const persisted = await storage.setItem(LANDING_VARIANT_KEY, variant)
  if (!persisted) sessionAssignedVariant = variant
  return variant
}
