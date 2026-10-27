'use client'

import { useEffect, useMemo } from 'react'
import { useLocationPermission } from '@/hooks/useLocationPermission'
import { getRegionFromCoords, REGIONS } from '@/lib/regions'
import { getStoredRegion, setStoredRegion } from '@/lib/regionStorage'
import { trackEvent } from '@/lib/analytics/client'
import { decideSessionRegion } from '@/lib/regionSession'
import { useAuth } from '@/components/auth/AuthProvider'

/**
 * 접속 위치 → 지역 필터 연결.
 *
 * - currentRegionId: 위치 동의된 좌표로 추정한 지역. 지역 드롭다운이
 *   "현재 위치" 배지와 자동 스크롤에 쓴다. 동의 전이면 null.
 * - 자동 지정: 이번 세션에 지역이 비어 있으면 넣어준다. 로그인 사용자는
 *   계정에 저장된 마지막 지역(users.preferred_city)을, 없으면 접속 지역을 쓴다.
 *   (당근·매장찾기류의 프리셀렉트 패턴) 우선순위 판단은 decideSessionRegion.
 *
 * 자동 지정은 세션당 1회다. 지역 필터 저장소가 sessionStorage라 다음 방문엔
 * 비어서 시작하므로 방문마다 다시 넣는다. 같은 세션 안에서 사용자가 지우면
 * "전국을 보겠다"는 의사 표시이므로 다시 덮어쓰지 않는다.
 * 예전엔 기기당 1회(localStorage)여서 두 번째 방문부터는 지역이 비어 있었다.
 */
const AUTO_ASSIGN_KEY = 'yh_region_auto_session'

const VALID_REGION_IDS = new Set(REGIONS.map((r) => r.id))
const isValidRegion = (id: string) => VALID_REGION_IDS.has(id)

export function useCurrentLocationRegion(): string | null {
  const { coords } = useLocationPermission()
  const { status, user } = useAuth()
  const preferred = user?.preferredRegion ?? null

  const currentRegionId = useMemo(() => {
    if (!coords) return null
    const region = getRegionFromCoords(coords.lat, coords.lng)
    return region && isValidRegion(region) ? region : null
  }, [coords])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(AUTO_ASSIGN_KEY)) return
    } catch {
      return  /* 프라이빗 모드 — 자동 지정 생략 */
    }

    const decision = decideSessionRegion({
      stored: getStoredRegion(),
      authResolved: status !== 'loading',
      preferred,
      located: currentRegionId,
      isValidRegion,
    })
    if (decision.kind === 'wait') return

    // 마커를 먼저 세운다 — 이 훅이 여러 화면(홈·지도 필터바)에 동시에 마운트돼도
    // 두 번 지정되지 않도록. 실패해도 같은 값이라 무해하다.
    try { sessionStorage.setItem(AUTO_ASSIGN_KEY, '1') } catch { return }

    // 이번 세션에 이미 지역을 고른 사용자(지역 페이지 CTA 등)는 건드리지 않는다
    if (decision.kind === 'skip') return

    setStoredRegion(decision.regionId, { auto: true })
    trackEvent(decision.source === 'restore' ? 'region restored' : 'region auto assigned', { region: decision.regionId })
  }, [status, preferred, currentRegionId])

  return currentRegionId
}
