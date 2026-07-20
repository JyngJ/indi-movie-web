'use client'

// ================================
// SurveyGate — 재방문자 피드백 설문 노출 게이트
// 재방문(2회차 이상) + 미응답일 때만, 진입 15초 뒤 1회 노출한다.
// (바로 안 띄우고 좀 써보게 한다. 온보딩과 겹치지 않음 — 재방문자는 온보딩 완료 상태)
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
