'use client'

import { useCallback, useSyncExternalStore } from 'react'

// useSyncExternalStore: hydration 렌더에는 서버 스냅샷(false)을 그대로 써서
// SSR HTML과 항상 일치 — 직후 실제 값으로 재렌더된다.
// (useState(() => matchMedia...) 초기화 방식은 데스크톱에서 hydration mismatch 유발)
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
