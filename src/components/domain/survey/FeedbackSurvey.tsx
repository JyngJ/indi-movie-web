'use client'

import { useEffect, useState } from 'react'
import { SURVEY_GOOD_POINTS, type SurveyGoodPoint } from '@/lib/survey/types'
import { markSurvey } from '@/lib/survey/gate'
import { trackEvent } from '@/lib/analytics/client'
import styles from './survey.module.css'

interface Props {
  onClose: () => void
}

function deviceType() {
  if (typeof window === 'undefined') return 'unknown'
  return window.matchMedia('(min-width: 1280px)').matches ? 'desktop' : 'mobile'
}

function analyticsSessionId() {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.sessionStorage.getItem('movie:analytics-session:v1')
    return raw ? (JSON.parse(raw)?.id as string) : undefined
  } catch {
    return undefined
  }
}

export function FeedbackSurvey({ onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<SurveyGoodPoint[]>([])
  const [etcText, setEtcText] = useState('')
  const [improvement, setImprovement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    trackEvent('survey shown')
  }, [])

  const etcSelected = selected.includes('etc')

  function toggle(value: SurveyGoodPoint) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  function goStep2() {
    if (selected.length === 0) return
    trackEvent('survey good selected', { good_points: selected.join(','), count: selected.length })
    setStep(2)
  }

  function dismiss() {
    void markSurvey('dismissed')
    trackEvent('survey dismissed', { step })
    onClose()
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goodPoints: selected,
          etcText: etcSelected ? etcText.trim() || undefined : undefined,
          improvement: improvement.trim() || undefined,
          sessionId: analyticsSessionId(),
          device: deviceType(),
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
    } catch {
      /* 저장 실패해도 사용자 흐름은 완료 처리 */
    }
    void markSurvey('done')
    trackEvent('survey submitted', {
      good_points: selected.join(','),
      count: selected.length,
      has_improvement: improvement.trim().length > 0,
    })
    setSubmitting(false)
    setDone(true)
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="피드백 설문">
      <div className={styles.card}>
        <button type="button" className={styles.close} onClick={dismiss} aria-label="닫기">
          ✕
        </button>

        {done ? (
          <div className={styles.thanks}>
            <div className={styles.thanksEmoji} aria-hidden>🎬</div>
            <p className={styles.thanksTitle}>고맙습니다!</p>
            <p className={styles.thanksSub}>남겨주신 의견은 다음 개선에 바로 반영할게요.</p>
            <button type="button" className={styles.primaryBtn} onClick={onClose}>
              닫기
            </button>
          </div>
        ) : step === 1 ? (
          <>
            <p className={styles.stepMeta}>1 / 2</p>
            <h2 className={styles.title}>다시 찾아주셨네요 👋</h2>
            <p className={styles.sub}>어떤 점이 좋았나요? (여러 개 선택할 수 있어요)</p>
            <div className={styles.choices}>
              {SURVEY_GOOD_POINTS.map((g) => {
                const on = selected.includes(g.value)
                return (
                  <button
                    key={g.value}
                    type="button"
                    className={`${styles.choice} ${on ? styles.choiceOn : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(g.value)}
                  >
                    <span className={styles.check} aria-hidden>{on ? '✓' : ''}</span>
                    {g.label}
                  </button>
                )
              })}
              {etcSelected && (
                <input
                  type="text"
                  className={styles.etcInput}
                  value={etcText}
                  onChange={(e) => setEtcText(e.target.value.slice(0, 200))}
                  placeholder="어떤 점이 좋았는지 직접 적어주세요"
                  autoFocus
                />
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={goStep2}
                disabled={selected.length === 0}
              >
                다음
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.stepMeta}>2 / 2</p>
            <h2 className={styles.title}>개선하면 좋을 점이 있을까요?</h2>
            <p className={styles.sub}>자유롭게 적어주세요. (선택 — 비워두셔도 됩니다)</p>
            <textarea
              className={styles.textarea}
              value={improvement}
              onChange={(e) => setImprovement(e.target.value.slice(0, 500))}
              placeholder="예: 특정 지역 극장이 더 있으면 좋겠어요 / 필터가 헷갈려요 …"
              rows={4}
              autoFocus
            />
            <div className={styles.actions}>
              <button type="button" className={styles.ghostBtn} onClick={submit} disabled={submitting}>
                건너뛰기
              </button>
              <button type="button" className={styles.primaryBtn} onClick={submit} disabled={submitting}>
                {submitting ? '보내는 중…' : '제출'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
