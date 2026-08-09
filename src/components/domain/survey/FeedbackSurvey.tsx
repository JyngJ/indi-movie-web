'use client'

import { useEffect, useState } from 'react'
import {
  SURVEY_BAD_POINTS,
  SURVEY_GOOD_POINTS,
  type SurveyBadPoint,
  type SurveyGoodPoint,
  type SurveyVerdict,
} from '@/lib/survey/types'
import { markSurvey } from '@/lib/survey/gate'
import { trackEvent } from '@/lib/analytics/client'
import { Button, IconButton, Input } from '@/components/primitives'
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

const IcoX = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

/** 재방문 설문 v2 (2026-08-09 피그마 TOBE 확정) — 잘 쓰고 계세요? → 좋은 점 | 아쉬운 점 → 감사.
 *  주관식 단계 제거. 기타·찾는 영화 없음은 선택 시 인라인 후속 입력. */
export function FeedbackSurvey({ onClose }: Props) {
  const [verdict, setVerdict] = useState<SurveyVerdict | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [etcText, setEtcText] = useState('')
  const [movieMissingText, setMovieMissingText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    trackEvent('survey shown')
  }, [])

  const options = verdict === 'bad' ? SURVEY_BAD_POINTS : SURVEY_GOOD_POINTS
  // 기타는 내용 없으면 데이터 가치가 없다 — 텍스트 입력 전까지 제출 잠금
  const etcBlocked = selected.includes('etc') && etcText.trim().length === 0
  const canSubmit = selected.length > 0 && !etcBlocked

  function pickVerdict(v: SurveyVerdict) {
    trackEvent('survey verdict', { verdict: v })
    setVerdict(v)
    setSelected([])
  }

  function toggle(value: string) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]))
  }

  function dismiss() {
    void markSurvey('dismissed')
    trackEvent('survey dismissed', { step: verdict ? 2 : 1 })
    onClose()
  }

  async function submit() {
    if (submitting || !verdict || !canSubmit) return
    setSubmitting(true)
    trackEvent('survey submitted', { verdict, points: selected.join(','), count: selected.length })
    try {
      await fetch('/api/survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          verdict,
          goodPoints: verdict === 'good' ? (selected as SurveyGoodPoint[]) : [],
          badPoints: verdict === 'bad' ? (selected as SurveyBadPoint[]) : [],
          etcText: etcText || undefined,
          movieMissingText: movieMissingText || undefined,
          sessionId: analyticsSessionId(),
          device: deviceType(),
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
    } catch {
      /* 실패해도 사용자 흐름은 막지 않음 */
    }
    void markSurvey('done')
    setSubmitting(false)
    setDone(true)
  }

  return (
    <div
      className={styles.overlay}
      data-rc="survey-scrim"
      data-rc-dead="scrim"
      role="dialog"
      aria-modal="true"
      aria-label="피드백 설문"
    >
      <div className={styles.card}>
        <IconButton
          variant="ghost"
          size={32}
          data-rc="survey-close"
          style={{ position: 'absolute', top: 14, right: 14 }}
          onClick={done ? onClose : dismiss}
          aria-label="닫기"
        >
          <IcoX />
        </IconButton>

        {done ? (
          <div className={styles.thanks}>
            <div className={styles.thanksEmoji} aria-hidden>🎬</div>
            <p className={`display-h2 ${styles.title}`}>고맙습니다!</p>
            <p className={styles.sub}>남겨주신 의견은 다음 개선에 바로 반영할게요.</p>
            <div className={styles.ctaCol}>
              <Button type="button" variant="secondary" size="full" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        ) : verdict === null ? (
          <>
            <h2 className={`display-h2 ${styles.title}`}>다시 찾아주셨네요 👋</h2>
            <p className={styles.sub}>영화볼지도, 잘 쓰고 계세요?</p>
            <div className={styles.ctaCol}>
              <Button type="button" size="full" data-rc="survey-verdict-good" onClick={() => pickVerdict('good')}>
                👍  네, 좋아요
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="full"
                data-rc="survey-verdict-bad"
                onClick={() => pickVerdict('bad')}
              >
                👎  아쉬운 점이 있어요
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className={`display-h2 ${styles.title}`}>
              {verdict === 'good' ? '어떤 점이 좋았나요?' : '어떤 점이 아쉬웠나요?'}
            </h2>
            <p className={styles.sub}>여러 개 선택할 수 있어요</p>
            <div className={styles.choices}>
              {options.map((o) => {
                const on = selected.includes(o.value)
                return (
                  <div key={o.value}>
                    <button
                      type="button"
                      className={`${styles.choice} ${on ? styles.choiceOn : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(o.value)}
                    >
                      <span className={`${styles.check} ${on ? styles.checkOn : ''}`} aria-hidden>
                        {on ? '✓' : ''}
                      </span>
                      {o.label}
                    </button>
                    {on && o.value === 'etc' && (
                      <div className={styles.followUp}>
                        <Input
                          type="text"
                          value={etcText}
                          onChange={(e) => setEtcText(e.target.value.slice(0, 200))}
                          placeholder="직접 적어주세요"
                          autoFocus
                        />
                      </div>
                    )}
                    {on && o.value === 'movie_missing' && (
                      <div className={styles.followUp}>
                        <Input
                          type="text"
                          value={movieMissingText}
                          onChange={(e) => setMovieMissingText(e.target.value.slice(0, 200))}
                          placeholder="어떤 영화를 찾으셨나요?"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className={styles.ctaCol}>
              <Button
                type="button"
                size="full"
                data-rc="survey-submit"
                onClick={submit}
                disabled={!canSubmit}
                loading={submitting}
              >
                {submitting ? '보내는 중…' : '제출'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
