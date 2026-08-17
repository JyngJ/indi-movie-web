'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/components/primitives'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from './AuthProvider'
import { LoginPanel } from './LoginPanel'

/**
 * 전역 로그인 시트 (IA 42). 어디서든 useUIStore().openLoginSheet({ title, description, returnTo })로 연다.
 * 모바일: 하단 시트, 데스크톱: 중앙 카드. 로그인되면 자동으로 닫힌다.
 * app/providers.tsx에 한 번 마운트 — 포털이라 지도·상영작·상세 어디서든 뜬다.
 */
export function LoginSheet() {
  const state = useUIStore((s) => s.loginSheet)
  const close = useUIStore((s) => s.closeLoginSheet)
  const { status } = useAuth()
  const isDesktop = useIsDesktopLayout()

  const open = state !== null
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useLockBodyScroll(open)

  // 개발 편의: 콘솔에서 window.__openLoginSheet({ description }) 로 시트 확인 (프로덕션 번들엔 없음)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const w = window as unknown as { __openLoginSheet?: (o?: Partial<NonNullable<typeof state>>) => void }
    w.__openLoginSheet = (o) => useUIStore.getState().openLoginSheet(o)
    return () => { delete w.__openLoginSheet }
  }, [])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
    setMounted(true)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  // 이미 로그인됐거나 로그인이 완료되면 시트는 의미 없음
  useEffect(() => {
    if (open && status === 'signed-in') close()
  }, [open, status, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9100,   /* 위치권한 모달(9000) 위 */
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        background: visible ? 'var(--color-scrim)' : 'transparent',
        transition: 'background 280ms ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--color-surface-card)',
          borderRadius: isDesktop ? 'var(--radius-popover)' : 'var(--radius-sheet) var(--radius-sheet) 0 0',
          width: isDesktop ? 420 : '100%',
          boxShadow: 'var(--shadow-sheet)',
          transform: visible ? 'translateY(0)' : isDesktop ? 'scale(0.96) translateY(12px)' : 'translateY(100%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
          padding: isDesktop ? 24 : 'var(--gutter)',
          paddingBottom: isDesktop ? 24 : 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: isDesktop ? 'flex-end' : 'center', alignItems: 'center', minHeight: 24, marginBottom: 8 }}>
          {isDesktop
            ? <IconButton variant="ghost" size={32} aria-label="닫기" onClick={close}><X size={18} strokeWidth={1.75} /></IconButton>
            : <div style={{ width: 36, height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--color-border)' }} />}
        </div>
        <LoginPanel
          title={state?.title}
          description={state?.description}
          returnTo={state?.returnTo}
          illustration={false}
        />
      </div>
    </div>,
    document.body,
  )
}
