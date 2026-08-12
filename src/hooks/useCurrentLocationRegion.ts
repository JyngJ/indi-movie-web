'use client'

import { useEffect, useMemo } from 'react'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { getRegionFromCoords, REGIONS } from '@/lib/regions'
import { getStoredRegion, setStoredRegion } from '@/lib/regionStorage'
import { trackEvent } from '@/lib/analytics/client'

/**
 * 접속 위치 → 지역 필터 연결.
 *
 * - currentRegionId: 위치 동의된 좌표로 추정한 지역. 지역 드롭다운이
 *   "현재 위치" 배지와 자동 스크롤에 쓴다. 동의 전이면 null.
 * - 자동 지정: 위치는 동의했는데 지역 필터를 한 번도 안 만진 사용자에게
 *   최초 1회만 접속 지역을 필터로 넣어준다. (당근·매장찾기류의 프리셀렉트 패턴)
 *
 * 자동 지정은 기기당 1회다 — 사용자가 이후 필터를 지우면 "전국을 보겠다"는
 * 의사 표시이므로 다시 덮어쓰지 않는다.
 */
const AUTO_ASSIGN_KEY = 'yh_region_auto_v1'

const VALID_REGION_IDS = new Set(REGIONS.map((r) => r.id))

export function useCurrentLocationRegion(): string | null {
  const { coords } = useLocationPermission()

  const currentRegionId = useMemo(() => {
    if (!coords) return null
    const region = getRegionFromCoords(coords.lat, coords.lng)
    return region && VALID_REGION_IDS.has(region) ? region : null
  }, [coords])

  useEffect(() => {
    if (!currentRegionId) return
    try {
      if (localStorage.getItem(AUTO_ASSIGN_KEY)) return
      // 마커를 먼저 세운다 — 이 훅이 여러 화면(홈·지도 필터바)에 동시에 마운트돼도
      // 두 번 지정되지 않도록. 실패해도 같은 값이라 무해하다.
      localStorage.setItem(AUTO_ASSIGN_KEY, '1')
    } catch {
      return  /* 프라이빗 모드 — 자동 지정 생략 */
    }

    // 이미 지역을 고른(또는 과거에 지웠던) 사용자는 건드리지 않는다
    if (getStoredRegion() !== null) return

    setStoredRegion(currentRegionId)
    trackEvent('region auto assigned', { region: currentRegionId })
  }, [currentRegionId])

  return currentRegionId
}
