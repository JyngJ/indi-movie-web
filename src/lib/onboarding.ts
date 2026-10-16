// ================================
// 첫 사용 힌트 — 노출 여부 판단 (순수 로직)
// 스토리지 접근은 IStorageAdapter 주입으로 분리 — localStorage 직접 호출 금지
// ================================

import type { IStorageAdapter } from '@/lib/adapters/storage'

/**
 * 2026-10 온보딩 슬라이드(4장 전체화면)를 걷어내고, 필요한 자리에서 한 번씩 보여 주는 힌트로 바꿨다.
 * 30일 실측: 첫 장을 본 1,821명 중 끝까지 넘긴 사람 519명(28%), 건너뛰기 324명, 아무것도 안 누르고
 * 떠난 사람 약 980명(54%). 첫 화면을 가린 채로 방문자 절반이 나갔다.
 *
 * - intro: 상영작 홈 맨 위 소개 카드(화면을 가리지 않는다)
 * - mapPins: 지도 첫 방문 토스트 — 핀의 포스터가 무슨 뜻인지
 * 위치 권한은 지도에서만 묻는다(상영작 홈에서 자동으로 띄우지 않는다).
 */
export const HINT_KEYS = {
  intro: 'hint_intro_v1',
  mapPins: 'hint_map_pins_v1',
} as const

export type HintId = keyof typeof HINT_KEYS

/** 예전 온보딩을 끝낸 사람은 이미 소개를 봤다 — 소개 카드를 다시 보여 주지 않는다 */
export const LEGACY_ONBOARDING_KEY = 'onboarding_seen_v1'

/**
 * 이번 세션에 이미 보여 준 힌트. 저장이 실패해도(사파리 프라이빗 모드 등) 같은 세션에서
 * 화면을 오갈 때마다 다시 뜨지 않게 하는 인메모리 안전망이다.
 */
const shownThisSession = new Set<HintId>()

/** 힌트를 보여 줘야 하는가 — 본 적이 없을 때만 true */
export async function shouldShowHint(storage: IStorageAdapter, id: HintId): Promise<boolean> {
  if (shownThisSession.has(id)) return false
  if ((await storage.getItem(HINT_KEYS[id])) !== null) return false
  if (id === 'intro' && (await storage.getItem(LEGACY_ONBOARDING_KEY)) !== null) return false
  return true
}

/** 힌트를 봤다고 기록 — 값은 디버깅용 타임스탬프(존재 여부만 판단에 쓴다) */
export async function markHintSeen(storage: IStorageAdapter, id: HintId): Promise<void> {
  shownThisSession.add(id)
  await storage.setItem(HINT_KEYS[id], new Date().toISOString())
}
