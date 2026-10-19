'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/primitives/Icon'
import { useProgressRouter } from '@/hooks/useProgressRouter'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'
import { Wordmark } from '@/components/primitives/Wordmark'
import { FREQUENCY_FEEDBACK_OPTIONS, type FrequencyFeedback } from '@/lib/emailNotifications/domain'

/** 메일에서 여는 인증·해지·의견 페이지. 링크를 열기만 해서는 설정이 바뀌지 않는다. */
export function EmailManagement() {
  const router = useProgressRouter()
  const reducedMotion = useReducedMotion()
  const [params, setParams] = useState<URLSearchParams | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyChoice, setBusyChoice] = useState<FrequencyFeedback | null>(null)
  const [done, setDone] = useState(false)
  const [submittedChoice, setSubmittedChoice] = useState<FrequencyFeedback | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setParams(new URLSearchParams(window.location.search))
    window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const action = params?.get('action')
  const valid = Boolean(params?.get('token')) && ['verify', 'unsubscribe', 'frequency'].includes(action ?? '')
  const title = !params ? '링크를 확인하는 중…' : !valid ? '링크를 다시 확인해 주세요'
    : action === 'frequency' ? done ? '의견을 보냈어요' : '지금 발송 빈도는 어때요?'
    : action === 'verify' ? done ? '이메일을 인증했어요' : '이메일을 인증해 주세요'
    : done ? '이메일 소식을 해지했어요' : '이메일 소식을 그만 보낼까요?'
  const description = !valid ? '메일에서 받은 링크를 다시 열거나 알림 설정에서 변경해 주세요'
    : action === 'frequency' ? done
      ? `${submittedChoice === 'same' ? '지금 정도가 좋다' : submittedChoice === 'more' ? '더 자주 받고 싶다' : '더 가끔 받고 싶다'}는 의견을 남겼어요. 발송 빈도를 정할 때 참고할게요.`
      : '지금은 월·금 오전 9시에 보내 드려요. 선택한 의견은 바로 반영되지 않아요. 의견을 모아 발송 빈도를 조정할게요.'
    : action === 'verify' ? done ? '새 소식이 있으면 월·금 오전 9시에 보내 드릴게요' : '인증을 마치면 관심 영화·감독·극장의 새 상영 소식을 월·금 오전 9시에 보내 드려요'
    : done ? '이제 상영 소식을 이메일로 보내지 않아요. 소식 탭은 계속 이용할 수 있어요.' : '이메일 발송만 중단해요. 관심 목록과 소식 탭은 그대로 이용할 수 있어요.'
  async function submit(choice?: FrequencyFeedback) {
    setBusy(true); setBusyChoice(choice ?? null); setError('')
    try {
      const response = await fetch('/api/email-notifications/manage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params?.get('token'), action, choice }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setSubmittedChoice(choice ?? null)
      setDone(true)
    } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  return <main className="grid min-h-dvh place-items-center p-[var(--gutter-form)]">
    <div className="w-full max-w-lg">
      <Card padding="none" shadow="none" className="flex flex-col gap-[var(--gap-form-section)] p-[var(--gutter-form)] sm:p-[var(--gutter-form-wide)] text-center text-[length:var(--text-body)]">
        <Wordmark title="영화볼지도" className="mx-auto h-6 w-18" />
        {valid && action === 'verify' && <motion.div
          key={done ? 'verified' : 'waiting'} aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.72, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 18 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full"
          style={{ background: done ? 'var(--color-success-tint)' : 'var(--color-primary-100)', color: done ? 'var(--color-success)' : 'var(--color-primary-base)' }}>
          <Icon name={done ? 'check' : busy ? 'loader-circle' : 'circle-check'} size="xl" className={busy ? 'animate-spin motion-reduce:animate-none' : undefined} />
        </motion.div>}
        <div aria-live="polite" className="flex flex-col gap-[var(--gap-form-content)]">
          <h1 className="text-balance text-[length:var(--text-h1)] font-bold">{title}</h1>
          {params && <p className="text-pretty leading-relaxed text-[var(--color-text-sub)]">{description}</p>}
        </div>
        {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
        {!done && valid && (action === 'frequency'
          ? <div className="flex gap-2" aria-label="발송 빈도 의견">
            {FREQUENCY_FEEDBACK_OPTIONS.map(option => <Button key={option.value} className="flex-1 whitespace-nowrap" density="compact" variant="secondary" loading={busy && busyChoice === option.value} disabled={busy} onClick={() => submit(option.value)}>{option.label}</Button>)}
          </div>
          : action === 'unsubscribe'
            ? <div className="flex flex-col gap-[var(--gap-form-content)]">
              <Button fullWidth disabled={busy} onClick={() => router.push('/')}>계속 받아보기</Button>
              <Button variant="text" fullWidth loading={busy} style={{ color: 'var(--color-error)' }} onClick={() => submit()}>그만 받아보기</Button>
            </div>
            : <Button fullWidth loading={busy} onClick={() => submit()}>이메일 인증하기</Button>)}
        {(action !== 'unsubscribe' || done || !valid) && <Link href="/my/notifications" className="inline-flex items-center justify-center text-[length:var(--text-meta)] text-[var(--color-text-sub)] underline underline-offset-4">알림 설정으로 가기</Link>}
      </Card>
    </div>
  </main>
}
