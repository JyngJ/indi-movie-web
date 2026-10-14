'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ADSENSE_CLIENT, detailAdSlot } from '@/lib/ads/adsenseConfig'

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * 상세(영화·극장·감독) 맨 아래 광고 한 칸.
 *
 * 자동 광고는 위치를 고를 수 없고, 인페이지 광고가 React가 그리는 구간에 끼어들면
 * removeChild 오류가 날 수 있다(HANDOFF-20260918 §5). 그래서 상세는 본문이 끝난 자리에
 * 직접 한 칸만 둔다. 광고 단위 ID(NEXT_PUBLIC_ADSENSE_DETAIL_SLOT)가 없으면 아무것도
 * 그리지 않는다 — 사이트 승인 전에는 비워 둔다.
 *
 * 상세→상세 클라이언트 이동에서는 컴포넌트가 그대로 남아 새 광고를 요청하지 않는다.
 * 경로를 key로 다시 마운트해 페이지마다 한 번씩 push한다.
 */
export function DetailBottomAd() {
  const slot = detailAdSlot()
  const pathname = usePathname()
  if (!slot) return null
  return <AdUnit key={pathname} slot={slot} />
}

function AdUnit({ slot }: { slot: string }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* 광고 차단기·중복 push — 본문 동작과 무관하므로 삼킨다 */
    }
  }, [])

  return (
    <section
      aria-label="광고"
      style={{ padding: 'var(--spacing-6) var(--gutter)', borderTop: '1px solid var(--color-border)' }}
    >
      <p style={{ margin: '0 0 var(--spacing-2)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
        광고
      </p>
      {/* 높이를 미리 잡아 둔다 — 광고가 늦게 채워질 때 아래 여백이 밀리지 않게(CLS) */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 'var(--spacing-24)' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  )
}
