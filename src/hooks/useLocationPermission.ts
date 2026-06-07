'use client'

import { useCallback, useEffect, useState } from 'react'
import { locationAdapter, type LocationCoords } from '@/lib/adapters/location'

export type LocationPermState = 'idle' | 'prompt' | 'requesting' | 'denied' | 'success'

const SKIP_KEY = 'ym_loc_skip'

export function useLocationPermission() {
  const [state, setState] = useState<LocationPermState>('idle')
  const [coords, setCoords] = useState<LocationCoords | null>(null)

  useEffect(() => {
    // 1. 캐시된 위치 즉시 적용
    const cached = locationAdapter.loadCache()
    if (cached) {
      setCoords(cached)
      setState('success')
    }

    // 2. 브라우저 권한 상태 확인
    locationAdapter.getPermissionState().then((perm) => {
      if (perm === 'granted') {
        // 이미 허용됨 — 조용히 갱신
        locationAdapter.getCurrentPosition().then((c) => {
          if (c) { setCoords(c); locationAdapter.saveCache(c) }
          setState('success')
        })
      } else if (perm === 'denied') {
        // 차단됨 — 캐시가 있거나 이전에 "괜찮아요/설정했어요"로 닫았으면 팝업 생략
        setState(cached || localStorage.getItem(SKIP_KEY) ? 'idle' : 'denied')
      } else {
        // 'prompt' or 'unsupported'
        // 이전에 "괜찮아요" 눌렀으면 팝업 생략
        if (!cached && !localStorage.getItem(SKIP_KEY)) {
          setState('prompt')
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 위치 허용하기 / 설정했어요 버튼 */
  const request = useCallback(async () => {
    setState('requesting')
    try {
      const c = await locationAdapter.requestPosition()
      setCoords(c)
      locationAdapter.saveCache(c)
      setState('success')
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code
      // code 1 = PERMISSION_DENIED
      setState(code === 1 ? 'denied' : 'idle')
    }
  }, [])

  /** 괜찮아요 — 이번 세션뿐 아니라 이후에도 팝업 생략 */
  const dismiss = useCallback(() => {
    localStorage.setItem(SKIP_KEY, '1')
    setState('idle')
  }, [])

  /** 위치 버튼 클릭 시 GPS 재조회 */
  const refetch = useCallback(() => {
    locationAdapter.getCurrentPosition().then((c) => {
      if (c) { setCoords(c); locationAdapter.saveCache(c); setState('success') }
    })
  }, [])

  return { state, coords, request, dismiss, refetch }
}
