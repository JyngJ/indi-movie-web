'use client'

import { useEffect, useState } from 'react'
import { storageAdapter } from '@/lib/adapters/storage'
import { markHintSeen, shouldShowHint } from '@/lib/onboarding'
import { trackEvent } from '@/lib/analytics/client'
import { Card } from '@/components/primitives'

/**
 * 첫 방문 소개 — 상영작 홈 맨 위 카드 한 장.
 *
 * 예전 온보딩(4장 전체화면 슬라이드)은 첫 화면을 가려 방문자 절반이 아무것도 안 누르고 나갔다
 * (src/lib/onboarding.ts). 이 카드는 화면을 가리지 않는 본문 카드라 닫기 버튼을 두지 않고,
 * 보여 준 순간 기록해서 다음 방문부터는 그리지 않는다.
 */
export function FirstVisitIntro({ theaterCount }: { theaterCount: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    void shouldShowHint(storageAdapter, 'intro').then((should) => {
      if (cancelled || !should) return
      setShow(true)
      void markHintSeen(storageAdapter, 'intro')
      trackEvent('hint shown', { hint: 'intro' })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!show) return null

  const countText = theaterCount > 0 ? `${theaterCount}곳의 ` : ''
  return (
    <Card
      role="region"
      aria-label="영화볼지도 소개"
      padding="md"
      shadow="none"
      bordered={false}
      style={{
        margin: 'var(--spacing-3) var(--gutter) 0',
        borderRadius: 'var(--radius-control)',
        backgroundColor: 'var(--color-primary-subtle)',
        color: 'var(--color-primary-on-subtle)',
      }}
    >
      <p style={{ margin: 0, fontSize: 'var(--text-body)', fontWeight: 700, lineHeight: 1.5, wordBreak: 'keep-all' }}>
        전국 독립·예술영화관 {countText}상영 시간표를 매일 모아요
      </p>
      <p style={{ margin: 'var(--spacing-1) 0 0', fontSize: 'var(--text-meta)', lineHeight: 1.6, wordBreak: 'keep-all' }}>
        영화를 고르면 상영하는 극장과 회차가 보여요 · 지도 탭에서 가까운 극장을 찾을 수 있어요
      </p>
    </Card>
  )
}
