// ================================
// Onboarding — 노출 여부 판단 (순수 로직)
// 스토리지 접근은 IStorageAdapter 주입으로 분리 — localStorage 직접 호출 금지
// ================================

import type { IStorageAdapter } from '@/lib/adapters/storage'

/**
 * 첫 방문 1회 노출 플래그 키.
 * 버전 포함 — 향후 온보딩 개편 시 v2로 올려 재노출할 수 있다.
 */
export const ONBOARDING_SEEN_KEY = 'onboarding_seen_v1'

/**
 * localStorage 쓰기 실패(사파리 프라이빗 모드/쿼터 초과 등) 시에만 세우는 인메모리 안전망.
 * 정상 저장된 경우엔 셋 안 함 — 사용자가 실제로 스토리지를 지운 경우엔 다시 노출돼야 하므로.
 * 쓰기가 실패한 경우에만, OnboardingGate가 다른 라우트(영화/극장 상세)에서 리마운트돼도
 * 같은 세션 안에서는 재노출되지 않도록 방어한다.
 */
let sessionSeenOnWriteFailure = false

/** 온보딩을 보여줘야 하는가 — 플래그가 없을 때만 true */
export async function shouldShowOnboarding(storage: IStorageAdapter): Promise<boolean> {
  if (sessionSeenOnWriteFailure) return false
  const seen = await storage.getItem(ONBOARDING_SEEN_KEY)
  return seen === null
}

/** 온보딩을 봤다고 기록 — 값은 디버깅용 타임스탬프 (존재 여부만 판단에 사용) */
export async function markOnboardingSeen(storage: IStorageAdapter): Promise<void> {
  const persisted = await storage.setItem(ONBOARDING_SEEN_KEY, new Date().toISOString())
  if (!persisted) sessionSeenOnWriteFailure = true
}
