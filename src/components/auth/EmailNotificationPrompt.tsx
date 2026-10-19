'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { useEmailNotifications } from '@/hooks/useEmailNotifications'
import { EmailNotificationForm } from './EmailNotificationForm'
export function EmailNotificationPrompt() {
  const { user, status } = useAuth()
  const { data, update } = useEmailNotifications()
  const dialog = useRef<HTMLDialogElement>(null)
  const [closedFor, setClosedFor] = useState<string | null>(null)
  const dismiss = useCallback(() => {
    if (!user) return
    setClosedFor(user.id)
    dialog.current?.close()
    // 기기에서도 거절을 기억한다. 서버 저장이 실패해도 매 방문마다 다시 묻지 않는다.
    try { localStorage.setItem(`email-prompt-dismissed:${user.id}`, '1') } catch { /* 저장소를 사용할 수 없어도 현재 방문에서는 닫힌다 */ }
    void update({ action: 'dismiss' }).catch(() => {})
  }, [user, update])
  useEffect(() => {
    if (status !== 'signed-in' || !user || !data?.enabled || data.subscription?.prompt_dismissed || data.subscription || closedFor === user.id) {
      dialog.current?.close(); return
    }
    try { if (localStorage.getItem(`email-prompt-dismissed:${user.id}`)) return } catch { /* 서버 상태로 판단 */ }
    // 로그인·위치 권한 등 다른 팝업과 겹치지 않도록 기다린다.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || /^\/(email|admin|my\/notifications)/.test(window.location.pathname)) return
      if (document.querySelector('[data-overlay-root], dialog[open]')) return
      dialog.current?.showModal()
      window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [user, status, data, closedFor])
  useEffect(() => {
    const element = dialog.current
    return () => element?.close()
  }, [])
  if (process.env.NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED !== 'true') return null
  return <dialog ref={dialog} aria-labelledby="email-prompt-title" onCancel={event => { event.preventDefault(); dismiss() }}
    className="m-auto w-[calc(100%_-_48px)] max-h-[calc(100dvh_-_48px)] max-w-lg overflow-y-auto rounded-[var(--radius-popover)] bg-[var(--color-surface-card)] p-[var(--gutter-form)] sm:p-[var(--gutter-form-wide)] pb-4 sm:pb-6 text-[var(--color-text-primary)] backdrop:bg-[var(--color-scrim)]">
    <div className="flex flex-col gap-[var(--gap-form-section)]">
      <h2 id="email-prompt-title" className="text-[length:var(--text-h2)] font-bold">상영 소식을 이메일로 보내 드릴까요?</h2>
      <EmailNotificationForm onDismiss={dismiss} dismissLabel="지금은 받지 않기" />
    </div>
  </dialog>
}
