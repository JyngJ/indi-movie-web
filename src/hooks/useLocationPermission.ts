'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { locationAdapter, type LocationCoords } from '@/lib/adapters/location'

export type LocationPermState = 'idle' | 'prompt' | 'requesting' | 'denied' | 'success'

const SKIP_KEY = 'ym_loc_skip'

// 위치 권한 상태는 앱 전역에서 하나여야 한다 — 지도·상영작 탭·온보딩이 같은 상태를 공유.
// (온보딩 CTA에서 허용/건너뛴 결과가 지도의 권한 팝업·내 위치 이동에 즉시 반영되도록 store로 관리)
interface LocationPermissionState {
  state: LocationPermState
  coords: LocationCoords | null
}

const useLocationPermissionStore = create<LocationPermissionState>(() => ({
  state: 'idle',
  coords: null,
}))

const setState = useLocationPermissionStore.setState

let initStarted = false

/** 최초 1회 — 캐시 적용 + 브라우저 권한 상태 확인 */
function initPermissionState() {
  // 1. 캐시된 위치 즉시 적용
  const cached = locationAdapter.loadCache()
  if (cached) {
    setState({ coords: cached, state: 'success' })
  }

  // 2. 브라우저 권한 상태 확인
  locationAdapter.getPermissionState().then((perm) => {
    if (perm === 'granted') {
      // 이미 허용됨 — 조용히 갱신
      locationAdapter.getCurrentPosition().then((c) => {
        if (c) {
          locationAdapter.saveCache(c)
          setState({ coords: c })
        }
        setState({ state: 'success' })
      })
    } else if (perm === 'denied') {
      // 차단됨 — 캐시가 있거나 이전에 "괜찮아요/설정했어요"로 닫았으면 팝업 생략
      setState({ state: cached || localStorage.getItem(SKIP_KEY) ? 'idle' : 'denied' })
    } else {
      // 'prompt' or 'unsupported'
      // 이전에 "괜찮아요" 눌렀으면 팝업 생략
      if (!cached && !localStorage.getItem(SKIP_KEY)) {
        setState({ state: 'prompt' })
      }
    }
  })
}

/** 위치 허용하기 / 설정했어요 버튼 */
async function request() {
  setState({ state: 'requesting' })
  try {
    const c = await locationAdapter.requestPosition()
    locationAdapter.saveCache(c)
    setState({ coords: c, state: 'success' })
  } catch (err: unknown) {
    const code = (err as GeolocationPositionError)?.code
    // code 1 = PERMISSION_DENIED
    setState({ state: code === 1 ? 'denied' : 'idle' })
  }
}

/** 괜찮아요 — 이번 세션뿐 아니라 이후에도 팝업 생략 */
function dismiss() {
  localStorage.setItem(SKIP_KEY, '1')
  setState({ state: 'idle' })
}

/** 위치 버튼 클릭 시 GPS 재조회 */
function refetch() {
  locationAdapter.getCurrentPosition().then((c) => {
    if (c) {
      locationAdapter.saveCache(c)
      setState({ coords: c, state: 'success' })
    }
  })
}

export function useLocationPermission() {
  const state = useLocationPermissionStore((s) => s.state)
  const coords = useLocationPermissionStore((s) => s.coords)

  useEffect(() => {
    if (initStarted) return
    initStarted = true
    initPermissionState()
  }, [])

  return { state, coords, request, dismiss, refetch }
}
