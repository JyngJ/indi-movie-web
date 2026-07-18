import { useEffect, type RefObject } from 'react'
import { trackEvent } from '@/lib/analytics/client'

/** 이보다 짧게 보인 건 스크롤 통과로 보고 노이즈로 버림 */
const MIN_DWELL_MS = 300
/** 화면에 이 비율 이상 걸쳐 있어야 "보고 있다"로 침 */
const VISIBILITY_THRESHOLD = 0.5

/**
 * 섹션이 뷰포트에 50% 이상 걸쳐 있던 누적 시간을 재서 'curation section dwell'로 보낸다.
 * 탭을 백그라운드에 둔 시간은 안 셈 — visibilitychange로 타이머를 멈췄다 재개한다.
 * PostHog에서 list_id별로 group by 하면 "가장 오래 보는 섹션" 순위가 나온다.
 */
export function useSectionDwellTracking(
  ref: RefObject<HTMLElement | null>,
  listId: string | undefined,
  extraProps?: Record<string, string | number>,
) {
  useEffect(() => {
    if (!listId) return
    const el = ref.current
    if (!el) return

    let enteredAt: number | null = null

    function flush() {
      if (enteredAt == null) return
      const dwellMs = Math.round(performance.now() - enteredAt)
      enteredAt = null
      if (dwellMs >= MIN_DWELL_MS) {
        trackEvent('curation section dwell', { list_id: listId, dwell_ms: dwellMs, ...extraProps })
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') {
          enteredAt = performance.now()
        } else {
          flush()
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    )
    observer.observe(el)

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flush()
        return
      }
      // 탭 복귀 — 섹션이 여전히 화면 중앙 근처에 있으면 타이머 재개
      const rect = el!.getBoundingClientRect()
      const visible = rect.top < window.innerHeight * VISIBILITY_THRESHOLD && rect.bottom > window.innerHeight * (1 - VISIBILITY_THRESHOLD)
      if (visible) enteredAt = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      flush()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [ref, listId])
}
