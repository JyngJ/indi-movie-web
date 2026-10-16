'use client'

import { useCallback, useEffect, useState } from 'react'
import { storageAdapter } from '@/lib/adapters/storage'
import { markHintSeen, shouldShowHint, type HintId } from '@/lib/onboarding'
import { trackEvent } from '@/lib/analytics/client'

/**
 * 첫 사용 힌트 상태.
 *  - checking: 본 적 있는지 확인 중 — 이때는 다음 순서의 말풍선(지역 안내)도 띄우지 않는다
 *  - show: 이번 방문에 보여 준다. 보여 준 순간 기록하므로 닫지 않고 떠나도 다음 방문엔 안 뜬다
 *  - done: 본 적 있거나 방금 닫음 — 다음 순서의 말풍선을 띄워도 된다
 *
 * enabled가 false인 동안(예: 위치 권한 창이 떠 있음)은 checking에 머문다.
 * delayMs — 앞선 창이 늦게 뜨는 화면용. 지도는 위치 권한 상태가 처음엔 idle이었다가 잠시 뒤
 * prompt로 바뀌어, 기다리지 않으면 권한 창과 힌트가 같이 떴다. 그사이 enabled가 꺼지면 다시 잰다.
 */
export function useFirstUseHint(id: HintId, enabled = true, delayMs = 0) {
  const [state, setState] = useState<'checking' | 'show' | 'done'>('checking')

  useEffect(() => {
    if (!enabled || state !== 'checking') return
    let cancelled = false
    const timer = setTimeout(() => {
      void shouldShowHint(storageAdapter, id).then((should) => {
        if (cancelled) return
        if (!should) return setState('done')
        setState('show')
        void markHintSeen(storageAdapter, id)
        trackEvent('hint shown', { hint: id })
      })
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, enabled, state, delayMs])

  const dismiss = useCallback(() => setState('done'), [])
  return { state, dismiss }
}
