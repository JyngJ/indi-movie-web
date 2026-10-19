'use client'

import { useProgressRouter } from '@/hooks/useProgressRouter'
import { useAuth } from './AuthProvider'
import { LoginPanel } from './LoginPanel'
import { EmailNotificationForm } from './EmailNotificationForm'
import { useEmailNotifications } from '@/hooks/useEmailNotifications'
import { Card } from '@/components/primitives/Card'
import { Button } from '@/components/primitives/Button'

/** 알림 목록에서는 수신 상태만 요약하고 주소 관리·재인증·해지는 이 화면에서 한다. */
export function EmailPreferencesContent() {
  const { status, user } = useAuth()
  const router = useProgressRouter()
  const email = useEmailNotifications()
  if (status === 'signed-out') return <div className="flex min-h-full flex-col justify-center p-[var(--gutter-form)]"><LoginPanel returnTo="/my/notifications/email" /></div>
  if (status === 'loading' || email.isLoading) return <p className="p-4 text-[length:var(--text-meta)] text-[var(--color-text-sub)]">불러오는 중…</p>
  if (email.isError) return <div className="flex flex-col gap-4 p-4">
    <p role="alert">이메일 설정을 불러오지 못했어요. 다시 시도해 주세요.</p>
    <Button variant="secondary" onClick={() => void email.refetch()}>다시 불러오기</Button>
  </div>
  if (!email.data?.enabled) return <p className="p-4 text-[length:var(--text-body)]">이메일 소식을 준비하고 있어요</p>
  const dismiss = () => {
    if (user) {
      try { localStorage.setItem(`email-prompt-dismissed:${user.id}`, '1') } catch { /* 현재 화면에서는 이동할 수 있다 */ }
    }
    void email.update({ action: 'dismiss' }).catch(() => {})
    router.push('/my/notifications')
  }
  return <div className="flex min-h-full flex-col justify-center p-[var(--gutter-form)]">
    <Card padding="none" shadow="none" bordered={false} className="p-[var(--gutter-form)] sm:p-[var(--gutter-form-wide)]">
      <EmailNotificationForm key={email.data.subscription?.email ?? 'new'} onDismiss={dismiss} />
    </Card>
  </div>
}
