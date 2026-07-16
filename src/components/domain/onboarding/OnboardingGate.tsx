'use client'

// ================================
// OnboardingGate — 노출 판단 게이트
// 플래그(onboarding_seen_v1) 확인 전에는 아무것도 그리지 않아
// 기존 사용자에게 온보딩이 한 프레임도 보이지 않게 한다 (SSR/hydration 안전).
// ================================

import { useEffect, useState } from 'react'
import { shouldShowOnboarding } from '@/lib/onboarding'
import { storageAdapter } from '@/lib/adapters/storage'
import type { LandingVariant } from '@/lib/experiments/landingVariant'
import { Onboarding } from './Onboarding'

interface Props {
  // TabsLayout에서 이미 resolve한 값을 그대로 받는다 — 여기서 다시 배정 로직을 호출하지 않는다
  variant: LandingVariant | null
}

export function OnboardingGate({ variant }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    void shouldShowOnboarding(storageAdapter).then((should) => {
      if (!cancelled && should) setShow(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!show) return null
  return <Onboarding variant={variant} onClose={() => setShow(false)} />
}
