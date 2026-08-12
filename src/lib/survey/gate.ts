import { storageAdapter } from '@/lib/adapters/storage'
import { didOnboardThisSession, shouldShowOnboarding } from '@/lib/onboarding'

const VISITS_KEY = 'movie:visits:v1'
const SURVEY_KEY = 'movie:survey:v1'
const SESSION_MARK = 'movie:visit-counted:v1'

/** 세션당 1회 방문 수를 누적하고, 재방문(2회차 이상) 여부를 반환한다. */
export async function recordVisitAndCheckReturning(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  let visits = Number((await storageAdapter.getItem(VISITS_KEY)) ?? '0')
  try {
    // 같은 세션에서 새로고침해도 한 번만 카운트 (sessionStorage 마커)
    if (!window.sessionStorage.getItem(SESSION_MARK)) {
      visits += 1
      await storageAdapter.setItem(VISITS_KEY, String(visits))
      window.sessionStorage.setItem(SESSION_MARK, '1')
    }
  } catch {
    /* 프라이빗 모드 등 — 무시 */
  }
  return visits >= 2
}

/**
 * 설문을 노출할지 결정: 재방문자 + 온보딩을 끝낸 사람 + 아직 응답/닫기 안 함.
 *
 * 온보딩 완료 여부를 꼭 같이 봐야 한다. 방문 카운트는 페이지가 뜨는 즉시 오르지만
 * onboarding_seen 플래그는 "완료/건너뛰기"를 눌러야만 기록되기 때문에,
 * 1회차에 온보딩을 끝내지 않고 이탈한 사람은 2회차에 온보딩과 설문을 동시에 맞는다.
 * (측정: 설문 노출 334명 중 190명이 온보딩과 같은 세션 — 2026-08-12)
 * 하필 온보딩을 못 끝낸 사람에게 "잘 쓰고 계세요?"를 묻는 최악의 조합이라 막는다.
 */
export async function shouldShowSurvey(): Promise<boolean> {
  const returning = await recordVisitAndCheckReturning()
  if (!returning) return false
  if (await shouldShowOnboarding(storageAdapter)) return false
  // 온보딩을 방금 닫은 세션도 제외 — 다음 방문부터 묻는다
  if (didOnboardThisSession()) return false
  const state = await storageAdapter.getItem(SURVEY_KEY)
  return !state
}

export async function markSurvey(state: 'done' | 'dismissed'): Promise<void> {
  await storageAdapter.setItem(SURVEY_KEY, state)
}
