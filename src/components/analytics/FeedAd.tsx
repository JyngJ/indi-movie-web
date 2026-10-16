'use client'

import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT } from '@/lib/ads/adsenseConfig'
import styles from './FeedAd.module.css'

/** 기존 자동 광고 스크립트를 공유한다. Google이 바꾸는 ins 내부는 React가 그리지 않는다. */
export function FeedAd() {
  const adRef = useRef<HTMLModElement>(null)
  const requested = useRef(false)

  useEffect(() => {
    const ad = adRef.current
    if (!ad) return
    const request = () => {
      if (requested.current || ad.clientWidth === 0) return
      requested.current = true
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (error) {
        console.warn('피드 광고 요청 실패', error)
      }
    }
    // 화면 가까이에 왔을 때만 요청한다. CSS로 가려진 탭에서는 폭이 생길 때까지 기다린다.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) request()
    }, { rootMargin: '300px 0px' })
    observer.observe(ad)
    return () => observer.disconnect()
  }, [])

  return (
    <aside aria-label="광고" className={styles.container}>
      <span className={styles.label}>광고</span>
      <ins
        ref={adRef}
        className={`adsbygoogle ${styles.ad}`}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot="5376601636"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
