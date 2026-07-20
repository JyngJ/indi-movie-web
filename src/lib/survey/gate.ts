import { storageAdapter } from '@/lib/adapters/storage'

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

/** 설문을 노출할지 결정: 재방문자 + 아직 응답/닫기 안 함 */
export async function shouldShowSurvey(): Promise<boolean> {
  const returning = await recordVisitAndCheckReturning()
  if (!returning) return false
  const state = await storageAdapter.getItem(SURVEY_KEY)
  return !state
}

export async function markSurvey(state: 'done' | 'dismissed'): Promise<void> {
  await storageAdapter.setItem(SURVEY_KEY, state)
}
