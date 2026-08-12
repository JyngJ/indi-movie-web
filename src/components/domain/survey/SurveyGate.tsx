'use client'

// ================================
// SurveyGate — 재방문자 피드백 설문 노출 게이트
// 방문 2·5·10회차에만, 온보딩을 끝낸 사람에게, 진입 15초 뒤 1회 노출한다.
// 닫기는 영구 소각이 아니라 "다음에" — 다음 마일스톤에 다시 묻고, 제출하면 끝.
// 노출 조건 전체는 shouldShowSurvey(gate.ts)에 있다.
// ================================

import { useEffect, useState } from 'react'
import { markSurveyShown, shouldShowSurvey } from '@/lib/survey/gate'
import { FeedbackSurvey } from './FeedbackSurvey'

const DELAY_MS = 15000

export function SurveyGate() {
  const [visits, setVisits] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    void shouldShowSurvey().then((showAtVisits) => {
      if (cancelled || showAtVisits === null) return
      timer = setTimeout(() => {
        if (cancelled) return
        void markSurveyShown(showAtVisits)
        setVisits(showAtVisits)
      }, DELAY_MS)
    })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (visits === null) return null
  return <FeedbackSurvey visits={visits} onClose={() => setVisits(null)} />
}
