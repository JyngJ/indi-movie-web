import { storageAdapter } from '@/lib/adapters/storage'

const VISITS_KEY = 'movie:visits:v1'
const SURVEY_KEY = 'movie:survey:v1'
const SHOWN_AT_KEY = 'movie:survey-shown-at:v1'
const SESSION_MARK = 'movie:visit-counted:v1'

/**
 * 설문을 물어보는 방문 회차. 한 번 닫으면 영구 소각하던 걸 "다음에"로 바꾸면서,
 * 대신 아무 때나 다시 묻지 않도록 회차를 못박는다 — 최대 3번만 묻는다.
 * 2회차: 첫인상 / 5회차: 좀 써본 뒤 / 10회차: 단골. 이후로는 다시 묻지 않는다.
 */
export const SURVEY_MILESTONES = [2, 5, 10] as const

/** 세션당 1회 방문 수를 누적하고 누적 방문 횟수를 반환한다. */
export async function recordVisit(): Promise<number> {
  if (typeof window === 'undefined') return 0

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
  return visits
}

/**
 * 설문을 노출할지 결정. 노출할 때만 현재 방문 회차를 반환한다(아니면 null).
 *
 * 조건:
 * 1. 제출했거나 예전에 영구 거부한 사람은 다시 안 묻는다.
 * 2. 마일스톤 회차(2·5·10)에만, 회차당 1번만. 첫 방문(1회차)에는 묻지 않는다.
 *
 * 예전에는 "온보딩을 끝낸 사람만" 조건이 있었다 — 1회차에 온보딩 중 이탈한 사람이 2회차에
 * 온보딩과 설문을 동시에 맞았기 때문이다(2026-08-12). 2026-10 온보딩 슬라이드를 걷어내
 * 겹칠 전체화면이 없어져서 그 조건도 뺐다.
 */
export async function shouldShowSurvey(): Promise<number | null> {
  const visits = await recordVisit()

  const state = await storageAdapter.getItem(SURVEY_KEY)
  if (state) return null

  if (!(SURVEY_MILESTONES as readonly number[]).includes(visits)) return null

  const shownAt = Number((await storageAdapter.getItem(SHOWN_AT_KEY)) ?? '0')
  if (shownAt === visits) return null

  return visits
}

/** 이 회차에 이미 노출했다고 기록 — 라우트 이동으로 게이트가 리마운트돼도 다시 뜨지 않게 */
export async function markSurveyShown(visits: number): Promise<void> {
  await storageAdapter.setItem(SHOWN_AT_KEY, String(visits))
}

/** 다음에 물어볼 회차 — 남은 마일스톤이 없으면 null */
export function nextMilestone(visits: number): number | null {
  return SURVEY_MILESTONES.find((m) => m > visits) ?? null
}

/**
 * 설문 종료 상태 기록.
 * 'done'  — 제출 완료. 다시 묻지 않는다.
 * 'dismissed' — 영구 거부. 지금은 UI에서 쓰지 않지만(닫기는 "다음에"),
 *   예전 사용자에게 남아 있는 값이라 노출 차단 조건으로 계속 존중한다.
 */
export async function markSurvey(state: 'done' | 'dismissed'): Promise<void> {
  await storageAdapter.setItem(SURVEY_KEY, state)
}
