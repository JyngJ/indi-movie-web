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

/** 온보딩을 보여줘야 하는가 — 플래그가 없을 때만 true */
export async function shouldShowOnboarding(storage: IStorageAdapter): Promise<boolean> {
  const seen = await storage.getItem(ONBOARDING_SEEN_KEY)
  return seen === null
}

/** 온보딩을 봤다고 기록 — 값은 디버깅용 타임스탬프 (존재 여부만 판단에 사용) */
export async function markOnboardingSeen(storage: IStorageAdapter): Promise<void> {
  await storage.setItem(ONBOARDING_SEEN_KEY, new Date().toISOString())
}
