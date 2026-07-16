'use client'

// ================================
// useLandingVariant — 랜딩 A/B 배정 해석
// OnboardingGate와 동일하게 "resolve 전에는 아무것도 결정하지 않음" 패턴 —
// 배정값을 서버/클라이언트 첫 렌더에서 일치시키고(hydration 안전), 이후 effect에서 확정한다.
// 해석과 동시에 세션 컨텍스트에 stamp해서 이후 모든 trackEvent에 landing_variant가 자동으로 실리게 한다.
// ================================

import { useEffect, useState } from 'react'
import { getOrAssignLandingVariant, type LandingVariant } from '@/lib/experiments/landingVariant'
import { storageAdapter } from '@/lib/adapters/storage'
import { setLandingVariant } from '@/lib/analytics/session'

export function useLandingVariant(): LandingVariant | null {
  const [variant, setVariant] = useState<LandingVariant | null>(null)

  useEffect(() => {
    let cancelled = false
    void getOrAssignLandingVariant(storageAdapter).then((resolved) => {
      if (cancelled) return
      setLandingVariant(resolved)
      setVariant(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return variant
}
