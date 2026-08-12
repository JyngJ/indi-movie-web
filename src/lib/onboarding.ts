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

/**
 * 이번 세션에 온보딩을 막 끝냈는지 표시하는 마커.
 * 온보딩을 닫자마자 15초 뒤 피드백 설문이 덮치는 걸 막는 데 쓴다 —
 * 이제 막 처음 써보기 시작한 사람에게 "잘 쓰고 계세요?"는 이르다.
 */
const ONBOARDED_THIS_SESSION_KEY = 'movie:onboarded-this-session:v1'

function markOnboardedThisSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(ONBOARDED_THIS_SESSION_KEY, '1')
  } catch {
    /* 프라이빗 모드 등 — 무시 */
  }
}

/** 이번 세션에서 온보딩을 닫았는가 */
export function didOnboardThisSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(ONBOARDED_THIS_SESSION_KEY) !== null
  } catch {
    return false
  }
}

/** 온보딩을 보여줘야 하는가 — 플래그가 없을 때만 true */
export async function shouldShowOnboarding(storage: IStorageAdapter): Promise<boolean> {
  if (sessionSeenOnWriteFailure) return false
  const seen = await storage.getItem(ONBOARDING_SEEN_KEY)
  return seen === null
}

/** 온보딩을 봤다고 기록 — 값은 디버깅용 타임스탬프 (존재 여부만 판단에 사용) */
export async function markOnboardingSeen(storage: IStorageAdapter): Promise<void> {
  markOnboardedThisSession()
  const persisted = await storage.setItem(ONBOARDING_SEEN_KEY, new Date().toISOString())
  if (!persisted) sessionSeenOnWriteFailure = true
}
