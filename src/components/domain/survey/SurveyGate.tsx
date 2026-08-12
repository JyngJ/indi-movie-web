'use client'

// ================================
// SurveyGate — 재방문자 피드백 설문 노출 게이트
// 재방문(2회차 이상) + 온보딩 완료 + 미응답일 때만, 진입 15초 뒤 1회 노출한다.
// 온보딩 완료 조건은 shouldShowSurvey 안에 있다 — "재방문자는 당연히 온보딩을 끝냈다"는
// 예전 가정이 틀렸다(1회차에 온보딩 중 이탈하면 2회차에 둘이 겹친다). gate.ts 주석 참고.
// ================================

import { useEffect, useState } from 'react'
import { shouldShowSurvey } from '@/lib/survey/gate'
import { FeedbackSurvey } from './FeedbackSurvey'

const DELAY_MS = 15000

export function SurveyGate() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    void shouldShowSurvey().then((should) => {
      if (cancelled || !should) return
      timer = setTimeout(() => {
        if (!cancelled) setShow(true)
      }, DELAY_MS)
    })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!show) return null
  return <FeedbackSurvey onClose={() => setShow(false)} />
}
