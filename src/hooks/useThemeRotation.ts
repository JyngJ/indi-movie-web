'use client'

import { useCallback, useEffect, useState } from 'react'
import { recordShownThemes } from '@/lib/curation/themeRotation'

const SEED_KEY = 'films-theme-rotation-seed'
const HISTORY_KEY = 'films-theme-rotation-history'

/**
 * 발견 테마 로테이션의 브라우저 상태 — 방문(탭 세션) 단위 seed와 테마별 마지막 노출 시각.
 * 저장소를 못 쓰는 환경(사생활 보호 창 등)이면 매번 새 seed·빈 기록으로 돌아간다.
 * 첫 렌더는 서버와 같게 seed=null — 테마 섹션은 mount 뒤에 고른다.
 */
export function useThemeRotation() {
  const [state, setState] = useState<{ seed: string; history: Record<string, number>; startedAt: number } | null>(null)

  useEffect(() => {
    let seed = Math.random().toString(36).slice(2)
    let history: Record<string, number> = {}
    try {
      const saved = sessionStorage.getItem(SEED_KEY)
      if (saved) seed = saved
      else sessionStorage.setItem(SEED_KEY, seed)
    } catch { /* 저장소 없음 — 이번 seed만 쓴다 */ }
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : {}
      if (parsed && typeof parsed === 'object') history = parsed as Record<string, number>
    } catch { /* 기록 없음으로 시작 */ }
    setState({ seed, history, startedAt: Date.now() })
  }, [])

  /** 이번 방문에 보여 준 테마를 기록한다. 같은 방문의 선택은 바꾸지 않도록 state는 그대로 둔다. */
  const markShown = useCallback((listIds: string[]) => {
    if (!state || listIds.length === 0) return
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      const current = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      localStorage.setItem(HISTORY_KEY, JSON.stringify(recordShownThemes(current, listIds, Date.now())))
    } catch { /* 기록 실패는 무시 — 다음 방문에 같은 테마가 다시 나올 수 있을 뿐 */ }
  }, [state])

  /** startedAt — 방문 시작 시각. 고를 때 지금 시각 대신 써서 같은 방문의 결과가 시간에 따라 바뀌지 않게 한다 */
  return { seed: state?.seed ?? null, history: state?.history ?? null, startedAt: state?.startedAt ?? 0, markShown }
}
