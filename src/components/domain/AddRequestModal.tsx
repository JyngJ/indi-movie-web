'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Film, Building2, User, MoreHorizontal, Check } from 'lucide-react'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { trackEvent } from '@/lib/analytics/client'
import type { UserRequestKind } from '@/lib/userRequests/types'

interface Props {
  open: boolean
  query: string
  onClose: () => void
}

const KIND_OPTIONS: { kind: UserRequestKind; label: string; icon: typeof Film }[] = [
  { kind: 'movie', label: '영화', icon: Film },
  { kind: 'theater', label: '영화관', icon: Building2 },
  { kind: 'director', label: '감독', icon: User },
  { kind: 'etc', label: '기타', icon: MoreHorizontal },
]

const NAME_FIELD: Record<UserRequestKind, { label: string; placeholder: string }> = {
  movie: { label: '영화 이름', placeholder: '예: 패터슨' },
  theater: { label: '영화관 이름', placeholder: '예: 서울아트시네마' },
  director: { label: '감독 이름', placeholder: '예: 홍상수' },
  etc: { label: '요청 내용', placeholder: '요청하실 내용을 입력해주세요' },
}

const NOTE_HINT: Record<UserRequestKind, string> = {
  movie: '감독, 개봉년도, 원제 등 참고할 정보가 있다면 적어주세요',
  theater: '지역, 주소 등 참고할 정보가 있다면 적어주세요',
  director: '대표작 등 참고할 정보가 있다면 적어주세요',
  etc: '자세히 적어주시면 도움이 됩니다',
}

export function AddRequestModal({ open, query, onClose }: Props) {
  const isDesktop = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [kind, setKind] = useState<UserRequestKind>('movie')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useLockBodyScroll(open)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    setStep('form')
    setKind('movie')
    setName(query)
    setNote('')
    setError(null)
    const raf = requestAnimationFrame(() => setVisible(true))
    trackEvent('add request opened', { query, source: 'films_search_empty' })
    return () => cancelAnimationFrame(raf)
  }, [open, query])

  if (!mounted || !open) return null

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  async function handleSubmit() {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/user-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, name: name.trim(), note: note.trim() || undefined, query: query || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? '요청을 보내지 못했습니다.')
      }
      trackEvent('add request submitted', { kind, query, source: 'films_search_empty' })
      setStep('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청을 보내지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const card = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        background: 'var(--color-surface-card)',
        borderRadius: isDesktop ? 20 : '22px 22px 0 0',
        width: isDesktop ? 480 : '100%',
        maxWidth: isDesktop ? 480 : undefined,
        boxShadow: '0 -4px 48px rgba(0,0,0,0.35)',
        transform: visible
          ? 'translateY(0)'
          : isDesktop ? 'scale(0.96) translateY(12px)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
        paddingBottom: 24,
        overflow: 'hidden',
        maxHeight: isDesktop ? '85vh' : '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!isDesktop && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>
      )}

      {step === 'success' ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--color-primary-subtle-l)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--color-primary-base)',
          }}>
            <Check size={30} strokeWidth={2} color="currentColor" />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
            요청이 접수되었어요
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text-caption)', lineHeight: 1.6, margin: '0 0 28px' }}>
            &ldquo;{name}&rdquo; 요청 검토 후 반영해둘게요!
          </p>
          <button
            onClick={handleDismiss}
            style={{
              width: '100%', height: 48, borderRadius: 999,
              background: 'var(--color-primary-base)', border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 'unset',
            }}
          >
            확인
          </button>
        </div>
      ) : (
        <div style={{ padding: isDesktop ? '24px 24px 0' : '8px 20px 0', overflowY: 'auto' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            추가 요청하기
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-caption)', margin: '0 0 20px' }}>
            찾으시는 영화·영화관·감독이 아직 없나요? 추가 요청하면 반영해둘게요!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {KIND_OPTIONS.map(({ kind: k, label, icon: Icon }) => {
              const selected = kind === k
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 4px', borderRadius: 12, cursor: 'pointer', minHeight: 'unset',
                    border: selected ? '1.5px solid var(--color-primary-base)' : '1px solid var(--color-border)',
                    background: selected ? 'var(--color-primary-subtle-l)' : 'var(--color-surface-bg)',
                    color: selected ? 'var(--color-primary-text)' : 'var(--color-text-body)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} color="currentColor" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                </button>
              )
            })}
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-body)', marginBottom: 6 }}>
            {NAME_FIELD[kind].label}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={NAME_FIELD[kind].placeholder}
            style={{
              width: '100%', height: 44, padding: '0 14px', marginBottom: 16,
              border: '1px solid var(--color-border)', borderRadius: 10,
              background: 'var(--color-surface-bg)', color: 'var(--color-text-primary)',
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-body)', marginBottom: 6 }}>
            추가 정보 <span style={{ color: 'var(--color-text-caption)', fontWeight: 400 }}>(선택)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={NOTE_HINT[kind]}
            rows={3}
            maxLength={500}
            style={{
              width: '100%', padding: 12, marginBottom: 12,
              border: '1px solid var(--color-border)', borderRadius: 10,
              background: 'var(--color-surface-bg)', color: 'var(--color-text-primary)',
              fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-error)', margin: '0 0 12px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, padding: '4px 0 20px' }}>
            <button
              onClick={handleDismiss}
              style={{
                flex: 1, height: 48, borderRadius: 999,
                background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 'unset',
              }}
            >
              취소
            </button>
            <button
              disabled={!name.trim() || submitting}
              onClick={handleSubmit}
              style={{
                flex: 2, height: 48, borderRadius: 999,
                background: 'var(--color-primary-base)', border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: (!name.trim() || submitting) ? 'default' : 'pointer',
                opacity: (!name.trim() || submitting) ? 0.5 : 1,
                minHeight: 'unset',
              }}
            >
              {submitting ? '보내는 중…' : '요청 보내기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        transition: 'background 280ms ease',
      }}
    >
      {card}
    </div>,
    document.body,
  )
}
