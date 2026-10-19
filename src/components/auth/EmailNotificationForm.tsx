'use client'
import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { Icon, IconButton } from '@/components/primitives'
import { showGlobalToast } from '@/lib/ui/globalToast'
import { Button } from '@/components/primitives/Button'
import { Input } from '@/components/primitives/Input'
import { useEmailNotifications } from '@/hooks/useEmailNotifications'
import { EMAIL_SCHEDULE_LABEL, normalizeEmail } from '@/lib/emailNotifications/domain'
export function EmailNotificationForm({ onRegistered, onDismiss, dismissLabel = '지금은 괜찮아요' }: { onRegistered?: () => void; onDismiss?: () => void; dismissLabel?: string }) {
  const { data, update } = useEmailNotifications()
  const subscription = data?.subscription
  const { user } = useAuth()
  const defaultEmail = subscription?.email ?? (user?.providers.includes('google') ? user.email ?? '' : '')
  const [inputEmail, setInputEmail] = useState('')
  const [edited, setEdited] = useState(false)
  const email = edited ? inputEmail : defaultEmail
  const inputRef = useRef<HTMLInputElement>(null)
  const setEmail = (value: string) => { setEdited(true); setInputEmail(value) }
  const normalizedEmail = normalizeEmail(email)
  const [consent, setConsent] = useState(false)
  const [busyAction, setBusyAction] = useState<'register' | 'unsubscribe' | null>(null)
  const busy = busyAction !== null
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')
  async function register(event: FormEvent) {
    event.preventDefault()
    if (!consent) return
    if (!normalizeEmail(email)) { setEmailError('이메일 주소를 다시 확인해 주세요'); return }
    setBusyAction('register'); setError(''); setEmailError('')
    try {
      await update({ action: 'register', email, consent })
      showGlobalToast('인증 메일을 보냈어요')
      onRegistered?.()
    } catch (e) { setError(e instanceof Error ? e.message : '메일을 보내지 못했어요. 다시 시도해 주세요.') }
    finally { setBusyAction(null) }
  }
  async function unsubscribe() {
    setBusyAction('unsubscribe'); setError('')
    try { await update({ action: 'unsubscribe' }); showGlobalToast('이메일 소식을 해지했어요') }
    catch { setError('해지하지 못했어요. 잠시 후 다시 시도해 주세요.') }
    finally { setBusyAction(null) }
  }
  return <div className="flex flex-col gap-[var(--gap-form-section)] text-[length:var(--text-body)]">
    <div className="flex flex-col gap-[var(--gap-form-content)]">
    <p>관심 영화·감독·극장에 새 소식이 있으면 {EMAIL_SCHEDULE_LABEL}에 모아 보내 드려요</p>
    {subscription?.status === 'pending' && <p>인증을 기다리고 있어요. 인증 메일이 보이지 않으면 스팸함을 확인해 주세요.</p>}
    <p className="text-[length:var(--text-meta)] leading-relaxed text-[var(--color-text-sub)]">이미 지난 상영은 보내지 않아요. 메일이 오기 전에 끝나는 상영도 있어요.</p>
    </div>
    <div className="flex flex-col gap-3">
    <form noValidate onSubmit={register} className="flex flex-col gap-[var(--gap-form-section)]">
      <Input ref={inputRef} label="수신할 메일 주소" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setEmailError('') }} error={emailError || undefined} disabled={busy}
        style={email ? { paddingRight: 'calc(var(--comp-btn-h-md) + var(--gutter-md))' } : undefined}
        rightIcon={email ? <IconButton aria-label="메일 주소 지우기" disabled={busy} onPointerDown={event => event.preventDefault()} onClick={() => { setEmail(''); setEmailError(''); inputRef.current?.focus() }}><Icon name="x" size="md" /></IconButton> : undefined} />
      <label data-email-consent className="grid grid-cols-[auto_1fr] items-start gap-2 text-[length:var(--text-meta)] leading-5">
        <span className="flex h-5 items-center">
          <input className="m-0 size-4 shrink-0 accent-[var(--color-primary-base)]" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required disabled={busy} />
        </span>
        <span data-email-consent-copy>이메일을 상영 소식 발송에 사용하는 데 동의해요 (선택)<br />해지하거나 탈퇴하면 발송을 중단해요. <Link href="/privacy" className="underline">개인정보 처리방침 보기</Link></span>
      </label>
      <Button type="submit" loading={busyAction === 'register'} disabled={busy || !consent || !normalizedEmail || (subscription?.status === 'active' && email.trim().toLowerCase() === subscription.email)}>{subscription?.status === 'active' ? '새 주소 인증하기' : '인증 메일 받기'}</Button>
    </form>
    {onDismiss && subscription?.status !== 'active' && subscription?.status !== 'pending' && <Button variant="text" onClick={onDismiss} disabled={busy}>{dismissLabel}</Button>}
    {(subscription?.status === 'active' || subscription?.status === 'pending') && <Button variant="text" onClick={unsubscribe} loading={busyAction === 'unsubscribe'} disabled={busy}>이메일 소식 그만 받기</Button>}
    </div>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
  </div>
}
